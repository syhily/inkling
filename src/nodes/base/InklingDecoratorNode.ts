import type { LexicalEditor } from 'lexical'

/* c8 ignore start */
import { DecoratorNode } from 'lexical'

import type { ExportDOMOptions, ExportDOMOutput } from '@/nodes/base/export-dom'

export class InklingDecoratorNode extends DecoratorNode<unknown> {
  static transform() {
    return null
  }

  decorate(): unknown {
    return null
  }
}

export type InklingCard = InklingDecoratorNode & {
  isInklingCard(): true
  exportDOM(editor: LexicalEditor, options?: ExportDOMOptions): ExportDOMOutput
  hasEditMode(): boolean
  // optional: the generated card classes do not define isEmpty
  isEmpty?(): boolean
}

export function $isInklingCard(node: unknown): node is InklingCard {
  if (!(node instanceof InklingDecoratorNode)) {
    return false
  }

  const card = node as Partial<InklingCard>

  return (
    typeof card.isInklingCard === 'function' && card.isInklingCard() === true && typeof card.exportDOM === 'function'
  )
}
/* c8 ignore end */
