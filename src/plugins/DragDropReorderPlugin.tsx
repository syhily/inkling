import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createNodeSelection,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $setSelection,
  type LexicalEditor,
} from 'lexical'
import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import type { CardNode } from '@/types/lexical-internals'

import { useDragDropHandle } from '@/context/DragDropHandleContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { useDragDropState } from '@/hooks/useDragDropState'
import { getCardDragIcon } from '@/nodes/cards/card-menus'
import { $createImageNode } from '@/nodes/ImageNode'
import {
  type DraggableInfo,
  type DroppablePosition,
  type DropResult,
  type IndicatorPosition,
} from '@/utils/draggable/DragDropContainer'
import { DragDropHandler } from '@/utils/draggable/DragDropHandler'
import { isCardDropAllowed } from '@/utils/draggable/draggable-utils'
import { useDragDropContainer } from '@/utils/draggable/useDragDropContainer'

function preventDefault(event: Event): void {
  event.preventDefault()
}

function useDragDropReorder(editor: LexicalEditor): void {
  const dragDropHandle = useDragDropHandle()
  const containerElement = useDragDropState((state) => state.containerElement)
  const isEditingCard = useCardSelection((state) => state.isEditingCard)

  const cardContainer = useDragDropContainer({
    element: editor.getRootElement(),
    enabled: !isEditingCard,
    draggable: {
      draggableSelector: ':scope > div', // cards
      getDraggableInfo: (draggableElement: HTMLElement | null): DraggableInfo | false => {
        if (!draggableElement) {
          return false
        }

        let draggableInfo: DraggableInfo | undefined

        editor.update(() => {
          const nearestNode = $getNearestNodeFromDOMNode(draggableElement)
          const cardNode = nearestNode as CardNode | null

          // draggableSelector matches top-level <div>s; a consumer-registered
          // node rendering one is not a card and has no getDataset — treat it as
          // non-draggable instead of crashing on the missing method
          if (cardNode && typeof cardNode.getDataset === 'function') {
            draggableInfo = {
              type: 'card',
              nodeKey: cardNode.getKey(),
              cardName: cardNode.getType(),
              element: draggableElement,
              target: null,
              mousePosition: { x: 0, y: 0 },
              dataset: cardNode.getDataset(),
              // what the per-card getIcon() copies returned: the first cardMenu
              // entry's icon (menu-less cards fall back inside getCardDragIcon)
              Icon: getCardDragIcon(cardNode.getType()),
            }
          }
        })

        return draggableInfo || false
      },
      createDragPreviewElement: (draggableInfo: DraggableInfo) => {
        const { cardName } = draggableInfo
        const { Icon } = draggableInfo

        if (!cardName || cardName === 'image') {
          return
        }

        const style = {
          top: '0',
          left: '-100%',
          zIndex: 10001,
          willChange: 'transform',
        }

        const dragPreviewElement = document.createElement('div')
        // classes kept so Tailwind picks up usage
        dragPreviewElement.className =
          'absolute flex size-16 flex-col items-center justify-center rounded bg-white shadow-sm'
        Object.assign(dragPreviewElement.style, style)

        const iconWrapper = document.createElement('div')
        iconWrapper.className = 'flex items-center'
        dragPreviewElement.appendChild(iconWrapper)

        // Icon is a React component — render synchronously via flushSync
        const iconRoot = document.createElement('div')
        iconWrapper.appendChild(iconRoot)
        const reactRoot = createRoot(iconRoot)
        if (Icon) {
          flushSync(() => {
            reactRoot.render(<Icon className="size-8" />)
          })
        }

        // the typed disposal contract: the handler unmounts the React root
        // through dispose() without knowing the preview is React-backed
        return {
          element: dragPreviewElement,
          dispose: () => {
            reactRoot.unmount()
          },
        }
      },
    },
    droppable: {
      droppableSelector: ':scope > *', // all block elements
      getIndicatorPosition: (
        draggableInfo: DraggableInfo,
        droppableElem: HTMLElement,
        position: DroppablePosition,
      ): IndicatorPosition | false => {
        const rootElement = editor.getRootElement()
        if (!rootElement || !draggableInfo.element) {
          return false
        }
        const droppables = Array.from(rootElement.querySelectorAll<HTMLElement>(':scope > *'))
        const droppableIndex = droppables.indexOf(droppableElem)
        const draggableIndex = droppables.indexOf(draggableInfo.element)

        // only allow card and image drops (images can be dragged out of a gallery)
        if (draggableInfo.type !== 'card' && draggableInfo.type !== 'image') {
          return false
        }

        if (isCardDropAllowed(draggableIndex, droppableIndex, position)) {
          let insertIndex = droppableIndex
          if (position.match(/bottom/)) {
            insertIndex += 1
          }

          return { insertIndex }
        }

        return false
      },
      onDrop: (
        draggableInfo: DraggableInfo,
        droppable: HTMLElement | null,
        position: DroppablePosition | null,
      ): DropResult => {
        if (draggableInfo.type !== 'card' && draggableInfo.type !== 'image') {
          return false
        }

        const rootElement = editor.getRootElement()
        if (!rootElement || !draggableInfo.element) {
          return false
        }
        const droppables = Array.from(rootElement.querySelectorAll<HTMLElement>(':scope > *'))
        const draggableIndex = droppables.indexOf(draggableInfo.element)
        const insertIndex = draggableInfo.insertIndex ?? 0

        if (isCardDropAllowed(draggableIndex, insertIndex)) {
          let result: DropResult = false

          editor.update(() => {
            // change card order on card drops
            if (draggableInfo.type === 'card') {
              const draggedNode = draggableInfo.nodeKey ? $getNodeByKey(draggableInfo.nodeKey) : null
              if (!draggedNode) {
                return
              }

              if (insertIndex >= droppables.length) {
                // drop at end of document
                const targetNode = $getNearestNodeFromDOMNode(droppables[droppables.length - 1])
                if (targetNode) {
                  targetNode.insertAfter(draggedNode)
                }
              } else {
                const targetNode = $getNearestNodeFromDOMNode(droppables[insertIndex])
                if (targetNode) {
                  targetNode.insertBefore(draggedNode)
                }
              }

              // clear selection so we don't show any toolbars immediately and the
              // cursor isn't left stranded somewhere else in the document
              $setSelection(null)

              // the card was re-ordered in place, not moved inside another
              // card — onDropEnd must not remove the source
              result = { success: true, sourceHandled: true }
              return
            }

            // insert new image node on image drops
            if (draggableInfo.type === 'image') {
              const targetNode = $getNearestNodeFromDOMNode(droppables[insertIndex])
              if (targetNode) {
                const imageNode = $createImageNode(draggableInfo.dataset as Parameters<typeof $createImageNode>[0])
                targetNode.insertBefore(imageNode)

                // select the newly inserted image card
                const nodeSelection = $createNodeSelection()
                nodeSelection.add(imageNode.getKey())
                $setSelection(nodeSelection)
              }

              result = true
            }
          })

          return result
        }
        return false
      },
    },
    lifecycle: {
      onDragStart: () => {
        cardContainer.refresh()
        dragDropHandle.setState({ isDragging: true })
      },
      onDragEnd: () => {
        dragDropHandle.setState({ isDragging: false })
      },
      // a card can be dropped into another card which means we need to remove the original
      onDropEnd: (draggableInfo: DraggableInfo, success: boolean, sourceHandled: boolean): void => {
        // avoid removing the card if it's just a re-order or no move occurred
        if (sourceHandled || !success || draggableInfo.type !== 'card') {
          return
        }

        editor.update(() => {
          const cardNode = draggableInfo.nodeKey ? $getNodeByKey(draggableInfo.nodeKey) : null
          if (cardNode) {
            cardNode.remove(false)
          }
        })
      },
    },
  })

  React.useEffect(() => {
    if (!containerElement || !editor.getRootElement()) {
      return
    }
    const dndHandler = new DragDropHandler({
      editorContainerElement: containerElement,
    })
    // publish the handler so the card drag hooks register against it — they
    // subscribe to the handle, so a hook whose registration effect ran before
    // this one registers as soon as the handler appears (no mount-order
    // dependency)
    dragDropHandle.setState({ handler: dndHandler })

    return () => {
      dragDropHandle.setState({ handler: null })
      dndHandler.destroy()
    }
  }, [editor, containerElement, dragDropHandle])

  React.useEffect(() => {
    return editor.registerUpdateListener(({ dirtyElements, editorState }) => {
      // Refresh drag/drop markers only when the set, order, or DOM identity of
      // top-level blocks may have changed. Text edits only mark the edited
      // node's ancestors as dirty *parents* (flag false), so per-keystroke
      // updates skip the refresh; a direct root child being intentionally
      // dirty (cloned) means a block was added, removed, reordered, or
      // re-rendered — and the reconciler recreates its DOM. Lexical 0.46
      // marks the root itself intentionally dirty on every update
      // ($applyAllTransforms), so the root's own flag is ignored.
      // onDragStart additionally forces a refresh as a final safety net.
      let hasDirtyRootChildCandidate = false
      for (const [key, intentionallyDirty] of dirtyElements) {
        if (key !== 'root' && intentionallyDirty) {
          hasDirtyRootChildCandidate = true
          break
        }
      }
      if (!hasDirtyRootChildCandidate) {
        return
      }

      editorState.read(() => {
        const root = $getRoot()
        for (const [key, intentionallyDirty] of dirtyElements) {
          if (key === 'root' || !intentionallyDirty) {
            continue
          }
          const node = $getNodeByKey(key)
          if (node && node.getParent() === root) {
            cardContainer.refresh()
            return
          }
        }
      })
    })
  }, [editor, cardContainer])

  // disable normal drag start events so they don't interfere with our custom drag handling
  React.useEffect(() => {
    return editor.registerRootListener((rootElement, prevRootElement) => {
      rootElement?.addEventListener('dragstart', preventDefault)
      prevRootElement?.removeEventListener('dragstart', preventDefault)
    })
  }, [editor])
}

export default function DragDropReorderPlugin(): null {
  const [editor] = useLexicalComposerContext()
  useDragDropReorder(editor)
  return null
}
