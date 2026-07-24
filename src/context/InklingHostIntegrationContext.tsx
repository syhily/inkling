import React from 'react'

import type { PinturaConfig } from '@/hooks/usePinturaEditor'
import type { ListOptionItem, SearchResult } from '@/hooks/useSearchLinks'

export interface FileUploader {
  useFileUpload: (type: 'image' | 'video' | 'audio' | 'file' | 'mediaThumbnail') => {
    isLoading?: boolean
    // `fileName` lets multi-file uploads (gallery) map results back to the
    // original file — the reference host (demo/utils/useFileUpload.ts) always
    // returns it, and `GalleryNodeComponent` reads it
    upload: (
      files: FileList | File[],
      options?: { formData?: Record<string, string> },
    ) => Promise<Array<{ url?: string; fileName?: string }> | undefined>
    errors?: Error[]
  }
  fileTypes?: {
    image?: { mimeTypes: string[] }
    video?: { mimeTypes: string[] }
    audio?: { mimeTypes: string[] }
    file?: { mimeTypes: string[] }
  }
}

// accepted by <InklingComposer>: a full uploader, a partial one missing the
// `useFileUpload` hook (a fallback is installed), or any legacy object
export type FileUploaderInput = Partial<FileUploader> | Record<string, unknown>

export interface GifSettings {
  klipy?: { apiKey?: string; contentFilter?: string }
  tenor?: { googleApiKey?: string; contentFilter?: string }
}

export interface SnippetItem {
  name: string
  value: string
}

export interface SnippetSettings {
  snippets?: SnippetItem[]
  createSnippet?: (args: SnippetItem) => void | Promise<void>
  deleteSnippet?: (args: SnippetItem) => void | Promise<void>
}

export interface BookmarkEmbedOptions {
  type: 'bookmark'
}

export interface BookmarkEmbedResponse {
  url: string
  metadata: {
    author: string
    icon: string
    title: string
    description: string
    publisher: string
    thumbnail: string
  }
}

export interface LinkingSettings {
  searchLinks?: (term?: string) => Promise<SearchResult[] | undefined>
  fetchAutocompleteLinks?: () => Promise<ListOptionItem[] | undefined>
  siteUrl?: string
  fetchEmbed?: (href: string, options: BookmarkEmbedOptions) => Promise<BookmarkEmbedResponse | undefined>
}

export interface VisibilitySettings {
  visibilitySettings?: string
  stripeEnabled?: boolean
}

export interface UploadSettings {
  image?: { allowedWidths?: string[] }
  pinturaConfig?: PinturaConfig
}

// The host's card-behaviour contract, closed (plan 048): every key the editor
// reads is declared on a per-area slice and nothing else is accepted, so
// renaming or tightening a key breaks host code loudly at compile time.
export interface CardConfig extends GifSettings, LinkingSettings, SnippetSettings, UploadSettings, VisibilitySettings {}

/** Runtime constraint for the bare-string `visibilitySettings`: an allowed
 * value set plus the fallback written when the input value isn't in it (or is
 * missing) — with a clamp, the key is always present in the normalized config. */
export interface VisibilitySettingsClamp {
  allowed: ReadonlySet<string>
  fallback: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readGifProviderSettings(value: unknown): GifSettings['klipy'] {
  if (!isRecord(value)) {
    return undefined
  }
  const settings: NonNullable<GifSettings['klipy']> = {}
  if (typeof value.apiKey === 'string') {
    settings.apiKey = value.apiKey
  }
  if (typeof value.contentFilter === 'string') {
    settings.contentFilter = value.contentFilter
  }
  return settings
}

function readSnippetItems(value: unknown): SnippetItem[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  return value.filter(
    (item): item is SnippetItem => isRecord(item) && typeof item.name === 'string' && typeof item.value === 'string',
  )
}

function readImageSettings(value: unknown): UploadSettings['image'] {
  if (!isRecord(value)) {
    return undefined
  }
  const image: NonNullable<UploadSettings['image']> = {}
  if (Array.isArray(value.allowedWidths) && value.allowedWidths.every((width) => typeof width === 'string')) {
    image.allowedWidths = value.allowedWidths
  }
  return image
}

/**
 * Boundary adapter turning a legacy card-config bag into the closed
 * `CardConfig` (mirrors the `readFileTypes` normalization in
 * `@/components/InklingComposer`): each declared slice is validated and
 * copied, malformed slices and unknown keys are dropped, so nothing
 * downstream reads a key the contract doesn't declare. `visibilityClamp`
 * constrains the bare-string `visibilitySettings` to the values a host
 * supports — EmailEditor's email-safe set is the only runtime clamp today;
 * without one, a string value passes through as-is.
 */
export function normalizeCardConfig(
  input: unknown,
  { visibilityClamp }: { visibilityClamp?: VisibilitySettingsClamp } = {},
): CardConfig {
  const source = isRecord(input) ? input : {}
  const config: CardConfig = {}

  // GifSettings
  const klipy = readGifProviderSettings(source.klipy)
  if (klipy !== undefined) {
    config.klipy = klipy
  }
  const tenor = readGifProviderSettings(source.tenor)
  if (tenor !== undefined) {
    config.tenor = tenor
  }

  // LinkingSettings
  if (typeof source.searchLinks === 'function') {
    config.searchLinks = source.searchLinks as LinkingSettings['searchLinks']
  }
  if (typeof source.fetchAutocompleteLinks === 'function') {
    config.fetchAutocompleteLinks = source.fetchAutocompleteLinks as LinkingSettings['fetchAutocompleteLinks']
  }
  if (typeof source.siteUrl === 'string') {
    config.siteUrl = source.siteUrl
  }
  if (typeof source.fetchEmbed === 'function') {
    config.fetchEmbed = source.fetchEmbed as LinkingSettings['fetchEmbed']
  }

  // SnippetSettings
  const snippets = readSnippetItems(source.snippets)
  if (snippets !== undefined) {
    config.snippets = snippets
  }
  if (typeof source.createSnippet === 'function') {
    config.createSnippet = source.createSnippet as SnippetSettings['createSnippet']
  }
  if (typeof source.deleteSnippet === 'function') {
    config.deleteSnippet = source.deleteSnippet as SnippetSettings['deleteSnippet']
  }

  // UploadSettings
  const image = readImageSettings(source.image)
  if (image !== undefined) {
    config.image = image
  }
  if (isRecord(source.pinturaConfig)) {
    config.pinturaConfig = source.pinturaConfig as PinturaConfig
  }

  // VisibilitySettings — bare string, optionally clamped to the host's set
  if (visibilityClamp) {
    config.visibilitySettings =
      typeof source.visibilitySettings === 'string' && visibilityClamp.allowed.has(source.visibilitySettings)
        ? source.visibilitySettings
        : visibilityClamp.fallback
  } else if (typeof source.visibilitySettings === 'string') {
    config.visibilitySettings = source.visibilitySettings
  }
  if (typeof source.stripeEnabled === 'boolean') {
    config.stripeEnabled = source.stripeEnabled
  }

  return config
}

// Host-integration lifecycle (plan 047): the values the host application
// hands the editor — uploads, card behaviour flags, and the error sink.
export interface InklingHostIntegrationContextValue {
  fileUploader: FileUploader
  cardConfig: CardConfig
  onError: (error: unknown, info: React.ErrorInfo) => void
}

const InklingHostIntegrationContext = React.createContext<InklingHostIntegrationContextValue>({
  fileUploader: {
    useFileUpload: () => ({ upload: () => Promise.resolve(undefined) }),
  },
  cardConfig: {},
  onError: () => {},
})

export default InklingHostIntegrationContext
