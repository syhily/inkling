import type { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'

import React from 'react'

// derived from the installed component so it stays in sync with Lexical's own
// (unexported) ProviderFactory alias
export type LexicalProviderFactory = React.ComponentProps<typeof CollaborationPlugin>['providerFactory']

// Collaboration lifecycle (plan 047). The four multiplayer fields are
// write-only: InklingComposer places them here but no consumer reads them
// from this context — only createWebsocketProvider is consumed (by
// InklingNestedComposer). They are grouped under collaboration, their only
// reader's lifecycle.
export interface InklingCollaborationContextValue {
  enableMultiplayer: boolean
  multiplayerEndpoint?: string
  multiplayerDocId?: string
  multiplayerUsername?: string
  createWebsocketProvider: LexicalProviderFactory
}

const InklingCollaborationContext = React.createContext<InklingCollaborationContextValue>({
  enableMultiplayer: false,
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
})

export default InklingCollaborationContext
