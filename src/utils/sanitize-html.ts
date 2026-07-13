import DOMPurify from 'dompurify'

export interface SanitizeHtmlOptions {
  replaceJS?: boolean
}

function replaceScriptAndIframePlaceholders(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const disallowedElements = doc.querySelectorAll('script, iframe')
  if (disallowedElements.length === 0) {
    return html
  }

  disallowedElements.forEach((element) => {
    const placeholder = doc.createElement('pre')
    if (element.tagName.toLowerCase() === 'script') {
      placeholder.setAttribute('class', 'js-embed-placeholder')
      placeholder.textContent = 'Embedded JavaScript'
    } else {
      placeholder.setAttribute('class', 'iframe-embed-placeholder')
      placeholder.textContent = 'Embedded iFrame'
    }
    element.replaceWith(placeholder)
  })

  return doc.body.innerHTML
}

export function sanitizeHtml(html = '', options: SanitizeHtmlOptions = {}): string {
  const resolvedOptions = {
    replaceJS: true,
    ...options,
  }

  let result = html

  if (resolvedOptions.replaceJS) {
    result = replaceScriptAndIframePlaceholders(html)
  }

  return DOMPurify.sanitize(result, {
    ALLOWED_URI_REGEXP: /^(?:https?:|\/|blob:)/,
    ADD_ATTR: ['id'],
    FORBID_TAGS: ['style'],
  }) as string
}
