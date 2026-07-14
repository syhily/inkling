import '@/styles/index.css'
import type { SerializedEditorState } from 'lexical'

import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import React from 'react'

import type { InklingComposableEditorProps } from '@/components/InklingComposableEditor'
import type { InklingComposerProps } from '@/components/InklingComposer'

import InklingComposableEditor from '@/components/InklingComposableEditor'
import InklingComposer from '@/components/InklingComposer'
import { SharedHistoryContext } from '@/context/SharedHistoryContext'
import { SharedOnChangeContext } from '@/context/SharedOnChangeContext'
import EMAIL_EDITOR_NODES from '@/nodes/EmailEditorNodes'
import BookmarkPlugin from '@/plugins/BookmarkPlugin'
import ButtonPlugin from '@/plugins/ButtonPlugin'
import CalloutPlugin from '@/plugins/CalloutPlugin'
import CardMenuPlugin from '@/plugins/CardMenuPlugin'
import EmEnDashPlugin from '@/plugins/EmEnDashPlugin'
import EmojiPickerPlugin from '@/plugins/EmojiPickerPlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import HtmlPlugin from '@/plugins/HtmlPlugin'
import ImagePlugin from '@/plugins/ImagePlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import InklingSnippetPlugin from '@/plugins/InklingSnippetPlugin'
import { EMAIL_TRANSFORMERS } from '@/plugins/MarkdownShortcutPlugin'
import ReplacementStringsPlugin from '@/plugins/ReplacementStringsPlugin'
import { VISIBILITY_SETTINGS } from '@/utils/visibility'

export const EMAIL_EDITOR_CARD_CONFIG = {
  editorType: 'email',
  image: {
    allowedWidths: ['regular'],
  },
  visibilitySettings: VISIBILITY_SETTINGS.EMAIL_ONLY,
}

const ALLOWED_EMAIL_EDITOR_VISIBILITY = new Set([VISIBILITY_SETTINGS.EMAIL_ONLY, VISIBILITY_SETTINGS.NONE])

export function getEmailEditorCardConfig(cardConfig: Record<string, unknown> = {}) {
  const visibilitySettings = ALLOWED_EMAIL_EDITOR_VISIBILITY.has(cardConfig.visibilitySettings as string)
    ? (cardConfig.visibilitySettings as string)
    : EMAIL_EDITOR_CARD_CONFIG.visibilitySettings

  return {
    ...cardConfig,
    editorType: EMAIL_EDITOR_CARD_CONFIG.editorType,
    image: {
      ...(cardConfig.image as Record<string, unknown>),
      ...EMAIL_EDITOR_CARD_CONFIG.image,
    },
    visibilitySettings,
  }
}

export interface EmailEditorProps
  extends
    Omit<InklingComposerProps, 'cardConfig' | 'children' | 'nodes'>,
    Omit<InklingComposableEditorProps, 'onChange'> {
  cardConfig?: Record<string, unknown>
  onChange?: (editorState: SerializedEditorState) => void
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
      <SharedHistoryContext>
        <SharedOnChangeContext onChange={onChange}>
          <InklingComposableEditor
            {...editorProps}
            markdownTransformers={markdownTransformers}
            placeholderText={placeholderText}
          >
            <BookmarkPlugin />
            <ButtonPlugin />
            <CalloutPlugin />
            <CardMenuPlugin />
            <EmEnDashPlugin />
            <EmojiPickerPlugin />
            <HorizontalRulePlugin />
            <HtmlPlugin />
            <ImagePlugin />
            <InklingSelectorPlugin />
            <InklingSnippetPlugin />
            <ListPlugin />
            <ReplacementStringsPlugin />
            {children}
          </InklingComposableEditor>
        </SharedOnChangeContext>
      </SharedHistoryContext>
    </InklingComposer>
  )
}

export default EmailEditor
