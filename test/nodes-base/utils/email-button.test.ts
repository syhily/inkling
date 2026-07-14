import { describe, expect, it } from 'vitest'

import { renderEmailButton } from '@/nodes/base/utils/render-helpers/email-button'

describe('renderEmailButton', () => {
  it('renders a minimal button with defaults', () => {
    const output = renderEmailButton()

    expect(output).toContain('class="btn"')
    expect(output).not.toContain('btn-accent')
    expect(output).toContain('<a href=""></a>')
  })

  it('renders a button with url, text, and alignment', () => {
    const output = renderEmailButton({
      url: 'https://example.com/',
      text: 'Click me',
      alignment: 'center',
    })

    expect(output).toContain('align="center"')
    expect(output).toContain('href="https://example.com/"')
    expect(output).toContain('>Click me<')
  })

  it('applies the accent class when color is accent', () => {
    const output = renderEmailButton({ color: 'accent' })

    expect(output).toContain('class="btn btn-accent"')
  })

  it('emits a custom width when provided', () => {
    const output = renderEmailButton({ buttonWidth: '200px' })

    expect(output).toContain('width="200px"')
  })

  it('ignores empty optional values', () => {
    const output = renderEmailButton({
      alignment: '',
      buttonWidth: '',
      color: '',
      style: undefined,
    })

    expect(output).toContain('class="btn"')
    expect(output).not.toContain('align=""')
    expect(output).not.toContain('width=""')
  })

  it('escapes unsafe url and text', () => {
    const output = renderEmailButton({
      url: 'https://example.com/?a=1&b=2',
      text: '<script>alert(1)</script>',
    })

    expect(output).toContain('href="https://example.com/?a=1&amp;b=2"')
    expect(output).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(output).not.toContain('<script>alert(1)</script>')
  })

  it('renders a filled custom color button with white text on dark background', () => {
    const output = renderEmailButton({
      url: 'https://example.com/',
      text: 'Click me',
      color: '#000000',
      style: 'fill',
    })

    expect(output).toContain('background-color: #000000')
    expect(output).toContain('color: #FFFFFF')
  })

  it('renders a filled custom color button with black text on light background', () => {
    const output = renderEmailButton({
      url: 'https://example.com/',
      text: 'Click me',
      color: '#FFFFFF',
      style: 'fill',
    })

    expect(output).toContain('background-color: #FFFFFF')
    expect(output).toContain('color: #000000')
  })

  it('renders an outlined custom color button', () => {
    const output = renderEmailButton({
      url: 'https://example.com/',
      text: 'Click me',
      color: '#FF0000',
      style: 'outline',
    })

    expect(output).toContain('background-color: transparent')
    expect(output).toContain('border: 1px solid currentColor')
    expect(output).toContain('color: #FF0000')
  })

  it('ignores invalid custom colors and falls back to class-driven output', () => {
    const output = renderEmailButton({
      url: 'https://example.com/',
      text: 'Click me',
      color: 'not-a-color',
      style: 'fill',
    })

    expect(output).toContain('class="btn"')
    expect(output).not.toContain('background-color: not-a-color')
  })

  it('falls back to fill for unsupported style values', () => {
    const output = renderEmailButton({
      url: 'https://example.com/',
      text: 'Click me',
      color: '#000000',
      style: 'unsupported' as 'fill',
    })

    expect(output).toContain('background-color: #000000')
  })

  it('returns empty string for an unsafe url', () => {
    const output = renderEmailButton({
      url: 'javascript:alert(1)',
      text: 'Click me',
    })

    expect(output).toBe('')
  })
})
