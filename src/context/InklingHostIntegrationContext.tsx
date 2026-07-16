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

export interface LinkingSettings {
  searchLinks?: (term?: string) => Promise<SearchResult[] | undefined>
  fetchAutocompleteLinks?: () => Promise<ListOptionItem[] | undefined>
  siteUrl?: string
  fetchEmbed?: (href: string, opts: object) => Promise<unknown>
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
export interface CardConfig extends GifSettings, LinkingSettings, SnippetSettings, UploadSettings, VisibilitySettings {
  // gates card-menu items by the host's content-type name (buildCardMenu.ts)
  post?: { displayName?: string }
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
