import type { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'

import React from 'react'

// derived from the installed component so it stays in sync with Lexical's own
// (unexported) ProviderFactory alias
export type LexicalProviderFactory = React.ComponentProps<typeof CollaborationPlugin>['providerFactory']

// Collaboration lifecycle: the only value consumers read from this context.
// InklingNestedComposer uses the factory to mount a CollaborationPlugin for
// each nested editor; everything else about multiplayer (enable flag,
// endpoint, doc id, username) is consumed directly from InklingComposer's
// props and never read back out of context.
export interface InklingCollaborationContextValue {
  createWebsocketProvider: LexicalProviderFactory
}

const InklingCollaborationContext = React.createContext<InklingCollaborationContextValue>({
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
