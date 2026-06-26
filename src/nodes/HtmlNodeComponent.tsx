import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey } from 'lexical'
import React from 'react'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { HtmlCard } from '@/components/ui/cards/HtmlCard'
import { SettingsPanel } from '@/components/ui/SettingsPanel'
import { SnippetCreateToolbar } from '@/components/ui/SnippetCreateToolbar'
import { ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator } from '@/components/ui/ToolbarMenu'
import { VisibilitySettings } from '@/components/ui/VisibilitySettings'
import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { useInklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import { useVisibilityToggle } from '@/hooks/useVisibilityToggle'
import { $isHtmlNode } from '@/nodes/HtmlNode'
import { EDIT_CARD_COMMAND, SHOW_CARD_VISIBILITY_SETTINGS_COMMAND } from '@/plugins/InklingBehaviourPlugin'

export function HtmlNodeComponent({ nodeKey, html }: { nodeKey: string; html?: string }) {
  const [editor] = useLexicalComposerContext()
  const cardContext = React.useContext(CardContext)
  const { cardConfig, darkMode } = React.useContext(InklingComposerContext)
  const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false)

  const { showVisibilitySettings } = useInklingSelectedCardContext()

  const { isVisibilityEnabled, visibilityOptions, toggleVisibility } = useVisibilityToggle(editor, nodeKey, cardConfig)

  const updateHtml = (value: string) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isHtmlNode(node)) {
        node.html = value
      }
    })
  }

  const handleToolbarEdit = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    editor.dispatchCommand(EDIT_CARD_COMMAND, { cardKey: nodeKey, focusEditor: false })
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

      <ActionToolbar data-inkling-card-toolbar="html" isVisible={showSnippetToolbar}>
        <SnippetCreateToolbar nodeKey={nodeKey} onClose={() => setShowSnippetToolbar(false)} />
      </ActionToolbar>

      <ActionToolbar
        data-inkling-card-toolbar="html"
        isVisible={cardContext.isSelected && !showSnippetToolbar && !cardContext.isEditing}
      >
        <ToolbarMenu>
          <ToolbarMenuItem
            dataTestId="edit-html"
            icon="edit"
            isActive={false}
            label="Edit"
            onClick={handleToolbarEdit}
          />
          {isVisibilityEnabled && (
            <>
              <ToolbarMenuSeparator />
              <ToolbarMenuItem
                dataTestId="show-visibility"
                icon="visibility"
                isActive={showVisibilitySettings}
                label="Visibility"
                onClick={handleVisibilityToggle}
              />
            </>
          )}
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

      {isVisibilityEnabled && showVisibilitySettings && cardContext.isSelected && (
        <SettingsPanel darkMode={darkMode} defaultTab="visibility" tabs>
          {
            {
              visibility: visibilitySettings,
            } as Record<string, React.ReactNode>
          }
        </SettingsPanel>
      )}
    </>
  )
}
