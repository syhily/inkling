import type { ElementNode, LexicalEditor, LexicalNode } from 'lexical'

import { $isLinkNode } from '@lexical/link'
import { $getRoot, $isElementNode, $isLineBreakNode, $isParagraphNode, $isTextNode } from 'lexical'

import type { RendererOptions } from '@/html/renderer/types'
import type { RenderContext } from '@/nodes/base/render-context'

import elementTransformers from '@/html/renderer/transformers/index'
import TextContent from '@/html/renderer/utils/TextContent'
import { $isInklingCard } from '@/nodes/base'
import { createRenderContext } from '@/nodes/base/render-context'

export default function $convertToHtmlString(editor: LexicalEditor, options: RendererOptions = {}): string {
  const output: string[] = []
  const children: LexicalNode[] = $getRoot().getChildren()

  options.usedIdAttributes = options.usedIdAttributes || {}

  // One read-only render context per string render, threaded to the element
  // transformers and TextContent so they can migrate onto it (plan 040). Card
  // exportDOM builds its own context per call. The string layer itself stays
  // verbatim — sanitization happens inside card renderers, never here.
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
  options: RendererOptions,
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
    // note: unsure why this type isn't being picked up from the import
    for (const transformer of elementTransformers) {
      if (transformer.export !== null) {
        const result = transformer.export(node, options, (_node) => exportChildren(_node, options, context), context)

        if (result !== null) {
          return result
        }
      }
    }
  }

  return $isElementNode(node) ? exportChildren(node, options, context) : null
}

function exportChildren(node: ElementNode, options: RendererOptions, context: RenderContext): string {
  const output: string[] = []
  const children = node.getChildren()

  const textContent = new TextContent((_node) => exportChildren(_node, options, context), options, context)

  for (const child of children) {
    if (!textContent.isEmpty() && !$isLineBreakNode(child) && !$isTextNode(child) && !$isLinkNode(child)) {
      output.push(textContent.render() ?? '')
      textContent.clear()
    }

    if ($isLineBreakNode(child) || $isTextNode(child) || $isLinkNode(child)) {
      textContent.addNode(child)
    } else if ($isElementNode(child)) {
      output.push(exportChildren(child, options, context) ?? '')
    }
  }

  if (!textContent.isEmpty()) {
    output.push(textContent.render() ?? '')
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
