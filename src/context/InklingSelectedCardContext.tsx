import React from 'react'

import { createCardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'

import { CardSelectionStoreContext } from './CardSelectionStoreContext'

export interface InklingSelectedCardContextValue {
  isDragging: boolean
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  showVisibilitySettings: boolean
  setShowVisibilitySettings: React.Dispatch<React.SetStateAction<boolean>>
}

const Context = React.createContext<InklingSelectedCardContextValue>({
  isDragging: false,
  setIsDragging: () => {},
  showVisibilitySettings: false,
  setShowVisibilitySettings: () => {},
})

export const InklingSelectedCardContext = ({ children }: { children: React.ReactNode }) => {
  // one card selection store per top-level composer (plan 038); the useState
  // initializer keeps the instance stable for the provider's lifetime
  const [cardSelectionStore] = React.useState(createCardSelectionStore)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const [showVisibilitySettings, setShowVisibilitySettings] = React.useState<boolean>(false)
  const contextValue = React.useMemo<InklingSelectedCardContextValue>(() => {
    return {
      isDragging,
      setIsDragging,
      showVisibilitySettings,
      setShowVisibilitySettings,
    }
  }, [isDragging, setIsDragging, showVisibilitySettings, setShowVisibilitySettings])

  return (
    <CardSelectionStoreContext.Provider value={cardSelectionStore}>
      <Context.Provider value={contextValue}>{children}</Context.Provider>
    </CardSelectionStoreContext.Provider>
  )
}

export const useInklingSelectedCardContext = () => React.useContext(Context)
