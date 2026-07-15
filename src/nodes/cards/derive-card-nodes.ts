import type { CardSurfaces } from './card-declaration'

interface DerivableCard {
  nodeType: string
  surfaces: CardSurfaces
}

/**
 * Derived-view helper for the card registries (plan 039) — the same runtime
 * reflection idiom as `getEditorCardNodes` (no codegen, no build step):
 * filters the card declarations to one editor surface, preserving
 * declaration order.
 *
 * When `order` is given, entries named in it come first in that sequence and
 * any remaining entries keep their declaration order after them. That pins a
 * registry's pre-declaration order while letting newly declared cards join
 * the registry without editing it.
 */
export function deriveCardNodes<T extends DerivableCard>(
  declarations: readonly T[],
  surface: keyof CardSurfaces,
  order?: readonly string[],
): T[] {
  const eligible = declarations.filter((declaration) => declaration.surfaces[surface])

  if (!order) {
    return eligible
  }

  const rank = new Map(order.map((nodeType, index) => [nodeType, index]))
  return eligible.sort((a, b) => (rank.get(a.nodeType) ?? order.length) - (rank.get(b.nodeType) ?? order.length))
}
