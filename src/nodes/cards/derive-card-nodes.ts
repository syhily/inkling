interface DerivableCard {
  nodeType: string
  markdown: boolean
}

/**
 * Derived-view helpers for the card registries (plan 039) — the same runtime
 * reflection idiom as `getEditorCardNodes` (no codegen, no build step).
 *
 * `deriveCardNodes` filters the card declarations to the markdown round-trip
 * surface, preserving declaration order. `orderCardNodes` pins a registry's
 * pre-declaration order: entries named in `order` come first in that
 * sequence and any remaining entries keep their declaration order after
 * them, so newly declared cards join a registry without editing it.
 */
export function deriveCardNodes<T extends DerivableCard>(declarations: readonly T[], order?: readonly string[]): T[] {
  const eligible = declarations.filter((declaration) => declaration.markdown)

  if (!order) {
    return eligible
  }

  return orderCardNodes(eligible, order)
}

export function orderCardNodes<T extends { nodeType: string }>(
  declarations: readonly T[],
  order: readonly string[],
): T[] {
  const rank = new Map(order.map((nodeType, index) => [nodeType, index]))
  return [...declarations].sort(
    (a, b) => (rank.get(a.nodeType) ?? order.length) - (rank.get(b.nodeType) ?? order.length),
  )
}
