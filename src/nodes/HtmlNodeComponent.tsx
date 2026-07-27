import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { HtmlCard } from '@/components/ui/cards/HtmlCard'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { useCardWriter } from '@/hooks/useCardWriter'
import { $isHtmlNode } from '@/nodes/HtmlNode'

export function HtmlNodeComponent({ nodeKey, html }: { nodeKey: string; html?: string }) {
  const write = useCardWriter(nodeKey, $isHtmlNode)
  const { darkMode } = React.useContext(InklingUiPrefsContext)

  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)

  const updateHtml = (value: string) => {
    write((node) => {
      node.html = value
    })
  }

  return (
    <>
      <HtmlCard darkMode={darkMode} html={html} isEditing={isEditing} updateHtml={updateHtml} />

      <CardActionToolbar editDataTestId="edit-html" nodeKey={nodeKey} />
    </>
  )
}
