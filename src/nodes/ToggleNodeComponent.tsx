import type { LexicalEditor } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { ToggleCard } from '@/components/ui/cards/ToggleCard'
import { SnippetCreateToolbar } from '@/components/ui/SnippetCreateToolbar'
import { ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator } from '@/components/ui/ToolbarMenu'
import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { EDIT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

export function ToggleNodeComponent({
  nodeKey,
  headingEditor,
  headingEditorInitialState,
  contentEditor,
  contentEditorInitialState,
}: {
  nodeKey: string
  headingEditor: LexicalEditor
  headingEditorInitialState?: string
  contentEditor: LexicalEditor
  contentEditorInitialState?: string
}) {
  const [editor] = useLexicalComposerContext()
  const cardContext = React.useContext(CardContext)
  const { cardConfig } = React.useContext(InklingComposerContext)
  const { isEditing, isSelected } = cardContext
  const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false)

  const handleToolbarEdit = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (nodeKey) {
      editor.dispatchCommand(EDIT_CARD_COMMAND, { cardKey: nodeKey, focusEditor: false })
    }
  }

  React.useEffect(() => {
    headingEditor.setEditable(isEditing)
    contentEditor.setEditable(isEditing)
  }, [isEditing, headingEditor, contentEditor])

  return (
    <>
      <ToggleCard
        contentEditor={contentEditor}
        contentEditorInitialState={contentEditorInitialState}
        contentPlaceholder={'Collapsible content'}
        headingEditor={headingEditor}
        headingEditorInitialState={headingEditorInitialState}
        headingPlaceholder={'Toggle header'}
        isEditing={isEditing}
      />

      <ActionToolbar data-inkling-card-toolbar="toggle" isVisible={showSnippetToolbar}>
        <SnippetCreateToolbar nodeKey={nodeKey} onClose={() => setShowSnippetToolbar(false)} />
      </ActionToolbar>

      <ActionToolbar data-inkling-card-toolbar="toggle" isVisible={isSelected && !isEditing && !showSnippetToolbar}>
        <ToolbarMenu>
          <ToolbarMenuItem icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
          <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
          <ToolbarMenuItem
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
