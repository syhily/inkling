import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { HtmlCard } from '@/components/ui/cards/HtmlCard'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { $updateCardNode } from '@/nodes/base'
import { $isHtmlNode } from '@/nodes/HtmlNode'

export function HtmlNodeComponent({ nodeKey, html }: { nodeKey: string; html?: string }) {
  const [editor] = useLexicalComposerContext()
  const { darkMode } = React.useContext(InklingUiPrefsContext)

  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)

  const updateHtml = (value: string) => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHtmlNode, (node) => {
        node.html = value
      })
    })
  }

  return (
    <>
      <HtmlCard darkMode={darkMode} html={html} isEditing={isEditing} updateHtml={updateHtml} />

      <CardActionToolbar
        items={[{ kind: 'edit', dataTestId: 'edit-html' }, { kind: 'separator' }, { kind: 'snippet' }]}
        nodeKey={nodeKey}
      />
    </>
  )
}
