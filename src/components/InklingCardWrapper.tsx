import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  mergeRegister,
  $getNodeByKey,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  type LexicalNode,
  type NodeKey,
} from 'lexical'
import React from 'react'

import type { CardNode } from '@/types/lexical-internals'

import { CardWrapper } from '@/components/ui/CardWrapper'
import CardContext from '@/context/CardContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { useDragDropState } from '@/hooks/useDragDropState'
import { useVisibilitySettingsPanel } from '@/hooks/useVisibilitySettingsPanel'
import { type CardWidth } from '@/nodes/base/utils/card-widths'
import { EDIT_CARD_COMMAND, SELECT_CARD_COMMAND } from '@/plugins/behaviour/commands'

interface InklingCardWrapperProps {
  nodeKey: NodeKey
  width?: CardWidth
  wrapperStyle?: string
  IndicatorIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  children?: React.ReactNode
}

// InklingCardWrapper is only rendered for generated card nodes (decorateCard
// throws otherwise), but the type system can't see that — discriminate on the
// base class's runtime marker instead of asserting.
function $isCardNode(node: LexicalNode | null): node is CardNode {
  return (
    node !== null &&
    'isInklingCard' in node &&
    typeof node.isInklingCard === 'function' &&
    node.isInklingCard() === true
  )
}

const InklingCardWrapper = ({ nodeKey, width, wrapperStyle, IndicatorIcon, children }: InklingCardWrapperProps) => {
  const [editor] = useLexicalComposerContext()
  const [cardType, setCardType] = React.useState<string | null>(null)
  const [captionHasFocus, setCaptionHasFocus] = React.useState(false)
  const normalizedWidth = width ?? 'regular'
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const skipClick = React.useRef(false)

  const isDragging = useDragDropState((state) => state.isDragging)
  const selectedCardKey = useCardSelection((state) => state.selectedCardKey)
  const isEditingCard = useCardSelection((state) => state.isEditingCard)

  const isSelected = selectedCardKey === nodeKey
  const isEditing = isSelected && isEditingCard

  const { isVisibilityEnabled, openPanel } = useVisibilitySettingsPanel(nodeKey)

  React.useLayoutEffect(() => {
    editor.getEditorState().read(() => {
      const cardNode = $getNodeByKey(nodeKey)
      setCardType(cardNode ? cardNode.getType() : null)
    })

    // We only do this for init
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    return mergeRegister(
      // we register a click command at the editor level rather than the React level
      // so that we can prevent the editor's default click behaviour without also
      // preventing the click behaviour of other React components inside the card
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const target = event.target
          if (!skipClick.current && target instanceof Element && containerRef.current?.contains(target)) {
            const node = $getNodeByKey(nodeKey)
            const cardNode = $isCardNode(node) ? node : null
            const clickedDifferentEditor = cardNode === null
            // elements marked as click-through (captions, toolbars) handle their own
            // clicks and must not trigger the card's edit mode
            const clickedClickthrough = target.closest('[data-inkling-allow-clickthrough]')
            const clickedSettingsPanel = target.closest('[data-inkling-settings-panel]')

            if (isSelected && cardNode?.hasEditMode() && !isEditing && !clickedClickthrough && !clickedSettingsPanel) {
              editor.dispatchCommand(EDIT_CARD_COMMAND, {
                cardKey: nodeKey,
                focusEditor: !clickedDifferentEditor,
              })
            } else if (!isSelected) {
              editor.dispatchCommand(SELECT_CARD_COMMAND, {
                cardKey: nodeKey,
                focusEditor: !clickedDifferentEditor,
              })
            }

            if (clickedDifferentEditor) {
              // click is in a different editor
              return false
            }

            return true
          }

          if (skipClick.current === true) {
            skipClick.current = false
            return true
          }

          skipClick.current = false
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  })

  React.useEffect(() => {
    // add a property to the parent element that's added directly by Lexical
    // so we can target it via CSS for things like spacing between stacked full-width cards
    if (containerRef.current?.parentElement) {
      // avoid setting property when 'regular' so there's less test churn
      if (normalizedWidth === 'regular') {
        delete containerRef.current.parentElement.dataset.inklingCardWidth
      } else {
        containerRef.current.parentElement.dataset.inklingCardWidth = normalizedWidth
      }
    }
  }, [normalizedWidth])

  React.useEffect(() => {
    const container = containerRef.current

    function handleMousedown(event: MouseEvent) {
      if (!isSelected && !isEditing) {
        editor.dispatchCommand(SELECT_CARD_COMMAND, { cardKey: nodeKey })

        // skip CLICK_COMMAND behaviour otherwise we'll immediately enter edit mode
        skipClick.current = true

        // in most situations we want to prevent default behaviour which
        // can cause an underlying cursor position change but inputs and
        // textareas are different and we want the focus to move to them
        // immediately when clicked
        const target = event.target
        if (target instanceof HTMLElement) {
          const targetTagName = target.tagName
          const allowedTagNames = ['INPUT', 'TEXTAREA']
          const allowClickthrough = !!target.closest('[data-inkling-allow-clickthrough]')

          if (!allowedTagNames.includes(targetTagName) && !allowClickthrough) {
            event.preventDefault()
          }
        }
      }
    }

    container?.addEventListener('mousedown', handleMousedown)

    return () => {
      container?.removeEventListener('mousedown', handleMousedown)
    }
  }, [editor, isSelected, isEditing, nodeKey, containerRef])

  let isVisibilityActive = false
  if (isVisibilityEnabled) {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey)
      isVisibilityActive = $isCardNode(node) ? node.getIsVisibilityActive() : false
    })
  }

  const cardContextValue = React.useMemo(
    () => ({
      captionHasFocus,
      setCaptionHasFocus,
      nodeKey,
    }),
    // setState dispatchers are stable and do not need to be listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [captionHasFocus, nodeKey],
  )

  return (
    <CardContext.Provider value={cardContextValue}>
      <CardWrapper
        ref={containerRef}
        cardType={cardType ?? undefined}
        cardWidth={normalizedWidth}
        IndicatorIcon={IndicatorIcon}
        isDragging={isDragging}
        isEditing={isEditing}
        isSelected={isSelected}
        isVisibilityActive={isVisibilityActive}
        wrapperStyle={wrapperStyle}
        onIndicatorClick={openPanel}
      >
        {children}
      </CardWrapper>
    </CardContext.Provider>
  )
}

export default InklingCardWrapper
