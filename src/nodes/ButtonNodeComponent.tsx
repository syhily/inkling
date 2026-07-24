import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { ButtonCard } from '@/components/ui/cards/ButtonCard'
import { useCardSelection } from '@/hooks/useCardSelection'
import { $isButtonNode, $updateCardNode } from '@/nodes/base'

export interface ButtonNodeComponentProps {
  alignment?: string
  buttonText?: string
  buttonPlaceholder?: string
  buttonUrl?: string
  nodeKey: NodeKey
}

export function ButtonNodeComponent({
  alignment,
  buttonText,
  buttonPlaceholder = 'Add button text',
  buttonUrl,
  nodeKey,
}: ButtonNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)

  const handleButtonTextChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isButtonNode, (node) => {
        node.buttonText = event.target.value
      })
    })
  }

  const handleButtonUrlChange = (value: string): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isButtonNode, (node) => {
        node.buttonUrl = value
      })
    })
  }

  const handleAlignmentChange = (name: string): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isButtonNode, (node) => {
        node.alignment = name
      })
    })
  }

  return (
    <>
      <ButtonCard
        alignment={alignment}
        buttonPlaceholder={buttonPlaceholder}
        buttonText={buttonText}
        buttonUrl={buttonUrl}
        handleAlignmentChange={handleAlignmentChange}
        handleButtonTextChange={handleButtonTextChange}
        handleButtonUrlChange={handleButtonUrlChange}
        isEditing={isEditing}
      />

      <CardActionToolbar
        card="button"
        items={[{ kind: 'edit', dataTestId: 'edit-button-card' }, { kind: 'separator' }, { kind: 'snippet' }]}
        nodeKey={nodeKey}
      />
    </>
  )
}
