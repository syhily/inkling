/* c8 ignore start */
import type { ElementNode } from 'lexical'

import type { RendererOptions } from '@/html/renderer/types'
import type { RenderContext } from '@/nodes/base/render-context'

import asideTransformer from '@/html/renderer/transformers/element/aside'
import blockquoteTransformer from '@/html/renderer/transformers/element/blockquote'
import headingTransformer from '@/html/renderer/transformers/element/heading'
import listTransformer from '@/html/renderer/transformers/element/list'
import paragraphTransformer from '@/html/renderer/transformers/element/paragraph'
/* c8 ignore stop */

export type ExportChildren = (node: ElementNode, options?: RendererOptions) => string
export type ElementTransformer = {
  export: (
    node: ElementNode,
    options: RendererOptions,
    exportChildren: ExportChildren,
    context: RenderContext,
  ) => string | null
}

const elementTransformers: ElementTransformer[] = [
  paragraphTransformer,
  headingTransformer,
  listTransformer,
  blockquoteTransformer,
  asideTransformer,
]

export default elementTransformers
