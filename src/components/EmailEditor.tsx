import '@/styles/index.css'
import React from 'react'

import type { InklingComposableEditorProps } from '@/components/InklingComposableEditor'
import type { InklingComposerProps } from '@/components/InklingComposer'
import type { CardConfig } from '@/context/InklingHostIntegrationContext'

import InklingComposer from '@/components/InklingComposer'
import InklingSurface from '@/components/InklingSurface'
import { normalizeCardConfig } from '@/context/InklingHostIntegrationContext'
import { EMAIL_TRANSFORMERS } from '@/markdown/transformers'
import EMAIL_EDITOR_NODES from '@/nodes/EmailEditorNodes'
import AtLinkPlugin from '@/plugins/AtLinkPlugin'
import { deriveFeaturePlugins, FeaturePlugins } from '@/plugins/DefaultFeaturePlugins'
import ReplacementStringsPlugin from '@/plugins/ReplacementStringsPlugin'
import { VISIBILITY_SETTINGS } from '@/utils/visibility'

export const EMAIL_EDITOR_CARD_CONFIG = {
  image: {
    allowedWidths: ['regular'],
  },
  visibilitySettings: VISIBILITY_SETTINGS.EMAIL_ONLY,
}

// The email feature plugin set is a derived view over the default set
// (src/plugins/DefaultFeaturePlugins.tsx): at-linking is swapped for
// replacement strings — email has no @-mention surface.
export const EMAIL_FEATURE_PLUGINS = deriveFeaturePlugins({
  exclude: [AtLinkPlugin],
  include: [{ key: 'replacement-strings', Component: ReplacementStringsPlugin }],
})

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
      <InklingSurface
        {...editorProps}
        markdownTransformers={markdownTransformers}
        onChange={onChange}
        placeholderText={placeholderText}
      >
        <FeaturePlugins plugins={EMAIL_FEATURE_PLUGINS} />
        {children}
      </InklingSurface>
    </InklingComposer>
  )
}

export default EmailEditor
