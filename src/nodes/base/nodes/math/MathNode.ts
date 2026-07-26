import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { renderMathNode } from '@/nodes/base/nodes/math/math-renderer'

const mathProperties = [
  { name: 'tex', default: '', wordCount: true },
  // Server-prerendered artifacts (KaTeX MathML / SVG), carried opaquely —
  // inkling never runs KaTeX (CSP); the host fills them on save.
  { name: 'mathml', default: '', urlType: 'html' },
  { name: 'svg', default: '', urlType: 'html' },
] as const satisfies readonly DecoratorNodeProperty[]

export type MathData = DecoratorNodeData<typeof mathProperties>

export interface BaseMathNode extends DecoratorNodeValueMap<typeof mathProperties> {}

export class BaseMathNode extends generateDecoratorNode({
  nodeType: 'math',
  properties: mathProperties,
  defaultRenderFn: renderMathNode,
}) {
  // The artifacts describe the current source: reassigning `tex` to a
  // different value invalidates the prerendered `mathml`/`svg` (the
  // node-level equivalent of kobato's stripPrerenderArtifacts, the same
  // invariant BaseCodeBlockNode keeps for `highlightedHtml`). The constructor
  // and importJSON assign the private fields directly, so a host-filled
  // artifact survives deserialization and cloning; only edits clear it.
  get tex(): string {
    return this.getLatest().__tex
  }

  set tex(value: string) {
    const writable = this.getWritable()
    if (writable.__tex !== value) {
      writable.__mathml = ''
      writable.__svg = ''
    }
    writable.__tex = value
  }

  isEmpty() {
    return !this.__tex
  }
}

export function $createBaseMathNode(dataset: MathData = {}) {
  return new BaseMathNode(dataset)
}

export function $isMathNode(node: unknown): node is BaseMathNode {
  return node instanceof BaseMathNode
}
