import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext'
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer'
import React from 'react'

import type { CardConfig, FileUploader, FileUploaderInput } from '@/context/InklingHostIntegrationContext'

import { CardSelectionStoreContext } from '@/context/CardSelectionStoreContext'
import { DragDropHandleContext } from '@/context/DragDropHandleContext'
import InklingCollaborationContext from '@/context/InklingCollaborationContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { TKHandleContext } from '@/context/TKHandleContext'
import { WordCountHandleContext } from '@/context/WordCountHandleContext'
import { DEFAULT_CONFIG } from '@/nodes/base'
import DEFAULT_NODES from '@/nodes/DefaultNodes'
import { createCardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'
import { createDragDropHandle } from '@/plugins/behaviour/dragDropHandle'
import { createTKHandle } from '@/plugins/behaviour/tkHandle'
import { createWordCountHandle } from '@/plugins/behaviour/wordCountHandle'
import defaultTheme from '@/themes/default'
import { type InklingInitialEditorState, normalizeInitialEditorState } from '@/utils/normalizeInitialEditorState'
import { createWebsocketProviderFactory, requireMultiplayerConfig } from '@/utils/services/collaboration'

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

export interface InklingComposerProps {
  initialEditorState?: InklingInitialEditorState
  nodes?: InitialConfigType['nodes']
  onError?: (error: unknown, info?: React.ErrorInfo) => void
  fileUploader?: FileUploaderInput
  cardConfig?: CardConfig
  darkMode?: boolean
  enableMultiplayer?: boolean
  isTKEnabled?: boolean
  multiplayerEndpoint?: string
  multiplayerDebug?: boolean
  multiplayerDocId?: string
  multiplayerUsername?: string
  children?: React.ReactNode
}

const InklingComposer = ({
  initialEditorState,
  nodes = [...DEFAULT_NODES],
  onError = defaultOnError,
  fileUploader = {},
  cardConfig = {},
  darkMode = false,
  enableMultiplayer = false,
  isTKEnabled,
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

  const createWebsocketProvider = React.useMemo(
    () =>
      createWebsocketProviderFactory({
        endpoint: multiplayerEndpoint,
        docId: multiplayerDocId,
        debug: multiplayerDebug,
      }),
    [multiplayerEndpoint, multiplayerDocId, multiplayerDebug],
  )

  const hostIntegrationValue = React.useMemo(
    () => ({
      fileUploader: normalizedFileUploader,
      cardConfig,
      onError,
    }),
    [normalizedFileUploader, cardConfig, onError],
  )

  const collaborationValue = React.useMemo(() => ({ createWebsocketProvider }), [createWebsocketProvider])

  const uiPrefsValue = React.useMemo(
    () => ({
      darkMode,
      isTKEnabled,
    }),
    [darkMode, isTKEnabled],
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
                    <LexicalCollaboration>
                      {enableMultiplayer ? (
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

export default InklingComposer
