import '@/styles/index.css'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import React from 'react'

import type { InklingComposableEditorProps } from '@/components/InklingComposableEditor'
import type { InklingComposerProps } from '@/components/InklingComposer'
import type { CardConfig } from '@/context/InklingHostIntegrationContext'

import InklingComposableEditor from '@/components/InklingComposableEditor'
import InklingComposer from '@/components/InklingComposer'
import { normalizeCardConfig } from '@/context/InklingHostIntegrationContext'
import { SharedEditorStateContext } from '@/context/SharedEditorStateContext'
import { EMAIL_TRANSFORMERS } from '@/markdown/transformers'
import EMAIL_EDITOR_NODES from '@/nodes/EmailEditorNodes'
import { CardInsertPlugin } from '@/plugins/CardInsertPlugin'
import CardMenuPlugin from '@/plugins/CardMenuPlugin'
import EmEnDashPlugin from '@/plugins/EmEnDashPlugin'
import EmojiPickerPlugin from '@/plugins/EmojiPickerPlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import InklingSnippetPlugin from '@/plugins/InklingSnippetPlugin'
import ReplacementStringsPlugin from '@/plugins/ReplacementStringsPlugin'
import { VISIBILITY_SETTINGS } from '@/utils/visibility'

export const EMAIL_EDITOR_CARD_CONFIG = {
  image: {
    allowedWidths: ['regular'],
  },
  visibilitySettings: VISIBILITY_SETTINGS.EMAIL_ONLY,
}

const ALLOWED_EMAIL_EDITOR_VISIBILITY: ReadonlySet<string> = new Set([
  VISIBILITY_SETTINGS.EMAIL_ONLY,
  VISIBILITY_SETTINGS.NONE,
])

// Sanitizes a legacy card-config bag for the email editor: the closed-contract
// boundary (normalizeCardConfig) drops unknown keys, `visibilitySettings` is
// clamped to the email-safe set, and `image.allowedWidths` is force-set for
// the email layout (pinned by test/unit/EmailEditor.test.ts).
export function getEmailEditorCardConfig(cardConfig: unknown = {}): CardConfig {
  const normalized = normalizeCardConfig(cardConfig, {
    visibilityClamp: {
      allowed: ALLOWED_EMAIL_EDITOR_VISIBILITY,
      fallback: EMAIL_EDITOR_CARD_CONFIG.visibilitySettings,
    },
  })

  return {
    ...normalized,
    image: {
      ...normalized.image,
      ...EMAIL_EDITOR_CARD_CONFIG.image,
    },
  }
}

export interface EmailEditorProps
  extends Omit<InklingComposerProps, 'cardConfig' | 'children' | 'nodes'>, InklingComposableEditorProps {
  cardConfig?: CardConfig
}

const EmailEditor = ({
  cardConfig = {},
  children,
  darkMode,
  enableMultiplayer,
  fileUploader,
  initialEditorState,
  isTKEnabled,
  markdownTransformers = EMAIL_TRANSFORMERS,
  multiplayerDebug,
  multiplayerDocId,
  multiplayerEndpoint,
  multiplayerUsername,
  onChange,
  onError,
  placeholderText = 'Begin writing your email...',
  ...editorProps
}: EmailEditorProps) => {
  const mergedCardConfig = getEmailEditorCardConfig(cardConfig)

  return (
    <InklingComposer
      cardConfig={mergedCardConfig}
      darkMode={darkMode}
      enableMultiplayer={enableMultiplayer}
      fileUploader={fileUploader}
      initialEditorState={initialEditorState}
      isTKEnabled={isTKEnabled}
      multiplayerDebug={multiplayerDebug}
      multiplayerDocId={multiplayerDocId}
      multiplayerEndpoint={multiplayerEndpoint}
      multiplayerUsername={multiplayerUsername}
      nodes={EMAIL_EDITOR_NODES}
      onError={onError}
    >
      <SharedEditorStateContext onChange={onChange}>
        <InklingComposableEditor
          {...editorProps}
          markdownTransformers={markdownTransformers}
          placeholderText={placeholderText}
        >
          <CardInsertPlugin />
          <CardMenuPlugin />
          <EmEnDashPlugin />
          <EmojiPickerPlugin />
          <HorizontalRulePlugin />
          <InklingSelectorPlugin />
          <InklingSnippetPlugin />
          <ListPlugin />
          <ReplacementStringsPlugin />
          {children}
        </InklingComposableEditor>
      </SharedEditorStateContext>
    </InklingComposer>
  )
}

export default EmailEditor
