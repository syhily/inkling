import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext'
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer'
import React from 'react'
import { WebsocketProvider } from 'y-websocket'
import { Doc } from 'yjs'

import type { LexicalProviderFactory } from '@/context/InklingCollaborationContext'
import type { CardConfig, FileUploader, FileUploaderInput } from '@/context/InklingHostIntegrationContext'

import InklingCollaborationContext from '@/context/InklingCollaborationContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { InklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { TKContext } from '@/context/TKContext'
import { DEFAULT_CONFIG } from '@/nodes/base'
import DEFAULT_NODES from '@/nodes/DefaultNodes'
import defaultTheme from '@/themes/default'
import { type InklingInitialEditorState, normalizeInitialEditorState } from '@/utils/normalizeInitialEditorState'

export type { InklingInitialEditorState }

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function defaultOnError(error: unknown, _info?: React.ErrorInfo) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(error)
  }
}

const defaultConfig = {
  namespace: 'InklingEditor',
  theme: defaultTheme,
  html: DEFAULT_CONFIG.html,
}

function hasFileUploadHook(fileUploader: FileUploaderInput): fileUploader is FileUploader {
  return 'useFileUpload' in fileUploader && typeof fileUploader.useFileUpload === 'function'
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

  const editorContainerRef = React.useRef(null)
  const onWordCountChangeRef = React.useRef(null)

  const normalizedFileUploader = React.useMemo<FileUploader>(() => {
    if (hasFileUploadHook(fileUploader)) {
      return fileUploader
    }

    return {
      ...fileUploader,
      useFileUpload(): ReturnType<FileUploader['useFileUpload']> {
        console.error(
          '<InklingComposer> requires a `fileUploader` prop object to be passed containing a `useFileUpload` custom hook',
        )
        return { upload: () => Promise.resolve(undefined) }
      },
    }
  }, [fileUploader])

  const createWebsocketProvider = React.useCallback<LexicalProviderFactory>(
    (id, yjsDocMap) => {
      let doc = yjsDocMap.get(id)

      if (doc === undefined) {
        doc = new Doc()
        yjsDocMap.set(id, doc)
      } else {
        doc.load()
      }

      const provider = new WebsocketProvider(multiplayerEndpoint!, multiplayerDocId + '/' + id, doc, {
        connect: false,
      })

      if (multiplayerDebug) {
        provider.on('status', (event) => {
          console.warn(event.status, `id: ${multiplayerDocId}/${id}`)
        })
      }

      // WebsocketProvider implements every Provider method Lexical calls at runtime
      // (awareness, connect, disconnect, on, off), but its `on`/`off` overloads only
      // accept the event names y-websocket itself emits, so it is not structurally
      // assignable to Lexical's Provider and needs a single assertion at this boundary
      return provider as unknown as ReturnType<LexicalProviderFactory>
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

  // legacy per-composer channels — plan 047 steps 3/5 replace these with
  // editor-side handles
  const composerContextValue = React.useMemo(
    () => ({
      editorContainerRef,
      onWordCountChangeRef,
    }),
    [editorContainerRef, onWordCountChangeRef],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <InklingHostIntegrationContext.Provider value={hostIntegrationValue}>
        <InklingCollaborationContext.Provider value={collaborationValue}>
          <InklingUiPrefsContext.Provider value={uiPrefsValue}>
            <InklingComposerContext.Provider value={composerContextValue}>
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
            </InklingComposerContext.Provider>
          </InklingUiPrefsContext.Provider>
        </InklingCollaborationContext.Provider>
      </InklingHostIntegrationContext.Provider>
    </LexicalComposer>
  )
}

export default InklingComposer
