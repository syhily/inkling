import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify'

import type { ExportDOMDesignOptions, ExportDOMFeatureOptions, ExportDOMOptions } from '@/nodes/base/export-dom'

import { addCreateDocumentOption } from '@/nodes/base/utils/add-create-document-option'
import { cleanDOM } from '@/nodes/base/utils/clean-dom'
import { escapeHtml } from '@/nodes/base/utils/escape-html'
import { isLocalContentImage as isLocalContentImageImpl } from '@/nodes/base/utils/is-local-content-image'
import { isSafeMediaUrl, isSafeUrl } from '@/nodes/base/utils/is-safe-url'
import { sanitizeHtml } from '@/utils/sanitize-html'

/**
 * The render-context seam (plan 040): the single read-only view of export-time
 * policy that every card renderer receives alongside the legacy options bag.
 * Renderers currently re-implement URL allow-lists, sanitization, and
 * render-target branching ad hoc; this context is the one interface those
 * policies converge behind. Migration is incremental, one step per commit:
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
 * - `createDocument` resolution absorbs `addCreateDocumentOption` (Step 6
 *   deletes that function and folds the remaining options-bag state in).
 *
 * The context is read-only: scalar fields are copied, `feature`/`design` are
 * frozen snapshots, and the object itself is frozen. The freeze is shallow —
 * nested values inside `feature`/`design` stay shared references and must not
 * carry mutable state. The context is cheap to build, so callers construct it
 * once per render pass (per `exportDOM` call in the card dispatch, per
 * `$convertToHtmlString` run in the string layer) and never share it across
 * renders.
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

export type CardHtmlConfig = DOMPurifyConfig | UnwrapAllowlistConfig

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

export interface RenderContext {
  /** The render target exactly as passed via `options.target` (e.g. `'email'`) — never normalized. */
  readonly target: string | undefined
  readonly imageBaseUrl: string | undefined
  readonly siteUrl: string | undefined
  readonly postUrl: string | undefined
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
   * Plain-text escaping for fields whose pinned output is `escapeHtml`'s
   * (video captions, the audio email title). Recorded divergence (plan 040
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
}

/**
 * Builds the read-only render context for one render pass.
 *
 * `createDocument` resolution currently delegates to `addCreateDocumentOption`
 * (which mutates `options` — renderers still call it themselves until Step 6),
 * preserving its exact non-browser throw. Step 6 absorbs that logic here and
 * deletes the function.
 */
export function createRenderContext(options: ExportDOMOptions): RenderContext {
  addCreateDocumentOption(options)
  const createDocument = options.createDocument!

  const target = options.target
  const postUrl = options.postUrl
  const siteUrl = options.siteUrl
  const imageBaseUrl = options.imageBaseUrl
  const feature = options.feature ? Object.freeze({ ...options.feature }) : undefined
  const design = options.design ? Object.freeze({ ...options.design }) : undefined

  const context: RenderContext = {
    target,
    imageBaseUrl,
    siteUrl,
    postUrl,
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
      return DOMPurify.sanitize(html, config) as string
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
  }

  return Object.freeze(context)
}
