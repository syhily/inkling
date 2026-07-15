export const SPECIAL_MARKUPS = {
  code: '`',
  superscript: '^',
  subscript: '~',
  strikethrough: '~~',
}

// Word and other Office apps generate HTML with `white-space: pre-wrap` on
// inline elements. Lexical treats the newline characters inside those elements
// as line breaks, which splits formatting (e.g. italic text ends up in a plain
// node and an empty em node). Stripping `pre-wrap` lets the browser collapse
// the newlines so formatting stays intact.
export function normalizePastedHtml(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('[style*="white-space"]').forEach((element) => {
    const style = (element as HTMLElement).style
    if (style.whiteSpace === 'pre-wrap' || style.whiteSpace === 'pre') {
      style.whiteSpace = 'normal'
    }
  })

  return doc.body.innerHTML
}
