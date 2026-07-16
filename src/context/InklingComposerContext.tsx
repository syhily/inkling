import type { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'

import React from 'react'

import type { ListOptionItem, SearchResult } from '@/hooks/useSearchLinks'
import type { DragDropHandler } from '@/utils/draggable/DragDropHandler'

// derived from the installed component so it stays in sync with Lexical's own
// (unexported) ProviderFactory alias
export type LexicalProviderFactory = React.ComponentProps<typeof CollaborationPlugin>['providerFactory']

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

export interface InklingComposerContextValue {
  fileUploader: FileUploader
  cardConfig: CardConfig
  darkMode: boolean
  enableMultiplayer: boolean
  isTKEnabled?: boolean
  multiplayerEndpoint?: string
  multiplayerDocId?: string
  multiplayerUsername?: string
  editorContainerRef: React.RefObject<HTMLElement | null>
  createWebsocketProvider: LexicalProviderFactory
  onWordCountChangeRef: React.MutableRefObject<((count: number) => void) | null>
  dragDropHandler?: DragDropHandler
  onError: (error: unknown, info: React.ErrorInfo) => void
}

const InklingComposerContext = React.createContext<InklingComposerContextValue>({
  fileUploader: {
    useFileUpload: () => ({ upload: () => Promise.resolve(undefined) }),
  },
  cardConfig: {},
  darkMode: false,
  enableMultiplayer: false,
  editorContainerRef: { current: null },
  createWebsocketProvider: () => ({
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: () => {},
      on: () => {},
      setLocalState: () => {},
      setLocalStateField: () => {},
    },
    connect: () => {},
    disconnect: () => {},
    off: () => {},
    on: () => {},
  }),
  onWordCountChangeRef: { current: null },
  onError: () => {},
})

export default InklingComposerContext
