import type { RenderContext } from '@/nodes/base/render-context'

import { escapeHtml } from '@/nodes/base/utils/escape-html'
import { isSafeUrl } from '@/nodes/base/utils/is-safe-url'
import { textColorForBackgroundColor } from '@/utils/colorUtils'

import { html } from '../tagged-template-fns'

export interface EmailButtonOptions {
  url?: string
  text?: string
  alignment?: string
  buttonWidth?: string
  color?: string
  style?: 'fill' | 'outline'
}

// Accepts hex, rgb/rgba, and CSS named colors. Rejects arbitrary strings to
// keep style values safe in email clients.
const SAFE_COLOR_REGEX =
  /^#[0-9a-fA-F]{3,8}$|^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$|^[a-zA-Z]+$/

function isValidColor(value: string): boolean {
  return SAFE_COLOR_REGEX.test(value) && value !== 'transparent'
}

function buildButtonStyles(color: string, style: 'fill' | 'outline'): { td: string; a: string } {
  if (style === 'outline') {
    return {
      td: `background-color: transparent; border: 1px solid currentColor; color: ${color};`,
      a: `color: ${color};`,
    }
  }

  const textColor = textColorForBackgroundColor(color).hex()
  return {
    td: `background-color: ${color};`,
    a: `color: ${textColor};`,
  }
}

export function renderEmailButton(options: EmailButtonOptions = {}, context?: RenderContext): string {
  const { alignment = '', buttonWidth = '', color = '', style = 'fill', text = '', url = '' } = options

  // Renderer callers pass the render context so URL policy flows through the
  // seam; direct callers without a render pass keep the legacy check (pinned
  // by email-button.test.ts).
  const isSafeButtonUrl = context ? context.safeUrl('navigation', url) !== '' : isSafeUrl(url)
  if (url !== '' && !isSafeButtonUrl) {
    return ''
  }

  const safeUrl = escapeHtml(url)
  const safeText = escapeHtml(text)
  const isAccent = color === 'accent'
  const hasCustomColor = color !== '' && !isAccent && isValidColor(color)
  const effectiveStyle = style === 'outline' ? 'outline' : 'fill'

  const buttonClasses = clsx('btn', isAccent && 'btn-accent')

  const tdStyleParts: string[] = []
  const aStyleParts: string[] = []

  if (hasCustomColor) {
    const styles = buildButtonStyles(color, effectiveStyle)
    tdStyleParts.push(styles.td)
    aStyleParts.push(styles.a)
  }

  const tdStyle = tdStyleParts.join(' ')
  const aStyle = aStyleParts.join(' ')

  return html`
    <table
      class="${buttonClasses}"
      border="0"
      cellspacing="0"
      cellpadding="0"
      ${alignment ? `align="${escapeHtml(alignment)}"` : ''}
      ${buttonWidth ? `width="${escapeHtml(buttonWidth)}"` : ''}
    >
      <tbody>
        <tr>
          <td align="center" ${tdStyle ? `style="${tdStyle}"` : ''}>
            <a href="${safeUrl}" ${aStyle ? `style="${aStyle}"` : ''}>${safeText}</a>
          </td>
        </tr>
      </tbody>
    </table>
  `
}

// Minimal inline clsx replacement to avoid adding a dependency for this helper.
function clsx(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
