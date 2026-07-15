import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify'

import type { ExportDOMDesignOptions, ExportDOMFeatureOptions, ExportDOMOptions } from '@/nodes/base/export-dom'

import { addCreateDocumentOption } from '@/nodes/base/utils/add-create-document-option'
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
 * - `sanitizeCaption`/`sanitizeCardHtml` converge sanitization on DOMPurify
 *   (Step 4; named configs such as callout's land here).
 * - `variant`/`requirePostUrl` unify the email/web branch idioms (Step 5;
 *   `requirePostUrl` preserves the pinned missing-postUrl error messages).
 * - `createDocument` resolution absorbs `addCreateDocumentOption` (Step 6
 *   deletes that function and folds the remaining options-bag state in).
 *
 * The context is read-only: scalar fields are copied, `feature`/`design` are
 * frozen snapshots, and the object itself is frozen. It is cheap to build, so
 * callers construct it once per render pass (per `exportDOM` call in the card
 * dispatch, per `$convertToHtmlString` run in the string layer) and never
 * share it across renders.
 */

export type SafeUrlKind = 'navigation' | 'media'

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
  /** Caption sanitization, routed through the DOMPurify-backed `sanitizeHtml`. */
  sanitizeCaption(html: string): string
  /** Card-HTML sanitization with an explicit DOMPurify config (Step 4 names the configs). */
  sanitizeCardHtml(html: string, config: DOMPurifyConfig): string
  /** The one render-target branch helper: picks `email` when `target === 'email'`, `web` otherwise. */
  variant<T>(branches: { web: T; email: T }): T
  /** Returns `postUrl`, or throws the pinned missing-postUrl error naming `caller`. */
  requirePostUrl(caller: string): string
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

  const context: RenderContext = {
    target,
    imageBaseUrl: options.imageBaseUrl,
    siteUrl: options.siteUrl,
    postUrl,
    feature: options.feature ? Object.freeze({ ...options.feature }) : undefined,
    design: options.design ? Object.freeze({ ...options.design }) : undefined,
    createDocument,
    safeUrl(kind, value) {
      return (kind === 'media' ? isSafeMediaUrl(value) : isSafeUrl(value)) ? value : ''
    },
    sanitizeCaption(html) {
      return sanitizeHtml(html)
    },
    sanitizeCardHtml(html, config) {
      return DOMPurify.sanitize(html, config) as string
    },
    variant<T>({ web, email }: { web: T; email: T }): T {
      return target === 'email' ? email : web
    },
    requirePostUrl(caller) {
      if (!postUrl) {
        throw new Error(`${caller} requires options.postUrl when options.target is "email"`)
      }
      return postUrl
    },
  }

  return Object.freeze(context)
}
