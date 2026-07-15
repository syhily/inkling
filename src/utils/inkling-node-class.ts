import type { MenuItem } from '@/utils/buildCardMenu'

// Static-side contract of card node classes. Card nodes declare `static cardMenu`
// (menu metadata consumed by buildCardMenu) and optionally `static uploadType`
// (drag/drop mime-type lookup key in DragDropPastePlugin). Lexical's own typing
// only exposes Klass<LexicalNode>, whose static side is opaque — keep the cast
// contained in getCardNodeClass and narrow everywhere else with hasCardMenu.
export type CardMenu = MenuItem | MenuItem[]

export interface CardNodeClass {
  cardMenu?: CardMenu
  uploadType?: string
}

export interface CardMenuNodeClass extends CardNodeClass {
  cardMenu: CardMenu
}

export function getCardNodeClass(nodeClass: unknown): CardNodeClass {
  return nodeClass as CardNodeClass
}

export function hasCardMenu(nodeClass: CardNodeClass): nodeClass is CardMenuNodeClass {
  return Boolean(nodeClass.cardMenu)
}
