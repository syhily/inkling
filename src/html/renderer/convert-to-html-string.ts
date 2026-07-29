import type { DOMExportOutput, ElementNode, LexicalEditor, LexicalNode } from 'lexical'

import { $isLinkNode } from '@lexical/link'
import { $getRoot, $isDecoratorNode, $isElementNode, $isLineBreakNode, $isParagraphNode, $isTextNode } from 'lexical'

import type { ExportDOMOptions } from '@/nodes/base/export-dom'

import elementTransformers from '@/html/renderer/transformers/index'
import TextContent from '@/html/renderer/utils/TextContent'
import { $isInklingCard } from '@/nodes/base'
import { $isFootnoteDefinitionNode } from '@/nodes/base/nodes/footnotedefinition/FootnoteDefinitionNode'
import { createRenderContext } from '@/nodes/base/render-context'
import { FOOTNOTES_SECTION_HEADING_ID } from '@/nodes/footnote/footnote-anchors'
import { $isFootnoteRefNode } from '@/nodes/footnote/FootnoteRefNode'

const DEFAULT_FOOTNOTES_SECTION_TITLE = 'Footnotes'

export default function $convertToHtmlString(editor: LexicalEditor, options: ExportDOMOptions = {}): string {
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

  // The recursion closes over the per-render triple (editor, options,
  // context): fixed for the whole pass, so it is not re-passed per level.

  function exportTopLevelElementOrDecorator(node: LexicalNode): string | null {
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
        const result = transformer.export(node, exportChildren, context)

        if (result !== null) {
          return result
        }
      }

      return exportChildren(node)
    }

    return null
  }

  function exportChildren(node: ElementNode): string {
    const output: string[] = []

    const textContent = new TextContent(exportChildren, context)

    for (const child of node.getChildren()) {
      // anything that is not text-flow content flushes the pending run:
      // element markup splices in as outer HTML, never through TextContent
      if (!textContent.isEmpty() && !$isLineBreakNode(child) && !$isTextNode(child) && !$isLinkNode(child)) {
        output.push(textContent.render())
        textContent.clear()
      }

      if ($isFootnoteRefNode(child)) {
        // A TextNode entity whose export is element markup (`<sup><a…>`), not
        // text — splice the outer HTML like the inline-decorator branch below.
        output.push(getElementOuterHTML(child.exportDOM(editor, options).element))
      } else if ($isLineBreakNode(child) || $isTextNode(child) || $isLinkNode(child)) {
        textContent.addNode(child)
      } else if ($isDecoratorNode(child) && child.isInline()) {
        // Inline decorators (the math inline node is the first) export through
        // the same per-node exportDOM dispatch the cards get, with the options
        // bag flowing so headless renders resolve their DOM. The exported
        // element splices into the text flow as outer HTML.
        const exporter = child as LexicalNode & {
          exportDOM(editor: LexicalEditor, options?: ExportDOMOptions): DOMExportOutput
        }
        output.push(getElementOuterHTML(exporter.exportDOM(editor, options).element))
      } else if ($isElementNode(child)) {
        output.push(exportChildren(child))
      }
    }

    if (!textContent.isEmpty()) {
      output.push(textContent.render())
    }

    return output.join('')
  }

  const output: string[] = []
  const children: LexicalNode[] = $getRoot().getChildren()

  for (const child of children) {
    const result = exportTopLevelElementOrDecorator(child)

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

  // The footnotes-section wrap (docs/kobato-fit-plan.md C4 §3.2(e)): the
  // behaviour module's run transform keeps every definition card one
  // trailing run, so wrapping the run's `<li>` outputs is a mechanical
  // post-processing step here. The heading text is the host's
  // `footnotesSectionTitle` (kobato's `footnotes-section-title`).
  let firstDefinitionIndex = children.length
  while (firstDefinitionIndex > 0 && $isFootnoteDefinitionNode(children[firstDefinitionIndex - 1])) {
    firstDefinitionIndex -= 1
  }
  if (firstDefinitionIndex < children.length) {
    const definitionCount = children.length - firstDefinitionIndex
    const items = output.splice(output.length - definitionCount, definitionCount)
    const configuredTitle = options.footnotesSectionTitle?.trim()
    const title = context.escapeText(configuredTitle || DEFAULT_FOOTNOTES_SECTION_TITLE)
    output.push(
      `<section class="footnotes" data-footnotes="" aria-labelledby="${FOOTNOTES_SECTION_HEADING_ID}">` +
        `<h3 id="${FOOTNOTES_SECTION_HEADING_ID}">${title}</h3>` +
        `<ol>${items.join('')}</ol></section>`,
    )
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
