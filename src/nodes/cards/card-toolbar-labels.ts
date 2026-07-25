import { CARD_DECLARATIONS } from '@/nodes/cards'

/**
 * Derived view over the card declarations: the card's toolbar label — the
 * `data-inkling-card-toolbar` value `CardActionToolbar` renders on both of
 * its toolbars (a live CSS/e2e selector contract) — resolved by node type.
 * Callers key it by the node's own `getType()`, the same path
 * `data-inkling-card` takes, so the label cannot drift from the card it
 * annotates (the historical "signup" header label). CodeBlock ("code-block")
 * and File ("file-upload") deliberately diverge from their node types; the
 * divergence lives on the declarations as data, not in a transform here.
 */
export function getCardToolbarLabel(nodeType: string): string | undefined {
  return CARD_DECLARATIONS.find((declaration) => declaration.nodeType === nodeType)?.toolbarLabel
}
