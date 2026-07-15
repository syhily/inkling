import type { DOMExportOutput as LexicalDOMExportOutput } from 'lexical'

export type ExportDOMOutputType = 'inner' | 'outer' | 'value'
export type ExportDOMElement = LexicalDOMExportOutput['element']

export type ExportDOMOutput<TType extends ExportDOMOutputType = ExportDOMOutputType> = LexicalDOMExportOutput & {
  type: TType
}

export interface ExportDOMFeatureOptions {
  emailCustomization?: boolean
  emailCustomizationAlpha?: boolean
  [key: string]: unknown
}

export interface ExportDOMDom {
  window: { document: Document }
}

export interface ExportDOMDesignOptions {
  buttonStyle?: 'fill' | 'outline'
  [key: string]: unknown
}

export interface ExportDOMOptionsBase {
  createDocument?: () => Document
  dom?: ExportDOMDom
  target?: string
  postUrl?: string
  siteUrl?: string
  siteUuid?: string
  imageBaseUrl?: string
  canTransformImage?: (src: string) => boolean
  canTransformImageToFormat?: (format: string) => boolean
  imageOptimization?: Record<string, unknown>
  feature?: ExportDOMFeatureOptions
  design?: ExportDOMDesignOptions
}

/**
 * The public export-options input type: the typed `ExportDOMOptionsBase`
 * fields plus an open bag. Custom renderers and the image/markdown render
 * options carry extra keys through the bag, so the index signature stays on
 * the public type; the base omits it so internal code that only reads the
 * typed fields (e.g. the render-context factory) gets real typo-checking
 * (plan 040 Step 6).
 */
export type ExportDOMOptions = ExportDOMOptionsBase & { [key: string]: unknown }
