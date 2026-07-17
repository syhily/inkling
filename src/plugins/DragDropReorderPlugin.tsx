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
import { createRoot, type Root } from 'react-dom/client'

import type { CardNode } from '@/types/lexical-internals'

import { useDragDropHandle } from '@/context/DragDropHandleContext'
import { useInklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { useDragDropState } from '@/hooks/useDragDropState'
import { getCardDragIcon } from '@/nodes/cards/card-menus'
import { $createImageNode } from '@/nodes/ImageNode'
import { type DraggableInfo, type DroppablePosition, type IndicatorPosition } from '@/utils/draggable/DragDropContainer'
import { DragDropHandler, type DraggableContainerHandle } from '@/utils/draggable/DragDropHandler'
import { isCardDropAllowed } from '@/utils/draggable/draggable-utils'

function preventDefault(event: Event): void {
  event.preventDefault()
}

interface DragPreviewElement extends HTMLDivElement {
  __reactRoot?: Root
}

function useDragDropReorder(editor: LexicalEditor): void {
  const dragDropHandle = useDragDropHandle()
  const containerElement = useDragDropState((state) => state.containerElement)
  const { setIsDragging } = useInklingSelectedCardContext()
  const isEditingCard = useCardSelection((state) => state.isEditingCard)

  const cardContainer = React.useRef<DraggableContainerHandle | null>(null)
  const skipOnDropEnd = React.useRef<boolean>(false)

  // useRef because we need stable function references to pass into the drag drop container instance
  const onDragStart = React.useRef(() => {
    cardContainer.current?.refresh()
    setIsDragging(true)
  })

  const onDragEnd = React.useRef(() => {
    setIsDragging(false)
  })

  const getDraggableInfo = React.useRef((draggableElement: HTMLElement | null): DraggableInfo | false => {
    if (!draggableElement) {
      return false
    }

    let draggableInfo: DraggableInfo | undefined

    editor.update(() => {
      const cardNode = $getNearestNodeFromDOMNode(draggableElement)

      if (cardNode) {
        draggableInfo = {
          type: 'card',
          nodeKey: cardNode.getKey(),
          cardName: cardNode.getType(),
          element: draggableElement,
          target: null,
          mousePosition: { x: 0, y: 0 },
          dataset: (cardNode as CardNode).getDataset(),
          // what the per-card getIcon() copies returned: the first cardMenu
          // entry's icon (menu-less cards fall back inside getCardDragIcon)
          Icon: getCardDragIcon(cardNode.getType()),
        }
      }
    })

    return draggableInfo || false
  })

  const createCardDragElement = React.useRef((draggableInfo: DraggableInfo): HTMLElement | undefined => {
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

    const dragPreviewElement: DragPreviewElement = document.createElement('div') as DragPreviewElement
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

    // Store the React root so DragDropHandler can unmount it on cleanup
    dragPreviewElement.__reactRoot = reactRoot

    return dragPreviewElement
  })

  const getDropIndicatorPosition = React.useRef(
    (
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
  )

  const onCardDrop = React.useRef(
    (draggableInfo: DraggableInfo, droppable: HTMLElement | null, position: DroppablePosition | null): boolean => {
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
        let returnValue = false

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

            // skip card removal as we're not moving a card inside another card
            skipOnDropEnd.current = true

            returnValue = true
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

            returnValue = true
          }
        })

        return returnValue
      }
      return false
    },
  )

  // a card can be dropped into another card which means we need to remove the original
  const onDropEnd = React.useRef((draggableInfo: DraggableInfo, success: boolean): void => {
    // avoid removing the card if it's just a re-order or no move occurred
    if (skipOnDropEnd.current || !success || draggableInfo.type !== 'card') {
      skipOnDropEnd.current = false
      return
    }

    editor.update(() => {
      const cardNode = draggableInfo.nodeKey ? $getNodeByKey(draggableInfo.nodeKey) : null
      if (cardNode) {
        cardNode.remove(false)
      }
    })
  })

  React.useEffect(() => {
    const rootElement = editor.getRootElement()
    if (!containerElement || !rootElement) {
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

    cardContainer.current = dndHandler.registerContainer(rootElement, {
      draggable: {
        draggableSelector: ':scope > div', // cards
        getDraggableInfo: getDraggableInfo.current,
        createDragPreviewElement: createCardDragElement.current,
      },
      droppable: {
        droppableSelector: ':scope > *', // all block elements
        getIndicatorPosition: getDropIndicatorPosition.current,
        onDrop: onCardDrop.current,
      },
      lifecycle: {
        onDragStart: onDragStart.current,
        onDragEnd: onDragEnd.current,
        onDropEnd: onDropEnd.current,
      },
    })

    return () => {
      cardContainer.current = null
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
            cardContainer.current?.refresh()
            return
          }
        }
      })
    })
  }, [editor])

  // disable normal drag start events so they don't interfere with our custom drag handling
  React.useEffect(() => {
    return editor.registerRootListener((rootElement, prevRootElement) => {
      rootElement?.addEventListener('dragstart', preventDefault)
      prevRootElement?.removeEventListener('dragstart', preventDefault)
    })
  }, [editor])

  // Disable drag-drop-reorder when editing a card
  React.useEffect(() => {
    if (isEditingCard) {
      cardContainer.current?.disableDrag()
    } else {
      cardContainer.current?.enableDrag()
    }
  }, [isEditingCard])
}

export default function DragDropReorderPlugin(): null {
  const [editor] = useLexicalComposerContext()
  useDragDropReorder(editor)
  return null
}
