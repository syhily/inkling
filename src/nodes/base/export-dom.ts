import type { DOMExportOutput as LexicalDOMExportOutput } from 'lexical'

export type ExportDOMOutputType = 'inner' | 'outer' | 'value'
export type ExportDOMElement = LexicalDOMExportOutput['element']

export type ExportDOMOutput<TType extends ExportDOMOutputType = ExportDOMOutputType> = LexicalDOMExportOutput & {
  type: TType
}

export interface ExportDOMDom {
  window: { document: Document }
}

/**
 * The image-optimization keys the image/gallery renderers and the srcset
 * helper consume, single-sourced here (plan 042) from the three renderer-local
 * declarations it replaces. The render-context factory validates the known
 * keys into a frozen snapshot (mistyped keys from untyped hosts are dropped,
 * never frozen in); the type is closed so in-repo callers get typo-checking.
 */
export interface ImageOptimizationOptions {
  defaultMaxWidth?: number
  contentImageSizes?: Record<string, { width: number }>
  srcsets?: boolean
}

/**
 * The public export-options input type — the typed fields only, no open bag.
 * An option name outside this list fails typecheck instead of being silently
 * ignored. The one normalization point for untyped input is
 * `createRenderContext` (`@/nodes/base/render-context`): it reads exactly
 * these keys, so runtime extra keys from JS hosts pass through harmlessly
 * without the type having to admit them. (The former
 * `ExportDOMOptionsBase & { [key: string]: unknown }` pair — two types for
 * one concept — collapsed into this single closed type.)
 */
export interface ExportDOMOptions {
  createDocument?: () => Document
  dom?: ExportDOMDom
  siteUrl?: string
  imageBaseUrl?: string
  canTransformImage?: (src: string) => boolean
  canTransformImageToFormat?: (format: string) => boolean
  imageOptimization?: ImageOptimizationOptions
  /**
   * The markdown card's slug-policy input (consumed by
   * `@/markdown/paste-dialect`).
   */
  inklingVersion?: string
  /** image renderer: emit `<picture>` sources for modern formats */
  pictureImageFormats?: boolean
}
