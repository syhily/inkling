import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext'
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer'
import React from 'react'

import type { LexicalProviderFactory } from '@/context/InklingCollaborationContext'
import type { CardConfig, FileUploader, FileUploaderInput } from '@/context/InklingHostIntegrationContext'

import { CardSelectionStoreContext } from '@/context/CardSelectionStoreContext'
import { DragDropHandleContext } from '@/context/DragDropHandleContext'
import { FootnoteHandleContext } from '@/context/FootnoteHandleContext'
import InklingCollaborationContext, { noopWebsocketProviderFactory } from '@/context/InklingCollaborationContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { TKHandleContext } from '@/context/TKHandleContext'
import { WordCountHandleContext } from '@/context/WordCountHandleContext'
import { resolveLabels, type InklingLabelsInput } from '@/labels/inkling-labels'
import { DEFAULT_CONFIG } from '@/nodes/base'
import { createCardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'
import { createDragDropHandle } from '@/plugins/behaviour/dragDropHandle'
import { createFootnoteHandle } from '@/plugins/behaviour/footnoteHandle'
import { createTKHandle } from '@/plugins/behaviour/tkHandle'
import { createWordCountHandle } from '@/plugins/behaviour/wordCountHandle'
import defaultTheme from '@/themes/default'
import { type InklingInitialEditorState, normalizeInitialEditorState } from '@/utils/initial-document'
import { requireMultiplayerConfig } from '@/utils/services/multiplayer-config'

export type { InklingInitialEditorState }

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function defaultOnError(error: unknown, _info?: React.ErrorInfo) {
  if (import.meta.env.DEV) {
    console.error(error)
  }
}

const defaultConfig = {
  namespace: 'InklingEditor',
  theme: defaultTheme,
  html: DEFAULT_CONFIG.html,
}

function hasFileUploadHook(
  fileUploader: FileUploaderInput,
): fileUploader is FileUploaderInput & Pick<FileUploader, 'useFileUpload'> {
  return 'useFileUpload' in fileUploader && typeof fileUploader.useFileUpload === 'function'
}

// The public prop accepts legacy bags, so only forward `fileTypes` entries
// whose shape the consumers actually read (`{ mimeTypes: string[] }` per
// media type) — anything else degrades to "no restriction", which is what the
// optional-chaining reads in the node components already fall back to.
function readFileTypes(fileUploader: FileUploaderInput): FileUploader['fileTypes'] {
  if (!('fileTypes' in fileUploader)) {
    return undefined
  }
  const value: unknown = fileUploader.fileTypes
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const fileTypes: NonNullable<FileUploader['fileTypes']> = {}
  for (const [media, entry] of Object.entries(value)) {
    if (media !== 'image' && media !== 'video' && media !== 'audio' && media !== 'file') {
      continue
    }
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'mimeTypes' in entry &&
      Array.isArray(entry.mimeTypes) &&
      entry.mimeTypes.every((mimeType: unknown) => typeof mimeType === 'string')
    ) {
      fileTypes[media] = { mimeTypes: entry.mimeTypes }
    }
  }
  return fileTypes
}

/**
 * The core composer variant (plan C5): `nodes` is REQUIRED — the host names
 * its node set (MINIMAL_NODES, a subset over EDITOR_BASE_NODES, or its own
 * composition) instead of defaulting to the full card set. The `.` entry
 * keeps the defaulted variant; `@/components/InklingComposer` wraps this one
 * with `nodes = [...DEFAULT_NODES]`.
 *
 * Keeping `nodes` mandatory is what lets the base stay free of the
 * `DefaultNodes` import — the static chain that drags every card's decorate
 * tree into any consumer of the composer.
 */
export interface InklingComposerProps {
  initialEditorState?: InklingInitialEditorState
  nodes: InitialConfigType['nodes']
  onError?: (error: unknown, info?: React.ErrorInfo) => void
  fileUploader?: FileUploaderInput
  cardConfig?: CardConfig
  darkMode?: boolean
  enableMultiplayer?: boolean
  isTKEnabled?: boolean
  /** Host label overrides (docs/kobato-fit-plan.md C7) — a partial table
   * merged over the English defaults; unknown keys are compile errors. */
  labels?: InklingLabelsInput
  multiplayerEndpoint?: string
  multiplayerDebug?: boolean
  multiplayerDocId?: string
  multiplayerUsername?: string
  children?: React.ReactNode
}

const InklingComposerBase = ({
  initialEditorState,
  nodes,
  onError = defaultOnError,
  fileUploader = {},
  cardConfig = {},
  darkMode = false,
  enableMultiplayer = false,
  isTKEnabled,
  labels,
  multiplayerEndpoint,
  multiplayerDebug = true,
  multiplayerDocId,
  multiplayerUsername,
  children,
}: InklingComposerProps) => {
  if (enableMultiplayer) {
    requireMultiplayerConfig(multiplayerEndpoint, multiplayerDocId)
  }

  const normalizedInitialEditorState = React.useMemo(
    () => normalizeInitialEditorState(initialEditorState),
    [initialEditorState],
  )

  const initialConfig = React.useMemo(
    () =>
      ({
        ...defaultConfig,
        nodes,
        // collaboration owns the bootstrap state via the plugin below
        editorState: enableMultiplayer ? null : normalizedInitialEditorState,
        // Lexical calls its onError with (Error, LexicalEditor); the public
        // callback follows the React error-boundary shape, so only the error is
        // forwarded — the original callback stays in context for the boundary
        onError: (error: Error) => onError(error),
      }) satisfies InitialConfigType,
    [enableMultiplayer, normalizedInitialEditorState, nodes, onError],
  )

  // one handle per channel per top-level composer (plan 047); the useState
  // initializer keeps each instance stable for the provider's lifetime
  const [dragDropHandle] = React.useState(createDragDropHandle)
  const [wordCountHandle] = React.useState(createWordCountHandle)
  const [cardSelectionStore] = React.useState(createCardSelectionStore)
  const [tkHandle] = React.useState(createTKHandle)
  const [footnoteHandle] = React.useState(createFootnoteHandle)

  const normalizedFileUploader = React.useMemo<FileUploader>(() => {
    const fileTypes = readFileTypes(fileUploader)
    const useFileUpload = hasFileUploadHook(fileUploader)
      ? fileUploader.useFileUpload
      : (): ReturnType<FileUploader['useFileUpload']> => {
          console.error(
            '<InklingComposer> requires a `fileUploader` prop object to be passed containing a `useFileUpload` custom hook',
          )
          return { upload: () => Promise.resolve(undefined) }
        }
    return fileTypes === undefined ? { useFileUpload } : { useFileUpload, fileTypes }
  }, [fileUploader])

  // The collaboration module (yjs/y-websocket) loads on demand: the dynamic
  // import runs inside an effect — never during SSR — and only when
  // multiplayer is enabled, so the core path never pays for yjs. Until the
  // chunk resolves, the context serves the inert factory and the
  // CollaborationPlugin stays unmounted, so the collab connection starts one
  // async tick later than the eager build did (documented C5 tradeoff).
  const [createWebsocketProvider, setCreateWebsocketProvider] = React.useState<LexicalProviderFactory | null>(null)

  React.useEffect(() => {
    if (!enableMultiplayer) {
      setCreateWebsocketProvider(null)
      return
    }
    let cancelled = false
    void import('@/utils/services/collaboration').then(({ createWebsocketProviderFactory }) => {
      if (cancelled) {
        return
      }
      setCreateWebsocketProvider(() =>
        createWebsocketProviderFactory({
          endpoint: multiplayerEndpoint,
          docId: multiplayerDocId,
          debug: multiplayerDebug,
        }),
      )
    })
    return () => {
      cancelled = true
    }
  }, [enableMultiplayer, multiplayerEndpoint, multiplayerDocId, multiplayerDebug])

  const hostIntegrationValue = React.useMemo(
    () => ({
      fileUploader: normalizedFileUploader,
      cardConfig,
      onError,
    }),
    [normalizedFileUploader, cardConfig, onError],
  )

  const collaborationValue = React.useMemo(
    () => ({ createWebsocketProvider: createWebsocketProvider ?? noopWebsocketProviderFactory }),
    [createWebsocketProvider],
  )

  const uiPrefsValue = React.useMemo(
    () => ({
      darkMode,
      isTKEnabled,
      // the host's override table merges over the English defaults exactly
      // once, here — every label-reading consumer sees a full table
      labels: resolveLabels(labels),
    }),
    [darkMode, isTKEnabled, labels],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <DragDropHandleContext.Provider value={dragDropHandle}>
        <WordCountHandleContext.Provider value={wordCountHandle}>
          <InklingHostIntegrationContext.Provider value={hostIntegrationValue}>
            <InklingCollaborationContext.Provider value={collaborationValue}>
              <InklingUiPrefsContext.Provider value={uiPrefsValue}>
                <CardSelectionStoreContext.Provider value={cardSelectionStore}>
                  <TKHandleContext.Provider value={tkHandle}>
                    <FootnoteHandleContext.Provider value={footnoteHandle}>
                      <LexicalCollaboration>
                        {enableMultiplayer && createWebsocketProvider ? (
                          <CollaborationPlugin
                            id="main"
                            initialEditorState={normalizedInitialEditorState}
                            providerFactory={createWebsocketProvider}
                            shouldBootstrap={true}
                            username={multiplayerUsername}
                          />
                        ) : null}
                        {children}
                      </LexicalCollaboration>
                    </FootnoteHandleContext.Provider>
                  </TKHandleContext.Provider>
                </CardSelectionStoreContext.Provider>
              </InklingUiPrefsContext.Provider>
            </InklingCollaborationContext.Provider>
          </InklingHostIntegrationContext.Provider>
        </WordCountHandleContext.Provider>
      </DragDropHandleContext.Provider>
    </LexicalComposer>
  )
}

export default InklingComposerBase
