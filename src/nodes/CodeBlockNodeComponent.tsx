import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { CodeBlockCard } from '@/components/ui/cards/CodeBlockCard'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { useCardWriter } from '@/hooks/useCardWriter'
import { useReselectOnEscape } from '@/hooks/useReselectOnEscape'
import { $isCodeBlockNode } from '@/nodes/CodeBlockNode'

export interface CodeBlockNodeComponentProps {
  nodeKey: NodeKey
  code?: string
  language?: string
  captionEditor?: LexicalEditor | null
  captionEditorInitialState?: EditorState | undefined
}

export function CodeBlockNodeComponent({
  nodeKey,
  code,
  language,
  captionEditor,
  captionEditorInitialState,
}: CodeBlockNodeComponentProps) {
  const write = useCardWriter(nodeKey, $isCodeBlockNode)
  const { darkMode } = React.useContext(InklingUiPrefsContext)
  const isSelected = useCardSelection((state) => state.selectedCardKey === nodeKey)
  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)
  const exitEditMode = useReselectOnEscape(nodeKey)

  const updateCode = React.useCallback(
    (value: string) => {
      write((node) => {
        node.code = value
      })
    },
    [write],
  )

  const updateLanguage = React.useCallback(
    (value: string) => {
      write((node) => {
        node.language = value
      })
    },
    [write],
  )

  return (
    <>
      <CodeBlockCard
        captionEditor={captionEditor ?? null}
        captionEditorInitialState={captionEditorInitialState}
        code={code}
        darkMode={darkMode}
        isEditing={isEditing}
        isSelected={isSelected}
        language={language}
        updateCode={updateCode}
        updateLanguage={updateLanguage}
        onEscape={exitEditMode}
      />
      <CardActionToolbar editDataTestId="edit-code-block-card" nodeKey={nodeKey} />
    </>
  )
}
