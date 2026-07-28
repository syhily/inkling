import { type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { ButtonCard } from '@/components/ui/cards/ButtonCard'
import { useCardIsEditing } from '@/context/CardSelectionStoreContext'
import { useCardWriter } from '@/hooks/useCardWriter'
import { $isButtonNode } from '@/nodes/base'

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
  const write = useCardWriter(nodeKey, $isButtonNode)
  const isEditing = useCardIsEditing(nodeKey)

  const handleButtonTextChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    write((node) => {
      node.buttonText = event.target.value
    })
  }

  const handleButtonUrlChange = (value: string): void => {
    write((node) => {
      node.buttonUrl = value
    })
  }

  const handleAlignmentChange = (name: string): void => {
    write((node) => {
      node.alignment = name
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

      <CardActionToolbar editDataTestId="edit-button-card" nodeKey={nodeKey} />
    </>
  )
}
