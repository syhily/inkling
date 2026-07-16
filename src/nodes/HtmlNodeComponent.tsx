import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { HtmlCard } from '@/components/ui/cards/HtmlCard'
import { SettingsPanel } from '@/components/ui/SettingsPanel'
import { VisibilitySettings } from '@/components/ui/VisibilitySettings'
import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useInklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { useVisibilityToggle } from '@/hooks/useVisibilityToggle'
import { $updateCardNode } from '@/nodes/base'
import { $isHtmlNode } from '@/nodes/HtmlNode'
import { SHOW_CARD_VISIBILITY_SETTINGS_COMMAND } from '@/plugins/InklingBehaviourPlugin'

export function HtmlNodeComponent({ nodeKey, html }: { nodeKey: string; html?: string }) {
  const [editor] = useLexicalComposerContext()
  const cardContext = React.useContext(CardContext)
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const { darkMode } = React.useContext(InklingUiPrefsContext)

  const { showVisibilitySettings } = useInklingSelectedCardContext()

  const { isVisibilityEnabled, visibilityOptions, toggleVisibility } = useVisibilityToggle(editor, nodeKey, cardConfig)

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

  const handleVisibilityToggle = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, { cardKey: nodeKey })
    },
    [editor, nodeKey],
  )

  return (
    <>
      <HtmlCard darkMode={darkMode} html={html} isEditing={cardContext.isEditing} updateHtml={updateHtml} />

      <CardActionToolbar
        card="html"
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
            onClick: handleVisibilityToggle,
          },
          { kind: 'separator' },
          { kind: 'snippet' },
        ]}
        nodeKey={nodeKey}
      />

      {isVisibilityEnabled && showVisibilitySettings && cardContext.isSelected && (
        <SettingsPanel darkMode={darkMode} defaultTab="visibility" tabs>
          {{ visibility: visibilitySettings }}
        </SettingsPanel>
      )}
    </>
  )
}
