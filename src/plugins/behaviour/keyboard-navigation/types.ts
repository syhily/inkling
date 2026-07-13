export interface KeyboardNavigationDeps {
  selectedCardKey: string | null
  isEditingCard: boolean
  setIsEditingCard: (editing: boolean) => void
  isNested?: boolean
  cursorDidExitAtTop?: () => void
}
