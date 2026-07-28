import { type NodeKey } from 'lexical'
import React from 'react'

import type { MathNode } from '@/nodes/MathNode'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { MathCard } from '@/components/ui/cards/MathCard'
import { useCardIsEditing } from '@/context/CardSelectionStoreContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardWriter } from '@/hooks/useCardWriter'
import { useReselectOnEscape } from '@/hooks/useReselectOnEscape'
import { $isMathNode } from '@/nodes/MathNode'

export interface MathNodeComponentProps {
  nodeKey: NodeKey
  tex?: string
  mathml?: string
  svg?: string
}

export function MathNodeComponent({ nodeKey, tex, mathml, svg }: MathNodeComponentProps) {
  const write = useCardWriter(nodeKey, $isMathNode)
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const isEditing = useCardIsEditing(nodeKey)
  const exitEditMode = useReselectOnEscape(nodeKey)

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
      <CardActionToolbar editDataTestId="edit-math-card" nodeKey={nodeKey} />
    </>
  )
}

/**
 * Math's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function renderMathCard(node: MathNode) {
  return <MathNodeComponent mathml={node.mathml} nodeKey={node.getKey()} svg={node.svg} tex={node.tex} />
}
