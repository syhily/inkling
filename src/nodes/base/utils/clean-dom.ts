import { isSafeUrl } from '@/nodes/base/utils/is-safe-url'

// Attributes the nested callout editor legitimately produces. A[href] is
// additionally validated with isSafeUrl; CODE[style] is constrained to
// Lexical's known inline-code serialization.
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  A: ['href', 'rel', 'target'],
  CODE: ['spellcheck', 'style'],
}
const CODE_STYLE_REGEX = /^white-space:\s*pre-wrap;?$/

function cleanAttributes(element: Element, allowedAttributes: Record<string, string[]>) {
  const allowed = allowedAttributes[element.tagName] ?? []

  // snapshot the live NamedNodeMap since attributes are removed while iterating
  for (const attribute of Array.from(element.attributes)) {
    if (!allowed.includes(attribute.name)) {
      element.removeAttribute(attribute.name)
      continue
    }

    if (element.tagName === 'A' && attribute.name === 'href' && !isSafeUrl(attribute.value)) {
      element.removeAttribute(attribute.name)
    }

    if (element.tagName === 'CODE' && attribute.name === 'style' && !CODE_STYLE_REGEX.test(attribute.value.trim())) {
      element.removeAttribute(attribute.name)
    }
  }
}

export function cleanDOM(
  node: Element,
  allowedTags: string[],
  allowedAttributes: Record<string, string[]> = ALLOWED_ATTRIBUTES,
) {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]
    if (child.nodeType === 1 && !allowedTags.includes((child as Element).tagName)) {
      while (child.firstChild) {
        node.insertBefore(child.firstChild, child)
      }
      node.removeChild(child)
      i -= 1
    } else if (child.nodeType === 1) {
      cleanAttributes(child as Element, allowedAttributes)
      cleanDOM(child as Element, allowedTags, allowedAttributes)
    }
  }
}
