import React from 'react'

// UI-preference lifecycle (plan 047): display toggles that re-render the
// editor chrome but never change document behaviour.
export interface InklingUiPrefsContextValue {
  darkMode: boolean
  isTKEnabled?: boolean
}

const InklingUiPrefsContext = React.createContext<InklingUiPrefsContextValue>({
  darkMode: false,
})

export default InklingUiPrefsContext
