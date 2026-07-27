import type { EditorState, LexicalEditor } from 'lexical'

import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { ToggleCard } from '@/components/ui/cards/ToggleCard'
import { useCardSelectionState } from '@/context/CardSelectionStoreContext'

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
  const isEditing = useCardSelectionState((state) => state.selectedCardKey === nodeKey && state.isEditingCard)

  React.useEffect(() => {
    headingEditor.setEditable(isEditing)
    contentEditor.setEditable(isEditing)
  }, [isEditing, headingEditor, contentEditor])

  return (
    <>
      <ToggleCard
        contentEditor={contentEditor}
        contentEditorInitialState={contentEditorInitialState}
        headingEditor={headingEditor}
        headingEditorInitialState={headingEditorInitialState}
        isEditing={isEditing}
      />

      <CardActionToolbar nodeKey={nodeKey} />
    </>
  )
}
