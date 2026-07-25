import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { CodeBlockCard } from '@/components/ui/cards/CodeBlockCard'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { $updateCardNode } from '@/nodes/base'
import { $isCodeBlockNode } from '@/nodes/CodeBlockNode'
import { SELECT_CARD_COMMAND } from '@/plugins/behaviour/commands'

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
  const [editor] = useLexicalComposerContext()
  const { darkMode } = React.useContext(InklingUiPrefsContext)
  const isSelected = useCardSelection((state) => state.selectedCardKey === nodeKey)
  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)

  // mirrors the wrapper's old context setEditing(false): re-select only fires
  // when the card lost its selection; escape-while-editing is a no-op
  const exitEditMode = React.useCallback(() => {
    if (!isSelected) {
      editor.dispatchCommand(SELECT_CARD_COMMAND, { cardKey: nodeKey })
    }
  }, [editor, isSelected, nodeKey])

  const updateCode = React.useCallback(
    (value: string) => {
      editor.update(() => {
        $updateCardNode(nodeKey, $isCodeBlockNode, (node) => {
          node.code = value
        })
      })
    },
    [editor, nodeKey],
  )

  const updateLanguage = React.useCallback(
    (value: string) => {
      editor.update(() => {
        $updateCardNode(nodeKey, $isCodeBlockNode, (node) => {
          node.language = value
        })
      })
    },
    [editor, nodeKey],
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
      <CardActionToolbar
        items={[{ kind: 'edit', dataTestId: 'edit-code-block-card' }, { kind: 'separator' }, { kind: 'snippet' }]}
        nodeKey={nodeKey}
      />
    </>
  )
}
