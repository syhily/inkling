import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type NodeKey } from 'lexical'
import React from 'react'

import type { CardConfig } from '@/context/InklingHostIntegrationContext'

import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { SHOW_CARD_VISIBILITY_SETTINGS_COMMAND } from '@/plugins/behaviour/commands'
import { VISIBILITY_SETTINGS } from '@/utils/visibility'

// The single owner of the visibility-panel gate: an unset visibilitySettings
// config defaults to WEB_AND_EMAIL (enabled), matching useVisibilityToggle.
// The wrapper's indicator, the html toolbar item, and useVisibilityToggle all
// read the gate from here.
export function isVisibilitySettingsEnabled(cardConfig: CardConfig | undefined): boolean {
  const visibilitySetting = cardConfig?.visibilitySettings ?? VISIBILITY_SETTINGS.WEB_AND_EMAIL
  return visibilitySetting !== VISIBILITY_SETTINGS.NONE
}

// The visibility-settings panel affordance: the gate plus the one click
// handler that opens the panel through the card command handlers (the click
// must not also trigger the card's own click selection/edit behaviour).
export function useVisibilitySettingsPanel(nodeKey: NodeKey) {
  const [editor] = useLexicalComposerContext()
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)

  const isVisibilityEnabled = isVisibilitySettingsEnabled(cardConfig)

  const openPanel = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, { cardKey: nodeKey })
    },
    [editor, nodeKey],
  )

  return { isVisibilityEnabled, openPanel }
}
