import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify'

import type {
  ExportDOMDesignOptions,
  ExportDOMFeatureOptions,
  ExportDOMOptions,
  ImageOptimizationOptions,
} from '@/nodes/base/export-dom'

import { cleanDOM } from '@/nodes/base/utils/clean-dom'
import { escapeHtml } from '@/nodes/base/utils/escape-html'
import { isLocalContentImage as isLocalContentImageImpl } from '@/nodes/base/utils/is-local-content-image'
import { isSafeMediaUrl, isSafeUrl } from '@/nodes/base/utils/is-safe-url'
import { sanitizeHtml } from '@/utils/sanitize-html'

/**
 * The render-context seam (plan 040; the fold completed in plan 042): the
 * single read-only view of export-time policy and data, and the ONLY thing
 * card renderers receive besides the node. Before the seam, renderers
 * re-implemented URL allow-lists, sanitization, and render-target branching
 * ad hoc; this context is the one interface those policies converge behind.
 * The migration was incremental, one step per commit:
 *
 * - `safeUrl` is the URL policy (Step 3 migrates the hand-rolled
 *   `isSafeUrl`/`isSafeMediaUrl` call sites; `is-safe-url.ts` stays as the
 *   seam's private implementation).
 * - `isLocalContentImage` folds the `siteUrl`/`imageBaseUrl` forwarding into
 *   the context (Step 3b), so renderers can't drop an argument.
 * - `sanitizeCaption`/`sanitizeCardHtml` converge sanitization on DOMPurify
 *   (Step 4; named configs such as callout's land here). Two recorded STOP
 *   fallbacks from the Step-4 corpus diff live behind the seam too:
 *   `escapeText` (DOMPurify cannot reproduce `escapeHtml` for the video
 *   caption / audio email title corpus) and `CALLOUT_HTML_CONFIG` (DOMPurify
 *   cannot reproduce cleanDOM's per-tag attribute policy), each documented
 *   at its definition.
 * - `variant`/`requirePostUrl` unify the email/web branch idioms (Step 5;
 *   `requirePostUrl` preserves the pinned missing-postUrl error messages).
 *   `usesModernEmailButton` and the `isSafeColorValue`/`isEmailButtonColorValue`
 *   color predicates single-source the feature/design-flag and color checks
 *   that button and header previously duplicated inline.
 * - `createDocument` resolution absorbed the deleted `addCreateDocumentOption`
 *   helper (Step 6), and `trackIdAttribute` owns the heading-id dedup map the
 *   options bag's `usedIdAttributes` used to carry.
 * - Plan 042 completed the fold: renderers and transformers receive ONLY
 *   this context. The data fields it now also carries — `imageOptimization`
 *   (a frozen snapshot), the `canTransformImage*` callbacks (by reference),
 *   and `inklingVersion` — are documented at their declarations.
 *
 * The context is read-only: scalar fields are copied, `feature`/`design` are
 * frozen snapshots, and the object itself is frozen. The freeze is shallow —
 * nested values inside `feature`/`design` stay shared references and must not
 * carry mutable state. `trackIdAttribute` is the one exception to the
 * read-only surface: it mutates the id-dedup map, which is internal
 * per-render state the seam owns, not exposed policy. The context is cheap to
 * build, so callers construct it once per render pass (per `exportDOM` call
 * in the card dispatch, per `$convertToHtmlString` run in the string layer)
 * and never share it across renders — which is exactly why the per-render id
 * map is safe.
 *
 * Card sources must not import the policy modules (`is-safe-url`,
 * `escape-html`, `clean-dom`, `sanitize-html`) directly — the shrink-only
 * allowlist in `test/nodes-base/nodes/render-policy-imports.test.ts` enforces
 * the seam.
 */

export type SafeUrlKind = 'navigation' | 'media'

/**
 * A `sanitizeCardHtml` config that selects the cleanDOM unwrap-allowlist
 * fallback instead of DOMPurify. The attribute rules (A[href] re-validated
 * with the URL policy, CODE[style] constrained by CODE_STYLE_REGEX) are
 * cleanDOM's own defaults in `clean-dom.ts` — the config names only the tag
 * allowlist so the rules stay single-sourced.
 */
export interface UnwrapAllowlistConfig {
  readonly implementation: 'unwrap-allowlist'
  readonly allowedTags: string[]
}

/**
 * A DOMPurify config whose `sanitize()` still returns a string. Omitting
 * the DOM/fragment/trusted-type return keys keeps the seam's string return
 * honest: DOMPurify's own overloads then resolve the `string` signature
 * directly (dompurify 3.x ships overloads keyed on those config flags).
 * Structurally a pre-typed `Config` variable still assigns in — the seam
 * guards the literal case, which is how configs are passed in-repo.
 */
export type SanitizeToStringConfig = Omit<DOMPurifyConfig, 'RETURN_DOM' | 'RETURN_DOM_FRAGMENT' | 'RETURN_TRUSTED_TYPE'>

export type CardHtmlConfig = SanitizeToStringConfig | UnwrapAllowlistConfig

/**
 * Callout's nested-editor allowlist, kept behind cleanDOM as a named
 * fallback (plan 040 Step 4 STOP condition). A plain DOMPurify config
 * (`ALLOWED_TAGS`/`ALLOWED_ATTR`, with or without `FORBID_CONTENTS: []`)
 * cannot reproduce cleanDOM's output on the pinned callout corpus:
 *
 * - DOMPurify's `ALLOWED_ATTR` is global, not per-tag — it keeps
 *   `style="background:red"` on MARK and `style="position:fixed;inset:0"` on
 *   CODE, which cleanDOM strips (MARK allows no attributes; CODE[style] must
 *   match `white-space: pre-wrap`).
 * - DOMPurify drops `<script>` contents; cleanDOM unwraps the tag and keeps
 *   its text (`<div><span><script>alert(1)</script>text</span></div>` →
 *   `alert(1)text`). `FORBID_CONTENTS: []` fixes that but not the per-tag
 *   attribute policy.
 */
export const CALLOUT_HTML_CONFIG: UnwrapAllowlistConfig = {
  implementation: 'unwrap-allowlist',
  allowedTags: ['A', 'STRONG', 'EM', 'B', 'I', 'BR', 'CODE', 'MARK', 'S', 'DEL', 'U', 'SUP', 'SUB'],
}

function isUnwrapAllowlistConfig(config: CardHtmlConfig): config is UnwrapAllowlistConfig {
  return 'implementation' in config && config.implementation === 'unwrap-allowlist'
}

/**
 * Color validation, single-sourced here (plan 040 Step 5): one regex shared
 * by two documented predicates. Accepts hex, rgb/rgba, and CSS named colors;
 * rejects arbitrary strings to keep style values safe in email clients.
 *
 * `isSafeColorValue` is the general check. `isEmailButtonColorValue`
 * additionally rejects `'transparent'` — that rejection is email-button-only
 * on purpose: the header renderer uses `'transparent'` as a legitimate
 * fallback value (header/renderers/header-renderer.ts), so it must not move
 * into the shared regex.
 */
const COLOR_VALUE_REGEX =
  /^#[0-9a-fA-F]{3,8}$|^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$|^[a-zA-Z]+$/

/** The general color-value check (header's `safeColor` fallback helper). */
export function isSafeColorValue(value: string): boolean {
  return COLOR_VALUE_REGEX.test(value)
}

/** The email-button check: the general predicate plus a `'transparent'` rejection. */
export function isEmailButtonColorValue(value: string): boolean {
  return COLOR_VALUE_REGEX.test(value) && value !== 'transparent'
}

function isContentImageSizes(value: unknown): value is Record<string, { width: number }> {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return Object.values(value).every(
    (entry) => typeof entry === 'object' && entry !== null && typeof entry.width === 'number',
  )
}

/**
 * Validates the host-supplied imageOptimization bag into the typed snapshot:
 * each documented key is copied only when its runtime type matches, so a
 * mistyped host option degrades to "absent" (the consumers' documented
 * fallback path) instead of being frozen into the context as a lie. The
 * `ImageOptimizationOptions` type itself lives in `@/nodes/base/export-dom`
 * next to `ExportDOMOptions`.
 */
function readImageOptimization(bag: ImageOptimizationOptions): ImageOptimizationOptions {
  const validated: ImageOptimizationOptions = {}
  if (typeof bag.defaultMaxWidth === 'number') {
    validated.defaultMaxWidth = bag.defaultMaxWidth
  }
  if (isContentImageSizes(bag.contentImageSizes)) {
    validated.contentImageSizes = bag.contentImageSizes
  }
  if (typeof bag.srcsets === 'boolean') {
    validated.srcsets = bag.srcsets
  }
  return validated
}

export interface RenderContext {
  /** The render target exactly as passed via `options.target` (e.g. `'email'`) — never normalized. */
  readonly target: string | undefined
  readonly imageBaseUrl: string | undefined
  readonly siteUrl: string | undefined
  readonly postUrl: string | undefined
  /** Frozen snapshot of the image-optimization bag (absent when not passed). */
  readonly imageOptimization: ImageOptimizationOptions | undefined
  readonly canTransformImage: ((src: string) => boolean) | undefined
  readonly canTransformImageToFormat: ((format: string) => boolean) | undefined
  /** The markdown card's slug-policy input, consumed by `@/markdown/paste-dialect`. */
  readonly inklingVersion: string | undefined
  /** Frozen snapshots of the feature/design option bags (absent when not passed). */
  readonly feature: Readonly<ExportDOMFeatureOptions> | undefined
  readonly design: Readonly<ExportDOMDesignOptions> | undefined
  /** Resolved once: `options.createDocument` / `options.dom` / the browser global, in that order. */
  readonly createDocument: () => Document
  /** URL policy: returns `value` when it is safe for `kind`, `''` otherwise. */
  safeUrl(kind: SafeUrlKind, value: string): string
  /**
   * Local-content check using the context's own `siteUrl`/`imageBaseUrl` —
   * callers can no longer forget to forward them (the `b87ecc1` bug class).
   */
  isLocalContentImage(url: string): boolean
  /** Caption sanitization, routed through the DOMPurify-backed `sanitizeHtml`. */
  sanitizeCaption(html: string): string
  /**
   * Plain-text template escaping — the single escaping path behind the seam.
   * Introduced for the fields whose pinned output is `escapeHtml`'s (video
   * captions, the audio email title); plan 041 routed every card renderer's
   * template escaping through it. Recorded divergence (plan 040
   * Step 4 STOP condition): the DOMPurify caption path cannot reproduce
   * `escapeHtml` on the pinned corpus — it preserves benign inline markup
   * (`This is a <b>caption</b>` keeps `<b>` instead of escaping it), strips
   * `<img onerror>` down to `<img>`, rewrites `<script>` to the
   * `js-embed-placeholder` `<pre>`, and does not entity-escape `&`/quotes.
   * The `escape-html.ts` implementation therefore stays, behind this seam.
   */
  escapeText(value: string): string
  /**
   * Card-HTML sanitization with an explicit named config. DOMPurify configs
   * run through DOMPurify; `unwrap-allowlist` configs run through the
   * cleanDOM fallback (see `CALLOUT_HTML_CONFIG`).
   */
  sanitizeCardHtml(html: string, config: CardHtmlConfig): string
  /** The one render-target branch helper: picks `email` when `target === 'email'`, `web` otherwise. */
  variant<T>(branches: { web: T; email: T }): T
  /** Returns `postUrl`, or throws the pinned missing-postUrl error naming `caller`. */
  requirePostUrl(caller: string): string
  /**
   * The modern email-button predicate, single-sourced here (plan 040 Step 5)
   * from the copies button-renderer and header-renderer previously kept
   * inline: true when the `emailCustomization`/`emailCustomizationAlpha`
   * feature flags or a `design.buttonStyle` are set.
   */
  usesModernEmailButton(): boolean
  /**
   * Heading-id deduplication, folded in from the options bag's
   * `usedIdAttributes` (plan 040 Step 6): records one use of the slugified
   * base `id` and returns the id to emit — the base id on first use,
   * `<id>-<n>` on repeats. The one mutable-state method on the context; the
   * map is internal per-render state, safe because a context is never shared
   * across renders.
   */
  trackIdAttribute(id: string): string
}

/**
 * Resolves the document factory for one render pass: `options.createDocument`
 * / `options.dom` / the browser global, in that order. This absorbs the
 * deleted `addCreateDocumentOption` helper (plan 040 Step 6) — the options bag
 * is read, never mutated — preserving its exact non-browser throw. The
 * browser-global fallback is covered by the seam tests via stubbed globals.
 */
function resolveCreateDocument(options: ExportDOMOptions): () => Document {
  if (options.createDocument) {
    // A truthy non-function `createDocument` is a caller bug. The pinned
    // TypeError message names the historical caller — the check lived in the
    // markdown renderer (test/nodes-base/nodes/markdown.test.ts pins the exact
    // message) before plan 042 moved it into the factory.
    if (typeof options.createDocument !== 'function') {
      throw new TypeError('renderMarkdownNode requires options.createDocument to be a function')
    }
    return options.createDocument
  }

  if (options.dom) {
    const dom = options.dom
    return function () {
      return dom.window.document
    }
  }

  const document = typeof window !== 'undefined' && window.document

  if (!document) {
    throw new Error('Must be passed a `createDocument` function as an option when used in a non-browser environment')
  }

  return function () {
    return document
  }
}

/**
 * Builds the read-only render context for one render pass.
 */
export function createRenderContext(options: ExportDOMOptions): RenderContext {
  const createDocument = resolveCreateDocument(options)
  const usedIdAttributes: Record<string, number> = {}

  const target = options.target
  const postUrl = options.postUrl
  const siteUrl = options.siteUrl
  const imageBaseUrl = options.imageBaseUrl
  const feature = options.feature ? Object.freeze({ ...options.feature }) : undefined
  const design = options.design ? Object.freeze({ ...options.design }) : undefined
  const imageOptimization = options.imageOptimization
    ? Object.freeze(readImageOptimization(options.imageOptimization))
    : undefined

  const context: RenderContext = {
    target,
    imageBaseUrl,
    siteUrl,
    postUrl,
    imageOptimization,
    canTransformImage: options.canTransformImage,
    canTransformImageToFormat: options.canTransformImageToFormat,
    inklingVersion: options.inklingVersion,
    feature,
    design,
    createDocument,
    safeUrl(kind, value) {
      return (kind === 'media' ? isSafeMediaUrl(value) : isSafeUrl(value)) ? value : ''
    },
    isLocalContentImage(url) {
      // `undefined` siteUrl/imageBaseUrl hit the same `''` defaults inside
      // is-local-content-image as the old per-call-site forwarding did.
      return isLocalContentImageImpl(url, siteUrl, imageBaseUrl)
    },
    sanitizeCaption(html) {
      return sanitizeHtml(html)
    },
    escapeText(value) {
      return escapeHtml(value)
    },
    sanitizeCardHtml(html, config) {
      if (isUnwrapAllowlistConfig(config)) {
        const container = createDocument().createElement('div')
        container.innerHTML = html
        cleanDOM(container, config.allowedTags, context)
        return container.innerHTML
      }
      return DOMPurify.sanitize(html, config)
    },
    variant<T>({ web, email }: { web: T; email: T }): T {
      return target === 'email' ? email : web
    },
    requirePostUrl(caller) {
      // Predicate matches the video/audio renderer guards this absorbs in
      // Step 5 (`typeof postUrl === 'string' && postUrl.trim() !== ''`) — a
      // whitespace-only postUrl must throw, not pass through.
      if (!postUrl || postUrl.trim() === '') {
        throw new Error(`${caller} requires options.postUrl when options.target is "email"`)
      }
      return postUrl
    },
    usesModernEmailButton() {
      return Boolean(feature?.emailCustomization || feature?.emailCustomizationAlpha || design?.buttonStyle)
    },
    trackIdAttribute(id) {
      const seen = usedIdAttributes[id]
      if (seen === undefined) {
        usedIdAttributes[id] = 1
        return id
      }
      usedIdAttributes[id] = seen + 1
      return `${id}-${seen}`
    },
  }

  return Object.freeze(context)
}
