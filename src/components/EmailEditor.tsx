import '@/styles/index.css'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import React from 'react'

import type { FileUploader } from '@/context/InklingComposerContext'

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

interface EmailEditorProps {
  cardConfig?: Record<string, unknown>
  darkMode?: boolean
  fileUploader?: FileUploader
  initialEditorState?: unknown
  onChange?: (editorState: unknown) => void
  onError?: (error: Error) => void
  children?: React.ReactNode
  markdownTransformers?: unknown[]
  placeholderText?: string
  [key: string]: unknown
}

const EmailEditor = ({
  cardConfig = {},
  darkMode = false,
  fileUploader,
  initialEditorState,
  onChange,
  onError,
  children,
  markdownTransformers = EMAIL_TRANSFORMERS,
  placeholderText = 'Begin writing your email...',
  ...props
}: EmailEditorProps) => {
  const mergedCardConfig = getEmailEditorCardConfig(cardConfig)

  return (
    <InklingComposer
      cardConfig={mergedCardConfig}
      darkMode={darkMode}
      fileUploader={fileUploader}
      // oxlint-disable-next-line typescript/no-explicit-any
      initialEditorState={initialEditorState as any}
      nodes={EMAIL_EDITOR_NODES}
      onError={onError}
    >
      <SharedHistoryContext>
        <SharedOnChangeContext onChange={onChange}>
          <InklingComposableEditor
            {...props}
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
