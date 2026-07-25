import type { ElementNode, LexicalEditor, LexicalNode } from 'lexical'

import { $isLinkNode } from '@lexical/link'
import { $getRoot, $isElementNode, $isLineBreakNode, $isParagraphNode, $isTextNode } from 'lexical'

import type { ExportDOMOptions } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'

import elementTransformers from '@/html/renderer/transformers/index'
import TextContent from '@/html/renderer/utils/TextContent'
import { $isInklingCard } from '@/nodes/base'
import { createRenderContext } from '@/nodes/base/render-context'

export default function $convertToHtmlString(editor: LexicalEditor, options: ExportDOMOptions = {}): string {
  const output: string[] = []
  const children: LexicalNode[] = $getRoot().getChildren()

  // One read-only render context per string render — the only export-time
  // view the element transformers and TextContent receive (plan 042). Card
  // exportDOM builds its own context per call.
  //
  // The string layer itself stays verbatim — that is a deliberate design
  // decision, not an oversight. Sanitization happens inside the card
  // renderers via the render context (`sanitizeBasicHtml` / `sanitizeCardHtml`
  // / `escapeText`) before markup reaches this layer, so the innerHTML /
  // outerHTML / value concatenation below needs no sanitize pass of its own.
  // Do NOT add a blanket sanitize here: it would double-escape markup the
  // renderers already sanitized.
  const context = createRenderContext(options)

  for (const child of children) {
    const result = exportTopLevelElementOrDecorator(child, editor, options, context)

    if (result !== null) {
      output.push(result)
    }
  }

  // Inkling keeps a blank paragraph at the end of a doc but we want to
  // make sure it doesn't get rendered
  const lastChild = children[children.length - 1]
  if (lastChild && $isParagraphNode(lastChild) && lastChild.getTextContent().trim() === '') {
    output.pop()
  }

  return output.join('')
}

function exportTopLevelElementOrDecorator(
  node: LexicalNode,
  editor: LexicalEditor,
  options: ExportDOMOptions,
  context: RenderContext,
): string | null {
  if ($isInklingCard(node)) {
    const { element, type } = node.exportDOM(editor, options)

    switch (type) {
      case 'inner':
        return getElementInnerHTML(element)
      case 'value':
        if (element && 'value' in element && typeof element.value === 'string') {
          return element.value
        }

        return ''
      default:
        return getElementOuterHTML(element)
    }
  }

  if ($isElementNode(node)) {
    for (const transformer of elementTransformers) {
      const result = transformer.export(node, (_node) => exportChildren(_node, context), context)

      if (result !== null) {
        return result
      }
    }
  }

  return $isElementNode(node) ? exportChildren(node, context) : null
}

function exportChildren(node: ElementNode, context: RenderContext): string {
  const output: string[] = []
  const children = node.getChildren()

  const textContent = new TextContent((_node) => exportChildren(_node, context), context)

  for (const child of children) {
    if (!textContent.isEmpty() && !$isLineBreakNode(child) && !$isTextNode(child) && !$isLinkNode(child)) {
      output.push(textContent.render())
      textContent.clear()
    }

    if ($isLineBreakNode(child) || $isTextNode(child) || $isLinkNode(child)) {
      textContent.addNode(child)
    } else if ($isElementNode(child)) {
      output.push(exportChildren(child, context))
    }
  }

  if (!textContent.isEmpty()) {
    output.push(textContent.render())
  }

  return output.join('')
}

function getElementInnerHTML(element: HTMLElement | DocumentFragment | Text | null): string {
  if (element && 'innerHTML' in element) {
    return element.innerHTML
  }

  return ''
}

function getElementOuterHTML(element: HTMLElement | DocumentFragment | Text | null): string {
  if (element && 'outerHTML' in element) {
    return element.outerHTML
  }

  return ''
}
