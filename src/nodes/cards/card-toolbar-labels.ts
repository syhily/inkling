import { resolveCardFacts } from '@/nodes/cards/card-facts'

/**
 * Derived view over the card declarations: the card's toolbar label — the
 * `data-inkling-card-toolbar` value `CardActionToolbar` renders on both of
 * its toolbars (a live CSS/e2e selector contract) — resolved by node type.
 * The built-in-first / host-fallback merge lives in
 * `@/nodes/cards/card-facts`; this view only projects the label field.
 * Callers key it by the node's own `getType()`, the same path
 * `data-inkling-card` takes, so the label cannot drift from the card it
 * annotates (the historical "signup" header label). CodeBlock ("code-block")
 * and File ("file-upload") deliberately diverge from their node types; the
 * divergence lives on the declarations as data, not in a transform here.
 */
export function getCardToolbarLabel(nodeType: string): string | undefined {
  const facts = resolveCardFacts(nodeType)
  return facts?.source === 'builtin' ? facts.declaration.toolbarLabel : facts?.host.toolbarLabel
}
