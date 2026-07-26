import type { LexicalNode } from 'lexical'
import type { ComponentType, ReactNode, SVGProps } from 'react'

import type { CardNodeClass } from '@/nodes/assemble-card-node'
import type { CardInsertSpec, CardUploadType, DecorateTargetSpec } from '@/nodes/cards/card-declaration'
import type { MenuItem } from '@/utils/buildCardMenu'

/**
 * One registered host card (CONTEXT.md: "host card") as registry facts: the
 * assembled node class plus the resolved projections the derived views fall
 * back to when the built-in declarations miss. Every icon is already
 * resolved to its component (id and component inputs alike) and
 * `IndicatorIcon` is already gated by `decorateTarget.hasIndicatorIcon`, so
 * the views read the record verbatim.
 */
export interface HostCardRecord {
  nodeType: string
  /** the assembled class the host composes into `<InklingComposer nodes>` */
  node: CardNodeClass<LexicalNode>
  /** resolved menu entries — icon ids bound to components, entry commands bound as `insertCommand` */
  cardMenu: MenuItem[] | undefined
  /** resolved drag-preview icon (the spec's `dragIcon` ?? the first menu entry's icon) */
  dragIcon: MenuItem['Icon']
  decorateTarget: DecorateTargetSpec | undefined
  render(node: LexicalNode): ReactNode
  IndicatorIcon?: ComponentType<SVGProps<SVGSVGElement>>
  insert: CardInsertSpec | undefined
  uploadType: CardUploadType | undefined
  toolbarLabel: string
}

// Module-level registry, mirroring Lexical `createCommand`'s global idiom:
// hosts call `defineCard` at module top level, before their composer mounts.
// Kept in its own module with a type-only import closure — the derived views
// (card-menus, card-decorate, …) read it from inside module-init assembly
// paths, so it must never pull in the wrapper layer at runtime.
const HOST_CARDS_BY_TYPE = new Map<string, HostCardRecord>()
const HOST_CARDS: HostCardRecord[] = []

export function getHostCard(nodeType: string): HostCardRecord | undefined {
  return HOST_CARDS_BY_TYPE.get(nodeType)
}

export function getHostCards(): readonly HostCardRecord[] {
  return HOST_CARDS
}

export function hasHostCard(nodeType: string): boolean {
  return HOST_CARDS_BY_TYPE.has(nodeType)
}

/**
 * Registers the record `defineCard` built. Stored by reference: `defineCard`
 * attaches the assembled `node` right after registration — the assembly-time
 * `getCardMenu` lookup reads only the menu facts, and the insert projection
 * reads `node` at editor mount, long after `defineCard` returns.
 */
export function registerHostCard(record: HostCardRecord): void {
  HOST_CARDS_BY_TYPE.set(record.nodeType, record)
  HOST_CARDS.push(record)
}
