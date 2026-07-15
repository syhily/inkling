import type { DOMExportOutput as LexicalDOMExportOutput } from 'lexical'

export type ExportDOMOutputType = 'inner' | 'outer' | 'value' | 'html'
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
  [key: string]: unknown
}

export type ExportDOMOptions = ExportDOMOptionsBase
