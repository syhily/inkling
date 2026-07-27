import type { MultilineElementTransformer } from '@lexical/markdown'
import type { LexicalNode } from 'lexical'
import type { ComponentType, ReactNode, SVGProps } from 'react'

import type { CardNodeClass } from '@/nodes/assemble-card-node'
import type { CardDeclaration, CardIconId, CardMenuEntrySpec } from '@/nodes/cards/card-declaration'
import type { CardFencePayload } from '@/nodes/cards/card-markdown-transformers'
import type { HostCardRecord } from '@/nodes/cards/host-card-registry'
import type { MenuItem } from '@/utils/buildCardMenu'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { InklingDecoratorNode } from '@/nodes/base/InklingDecoratorNode'
import { CARD_DECLARATIONS } from '@/nodes/cards'
import { createCardTransformer } from '@/nodes/cards/card-markdown-transformers'
import { resolveCardIcon } from '@/nodes/cards/card-menus'
import { hasHostCard, registerHostCard } from '@/nodes/cards/host-card-registry'

/**
 * A host card's menu entry (CONTEXT.md: "host card"): the same shape as the
 * built-in declarations' `CardMenuEntrySpec`, except the icon may name a
 * built-in `CardIconId` or be an SVG component directly — host modules carry
 * no React-free layering constraint. The required `labelKey` matches the
 * built-in entries; the labels table is closed, so a host-defined key always
 * falls back to the entry's own English `label`/`desc` (a host localizes its
 * own card by writing the spec text directly).
 */
export type HostCardMenuEntrySpec = Omit<CardMenuEntrySpec, 'icon'> & {
  icon: CardIconId | ComponentType<SVGProps<SVGSVGElement>>
}

/**
 * The host card declaration (CONTEXT.md: "host card") — every
 * `CardDeclaration` field except `menu`/`dragIcon`/`markdown`, plus the
 * React half the built-in cards attach one layer up (their
 * `src/nodes/cards/decorate/*.tsx` modules). Both halves are declared in one
 * spec here. Build the `baseNode` with `generateDecoratorNode`
 * (`@/nodes/base/generate-decorator-node`) so the node satisfies the
 * InklingDecoratorNode contract the selection protocol and `exportDOM` gate
 * on.
 */
export interface HostCardSpec<NodeType extends string = string> extends Omit<
  CardDeclaration<NodeType>,
  'menu' | 'dragIcon' | 'markdown'
> {
  /** the decorate render — the built-in cards' `src/nodes/cards/decorate/*.tsx` counterpart */
  render(node: LexicalNode): ReactNode
  IndicatorIcon?: ComponentType<SVGProps<SVGSVGElement>>
  menu?: readonly HostCardMenuEntrySpec[]
  dragIcon?: CardIconId | ComponentType<SVGProps<SVGSVGElement>>
  /** carrying a fence payload opts the card into the markdown round-trip; the vocabulary matches the built-in `CARD_FENCE_PAYLOADS` */
  markdownFence?: CardFencePayload
}

/**
 * The handle `defineCard` returns: the assembled node class to compose into
 * `<InklingComposer nodes>`, and the fence transformer to pass to the
 * markdown round-trip's `cards` option when the spec carries `markdownFence`.
 */
export interface HostCard<NodeType extends string = string> {
  nodeType: NodeType
  /** the assembled card class — the host composes it into `<InklingComposer nodes>` */
  node: CardNodeClass<LexicalNode>
  /** present only when the spec carries `markdownFence`; passed to the markdown round-trip's `cards` option */
  markdownTransformer?: MultilineElementTransformer
}

/**
 * Declares a host card once and registers it with every derived view the
 * built-in declarations feed (CONTEXT.md: "host card"): the assembled node
 * class, the slash/plus menus, the decorate target, the insert-command
 * registrar, the toolbar label, and — with `markdownFence` — the markdown
 * round-trip. Call it at module top level, before the composer mounts
 * (mirroring Lexical `createCommand`'s global idiom); the derived views
 * intersect with each editor's registered node types, so host cards never
 * leak into surfaces that did not compose their node class in.
 */
export function defineCard<NodeType extends string>(spec: HostCardSpec<NodeType>): HostCard<NodeType> {
  // $isInklingCard gates on `instanceof InklingDecoratorNode` and the
  // exportDOM contract assumes the generated machinery — the honest boundary
  // is to require the base to extend it (build bases with
  // generateDecoratorNode).
  if (!(spec.baseNode.prototype instanceof InklingDecoratorNode)) {
    throw new Error(
      `[defineCard] '${spec.nodeType}': baseNode must extend InklingDecoratorNode (build it with generateDecoratorNode)`,
    )
  }

  if (CARD_DECLARATIONS.some((declaration) => declaration.nodeType === spec.nodeType) || hasHostCard(spec.nodeType)) {
    throw new Error(`[defineCard] '${spec.nodeType}': a card with this nodeType is already declared`)
  }

  const cardMenu: MenuItem[] | undefined = spec.menu?.map(({ icon, command, ...item }) => ({
    ...item,
    Icon: typeof icon === 'string' ? resolveCardIcon(icon) : icon,
    insertCommand: command,
  }))
  const dragIcon: MenuItem['Icon'] = spec.dragIcon
    ? typeof spec.dragIcon === 'string'
      ? resolveCardIcon(spec.dragIcon)
      : spec.dragIcon
    : cardMenu?.[0]?.Icon

  // Registered before assembly: the derived views (getCardMenu, read via
  // getEditorCardNodes at editor mount) must see the menu facts as soon as
  // the card exists. `node` is attached right after — the registry shares
  // the object, and its readers (the insert projection) run at editor mount.
  const record: HostCardRecord = {
    nodeType: spec.nodeType,
    node: undefined as unknown as CardNodeClass<LexicalNode>,
    cardMenu,
    dragIcon,
    decorateTarget: spec.decorateTarget,
    render: spec.render,
    IndicatorIcon: spec.decorateTarget?.hasIndicatorIcon ? spec.IndicatorIcon : undefined,
    insert: spec.insert,
    uploadType: spec.uploadType,
    toolbarLabel: spec.toolbarLabel,
  }
  registerHostCard(record)

  const node = assembleCardNodeOnce<LexicalNode>(spec)
  record.node = node

  const host: HostCard<NodeType> = { nodeType: spec.nodeType, node }
  if (spec.markdownFence) {
    host.markdownTransformer = createCardTransformer({ card: spec.nodeType, nodeClass: node, ...spec.markdownFence })
  }
  return host
}
