import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { MathCard } from '@/components/ui/cards/MathCard'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { useCardWriter } from '@/hooks/useCardWriter'
import { $isMathNode } from '@/nodes/MathNode'
import { SELECT_CARD_COMMAND } from '@/plugins/behaviour/commands'

export interface MathNodeComponentProps {
  nodeKey: NodeKey
  tex?: string
  mathml?: string
  svg?: string
}

export function MathNodeComponent({ nodeKey, tex, mathml, svg }: MathNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const write = useCardWriter(nodeKey, $isMathNode)
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const isSelected = useCardSelection((state) => state.selectedCardKey === nodeKey)
  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)

  // mirrors the codeblock component: re-select only fires when the card lost
  // its selection; escape-while-editing is a no-op
  const exitEditMode = React.useCallback(() => {
    if (!isSelected) {
      editor.dispatchCommand(SELECT_CARD_COMMAND, { cardKey: nodeKey })
    }
  }, [editor, isSelected, nodeKey])

  const updateTex = React.useCallback(
    (value: string) => {
      write((node) => {
        node.tex = value
      })
    },
    [write],
  )

  return (
    <>
      <MathCard
        isEditing={isEditing}
        mathml={mathml}
        renderMath={cardConfig.renderMath}
        svg={svg}
        tex={tex}
        updateTex={updateTex}
        onEscape={exitEditMode}
      />
      <CardActionToolbar
        items={[{ kind: 'edit', dataTestId: 'edit-math-card' }, { kind: 'separator' }, { kind: 'snippet' }]}
        nodeKey={nodeKey}
      />
    </>
  )
}
