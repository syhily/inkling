import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, type NodeKey } from 'lexical'
import React from 'react'

import type { GeneratedDecoratorNodeBase } from '@/nodes/base/generate-decorator-node'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { ButtonCard } from '@/components/ui/cards/ButtonCard'
import { SnippetCreateToolbar } from '@/components/ui/SnippetCreateToolbar'
import { ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator } from '@/components/ui/ToolbarMenu'
import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'

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
  const { cardConfig } = React.useContext(InklingComposerContext)
  const { isEditing, isSelected, setEditing } = React.useContext(CardContext)
  const [showSnippetToolbar, setShowSnippetToolbar] = React.useState<boolean>(false)

  const handleButtonTextChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (node) {
        ;(node as GeneratedDecoratorNodeBase).buttonText = event.target.value
      }
    })
  }

  const handleButtonUrlChange = (value: string): void => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (node) {
        ;(node as GeneratedDecoratorNodeBase).buttonUrl = value
      }
    })
  }

  const handleAlignmentChange = (name: string): void => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (node) {
        ;(node as GeneratedDecoratorNodeBase).alignment = name
      }
    })
  }

  const handleToolbarEdit = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    setEditing(true)
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

      <ActionToolbar data-inkling-card-toolbar="button" isVisible={showSnippetToolbar}>
        <SnippetCreateToolbar nodeKey={nodeKey} onClose={() => setShowSnippetToolbar(false)} />
      </ActionToolbar>

      <ActionToolbar data-inkling-card-toolbar="button" isVisible={isSelected && !isEditing && !showSnippetToolbar}>
        <ToolbarMenu>
          <ToolbarMenuItem
            className={undefined}
            dataTestId="edit-button-card"
            icon="edit"
            isActive={false}
            label="Edit"
            onClick={handleToolbarEdit}
          />
          <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
          <ToolbarMenuItem
            className={undefined}
            dataTestId="create-snippet"
            hide={!cardConfig.createSnippet}
            icon="snippet"
            isActive={false}
            label="Save as snippet"
            onClick={() => setShowSnippetToolbar(true)}
          />
        </ToolbarMenu>
      </ActionToolbar>
    </>
  )
}
