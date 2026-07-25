import type { EditorState, LexicalEditor } from 'lexical'

import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { ToggleCard } from '@/components/ui/cards/ToggleCard'
import { useCardSelection } from '@/hooks/useCardSelection'

export function ToggleNodeComponent({
  nodeKey,
  headingEditor,
  headingEditorInitialState,
  contentEditor,
  contentEditorInitialState,
}: {
  nodeKey: string
  headingEditor: LexicalEditor
  headingEditorInitialState?: EditorState
  contentEditor: LexicalEditor
  contentEditorInitialState?: EditorState
}) {
  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)

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

      <CardActionToolbar nodeKey={nodeKey} />
    </>
  )
}
