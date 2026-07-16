import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { CalloutCard } from '@/components/ui/cards/CalloutCard'
import CardContext from '@/context/CardContext'
import { $isCalloutNode, $updateCardNode } from '@/nodes/base'

export interface CalloutNodeComponentProps {
  nodeKey: NodeKey
  calloutEmoji?: string
  backgroundColor?: string
  textColor?: string
  calloutTextEditor?: LexicalEditor | null
  calloutTextEditorInitialState?: EditorState | undefined
}

export function CalloutNodeComponent({
  nodeKey,
  calloutEmoji,
  backgroundColor,
  calloutTextEditor,
  calloutTextEditorInitialState,
}: CalloutNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const { isEditing } = React.useContext(CardContext)
  const [showEmojiPicker, setShowEmojiPicker] = React.useState<boolean>(false)

  const handleEmojiChange = React.useCallback(
    (newEmoji: string): void => {
      editor.update(() => {
        $updateCardNode(nodeKey, $isCalloutNode, (node) => {
          node.calloutEmoji = newEmoji
        })
      })
    },
    [editor, nodeKey],
  )

  const handleEmojiSelect = React.useCallback(
    (newEmoji: unknown): void => {
      const nativeEmoji = (newEmoji as { native?: string } | undefined)?.native ?? (newEmoji as string)
      handleEmojiChange(nativeEmoji)
      setShowEmojiPicker(false)
    },
    [handleEmojiChange],
  )

  const handleToggleEmoji = React.useCallback(
    (checked: boolean): void => {
      handleEmojiChange(checked ? calloutEmoji || '💡' : '')
    },
    [calloutEmoji, handleEmojiChange],
  )

  const handleToggleEmojiPicker = React.useCallback((): void => {
    setShowEmojiPicker((show) => !show)
  }, [])

  const handleBackgroundColorChange = (color?: string): void => {
    if (!color) {
      return
    }
    editor.update(() => {
      $updateCardNode(nodeKey, $isCalloutNode, (node) => {
        node.backgroundColor = color
      })
    })
  }

  return (
    <>
      <CalloutCard
        backgroundColor={backgroundColor}
        calloutEmoji={calloutEmoji}
        changeEmoji={handleEmojiSelect}
        color={backgroundColor as import('@/components/ui/cards/CalloutCard').CalloutColorName}
        handleColorChange={handleBackgroundColorChange}
        isEditing={isEditing}
        nodeKey={nodeKey}
        setShowEmojiPicker={setShowEmojiPicker}
        showEmojiPicker={showEmojiPicker}
        textEditor={calloutTextEditor!}
        textEditorInitialState={calloutTextEditorInitialState}
        toggleEmoji={handleToggleEmoji}
        toggleEmojiPicker={handleToggleEmojiPicker}
      />
      <CardActionToolbar
        card="callout"
        items={[{ kind: 'edit', dataTestId: 'edit-callout-card' }, { kind: 'separator' }, { kind: 'snippet' }]}
        nodeKey={nodeKey}
      />
    </>
  )
}
