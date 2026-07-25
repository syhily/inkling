import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { HtmlCard } from '@/components/ui/cards/HtmlCard'
import { SettingsPanel } from '@/components/ui/SettingsPanel'
import { VisibilitySettings } from '@/components/ui/VisibilitySettings'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { useVisibilitySettingsPanel } from '@/hooks/useVisibilitySettingsPanel'
import { useVisibilityToggle } from '@/hooks/useVisibilityToggle'
import { $updateCardNode } from '@/nodes/base'
import { $isHtmlNode } from '@/nodes/HtmlNode'

export function HtmlNodeComponent({ nodeKey, html }: { nodeKey: string; html?: string }) {
  const [editor] = useLexicalComposerContext()
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const { darkMode } = React.useContext(InklingUiPrefsContext)

  const isSelected = useCardSelection((state) => state.selectedCardKey === nodeKey)
  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)
  // the sole indicator-icon card reads the visibility panel flag straight
  // from the card selection store, gated by its own selected state below
  const showVisibilitySettings = useCardSelection((state) => state.showVisibilitySettings)

  const { isVisibilityEnabled, openPanel } = useVisibilitySettingsPanel(nodeKey)
  const { visibilityOptions, toggleVisibility } = useVisibilityToggle(editor, nodeKey, cardConfig)

  const updateHtml = (value: string) => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHtmlNode, (node) => {
        node.html = value
      })
    })
  }

  const visibilitySettings = (
    <VisibilitySettings toggleVisibility={toggleVisibility} visibilityOptions={visibilityOptions} />
  )

  return (
    <>
      <HtmlCard darkMode={darkMode} html={html} isEditing={isEditing} updateHtml={updateHtml} />

      <CardActionToolbar
        items={[
          { kind: 'edit', dataTestId: 'edit-html' },
          { kind: 'separator', hide: !isVisibilityEnabled },
          {
            kind: 'custom',
            dataTestId: 'show-visibility',
            hide: !isVisibilityEnabled,
            icon: 'visibility',
            isActive: showVisibilitySettings,
            label: 'Visibility',
            onClick: openPanel,
          },
          { kind: 'separator' },
          { kind: 'snippet' },
        ]}
        nodeKey={nodeKey}
      />

      {isVisibilityEnabled && showVisibilitySettings && isSelected && (
        <SettingsPanel darkMode={darkMode} defaultTab="visibility" tabs>
          {{ visibility: visibilitySettings }}
        </SettingsPanel>
      )}
    </>
  )
}
