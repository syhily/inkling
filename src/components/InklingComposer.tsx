import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext'
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer'
import React from 'react'
import { WebsocketProvider } from 'y-websocket'
import { Doc } from 'yjs'

import type { LexicalProviderFactory } from '@/context/InklingCollaborationContext'
import type { CardConfig, FileUploader, FileUploaderInput } from '@/context/InklingHostIntegrationContext'

import { DragDropHandleContext } from '@/context/DragDropHandleContext'
import InklingCollaborationContext from '@/context/InklingCollaborationContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { InklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { TKContext } from '@/context/TKContext'
import { WordCountHandleContext } from '@/context/WordCountHandleContext'
import { DEFAULT_CONFIG } from '@/nodes/base'
import DEFAULT_NODES from '@/nodes/DefaultNodes'
import { createDragDropHandle } from '@/plugins/behaviour/dragDropHandle'
import { createWordCountHandle } from '@/plugins/behaviour/wordCountHandle'
import defaultTheme from '@/themes/default'
import { type InklingInitialEditorState, normalizeInitialEditorState } from '@/utils/normalizeInitialEditorState'

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

// The events Lexical's Provider interface registers handlers for. Of these,
// y-websocket's WebsocketProvider only ever emits 'sync' and 'status' — its
// typed event map doesn't even admit 'update' or 'reload' — so adapt by
// multiplexing: handlers register in a local map and the two events the
// provider really emits are forwarded into it. 'update'/'reload' handlers
// never fire, exactly as when they were registered on the provider directly.
type ProviderEventCallbacks = {
  sync: (isSynced: boolean) => void
  update: (arg0: unknown) => void
  status: (arg0: { status: string }) => void
  reload: (doc: Doc) => void
}

function adaptWebsocketProvider(provider: WebsocketProvider): ReturnType<LexicalProviderFactory> {
  const listeners: { [K in keyof ProviderEventCallbacks]: Set<ProviderEventCallbacks[K]> } = {
    sync: new Set(),
    update: new Set(),
    status: new Set(),
    reload: new Set(),
  }
  provider.on('sync', (isSynced) => listeners.sync.forEach((callback) => callback(isSynced)))
  provider.on('status', (event) => listeners.status.forEach((callback) => callback(event)))

  function on<K extends keyof ProviderEventCallbacks>(type: K, callback: ProviderEventCallbacks[K]): void {
    listeners[type].add(callback)
  }

  function off<K extends keyof ProviderEventCallbacks>(type: K, callback: ProviderEventCallbacks[K]): void {
    listeners[type].delete(callback)
  }

  return {
    // y-protocols' Awareness and Lexical's ProviderAwareness describe the same
    // runtime object, but TS 6 won't reconcile them: Awareness declares its
    // state maps with `any`-valued index signatures while UserState has
    // required named fields (anchorPos/color/...), and index signatures no
    // longer satisfy required properties, so not even a single-step assertion
    // is accepted. The plugin populates and reads the state itself through
    // setLocalState/setLocalStateField; the assertion is confined to this one
    // member — every other member of the adapter is structural.
    awareness: provider.awareness as unknown as ReturnType<LexicalProviderFactory>['awareness'],
    connect: () => provider.connect(),
    disconnect: () => provider.disconnect(),
    on,
    off,
  }
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

  const createWebsocketProvider = React.useCallback<LexicalProviderFactory>(
    (id, yjsDocMap) => {
      if (!multiplayerEndpoint || !multiplayerDocId) {
        throw new Error('<InklingComposer> enableMultiplayer requires both multiplayerEndpoint and multiplayerDocId')
      }

      let doc = yjsDocMap.get(id)

      if (doc === undefined) {
        doc = new Doc()
        yjsDocMap.set(id, doc)
      } else {
        doc.load()
      }

      const provider = new WebsocketProvider(multiplayerEndpoint, multiplayerDocId + '/' + id, doc, {
        connect: false,
      })

      if (multiplayerDebug) {
        provider.on('status', (event) => {
          console.warn(event.status, `id: ${multiplayerDocId}/${id}`)
        })
      }

      return adaptWebsocketProvider(provider)
    },
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

  const collaborationValue = React.useMemo(
    () => ({
      enableMultiplayer,
      multiplayerEndpoint,
      multiplayerDocId,
      multiplayerUsername,
      createWebsocketProvider,
    }),
    [createWebsocketProvider, enableMultiplayer, multiplayerDocId, multiplayerEndpoint, multiplayerUsername],
  )

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
                <InklingSelectedCardContext>
                  <TKContext>
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
                  </TKContext>
                </InklingSelectedCardContext>
              </InklingUiPrefsContext.Provider>
            </InklingCollaborationContext.Provider>
          </InklingHostIntegrationContext.Provider>
        </WordCountHandleContext.Provider>
      </DragDropHandleContext.Provider>
    </LexicalComposer>
  )
}

export default InklingComposer
