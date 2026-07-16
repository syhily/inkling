import React from 'react'

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

export interface CardConfig {
  visibilitySettings?: string
  stripeEnabled?: boolean
  feature?: boolean | object
  createSnippet?: (args: { name: string; value: string }) => void | Promise<void>
  deleteSnippet?: (args: { name: string; value: string }) => void | Promise<void>
  snippets?: Array<{ name: string; value: string }>
  fetchEmbed?: (href: string, opts: object) => Promise<unknown>
  searchLinks?: (term?: string) => Promise<SearchResult[] | undefined>
  fetchAutocompleteLinks?: () => Promise<ListOptionItem[] | undefined>
  siteUrl?: string
  pinturaConfig?: object
  renderLabels?: boolean
  fetchLabels?: () => Promise<unknown[]>
  image?: { allowedWidths?: string[] }
  klipy?: { apiKey?: string; contentFilter?: string }
  tenor?: { googleApiKey?: string; contentFilter?: string }
  post?: { displayName?: string }
  [key: string]: unknown
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
