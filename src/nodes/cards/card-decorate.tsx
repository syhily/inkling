import type { LexicalNode } from 'lexical'
import type { ComponentType, ReactNode, SVGProps } from 'react'

import type { DecorateTargetSpec } from '@/nodes/cards/card-declaration'

import { CARD_DECLARATIONS, type CardNodeType } from '@/nodes/cards'
import { getHostCard } from '@/nodes/cards/host-card-registry'

import { render as renderAudioCard } from './decorate/audio'
import { render as renderBookmarkCard } from './decorate/bookmark'
import { render as renderButtonCard } from './decorate/button'
import { render as renderCalloutCard } from './decorate/callout'
import { render as renderCodeBlockCard } from './decorate/codeblock'
import { render as renderFileCard } from './decorate/file'
import { render as renderFootnoteDefinitionCard } from './decorate/footnotedefinition'
import { render as renderGalleryCard } from './decorate/gallery'
import { render as renderHeaderCard } from './decorate/header'
import { render as renderHorizontalRuleCard } from './decorate/horizontalrule'
import { IndicatorIcon as HtmlIndicatorIcon, render as renderHtmlCard } from './decorate/html'
import { render as renderImageCard } from './decorate/image'
import { render as renderMathCard } from './decorate/math'
import { render as renderToggleCard } from './decorate/toggle'
import { render as renderVideoCard } from './decorate/video'

/**
 * The React-bearing half of a card's decorate-target: the node→component
 * render (and the indicator icon, for the one card that has one). Each lives
 * in its per-card module under `@/nodes/cards/decorate` — it cannot live in
 * the declaration modules, which must stay React-free. Method-syntax `render`
 * keeps the per-card node parameter types (each module's `render` takes its
 * own wrapper node type) assignable here.
 */
interface CardDecorateModule {
  render(node: LexicalNode): ReactNode
  IndicatorIcon?: ComponentType<SVGProps<SVGSVGElement>>
}

/**
 * The per-card decorate modules, keyed by card node type with an exhaustive
 * `Record` so adding a declaration without its module fails typecheck. The
 * only hand-maintained pairing left; everything else is derived from
 * `CARD_DECLARATIONS`.
 */
const CARD_DECORATE_MODULES: Record<CardNodeType, CardDecorateModule> = {
  audio: { render: renderAudioCard },
  bookmark: { render: renderBookmarkCard },
  button: { render: renderButtonCard },
  callout: { render: renderCalloutCard },
  codeblock: { render: renderCodeBlockCard },
  file: { render: renderFileCard },
  footnotedefinition: { render: renderFootnoteDefinitionCard },
  gallery: { render: renderGalleryCard },
  header: { render: renderHeaderCard },
  horizontalrule: { render: renderHorizontalRuleCard },
  html: { render: renderHtmlCard, IndicatorIcon: HtmlIndicatorIcon },
  image: { render: renderImageCard },
  math: { render: renderMathCard },
  toggle: { render: renderToggleCard },
  video: { render: renderVideoCard },
}

/**
 * Wrapper-layer projection of the card declarations: each declaration paired
 * with the React-bearing half of its decorate-target. The indicator icon is
 * gated by the declaration's `decorateTarget.hasIndicatorIcon` flag (Html is
 * the only card with one). The shared adapter (`@/nodes/decorate-card`)
 * renders these through `InklingCardWrapper`.
 */
export const CARD_DECORATE_TARGETS = CARD_DECLARATIONS.map((declaration) => {
  // `in` narrows the union to the declarations carrying the optional decorate-target entry
  const decorateTarget: DecorateTargetSpec | undefined =
    'decorateTarget' in declaration ? declaration.decorateTarget : undefined
  const module = CARD_DECORATE_MODULES[declaration.nodeType]
  return {
    ...declaration,
    decorateTarget,
    render: module.render,
    IndicatorIcon: decorateTarget?.hasIndicatorIcon ? module.IndicatorIcon : undefined,
  }
})

const CARD_DECORATE_TARGETS_BY_TYPE = new Map(
  CARD_DECORATE_TARGETS.map((target): [string, (typeof CARD_DECORATE_TARGETS)[number]] => [target.nodeType, target]),
)

/**
 * The structural decorate-target type `getCardDecorateTarget` returns. The
 * built-in targets keep their precise per-card types in
 * `CARD_DECORATE_TARGETS` (the exhaustive `Record<CardNodeType, …>` guard
 * above is unchanged); the widened return type admits the host card registry
 * records (CONTEXT.md: "host card"), which carry the same facts resolved at
 * registration.
 */
export interface CardDecorateTarget {
  nodeType: string
  decorateTarget: DecorateTargetSpec | undefined
  render(node: LexicalNode): ReactNode
  IndicatorIcon?: ComponentType<SVGProps<SVGSVGElement>>
}

export function getCardDecorateTarget(nodeType: string): CardDecorateTarget | undefined {
  return CARD_DECORATE_TARGETS_BY_TYPE.get(nodeType) ?? getHostCard(nodeType)
}
