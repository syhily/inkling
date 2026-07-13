import { dom } from '#/nodes-base/test-utils/index'
import { buildSrcBackgroundScript } from '@/nodes/base/utils/set-src-background-from-parent'

describe('buildSrcBackgroundScript', function () {
  it('returns a script element with the serialized helper as textContent', function () {
    const document = dom.window.document
    const script = buildSrcBackgroundScript(document)

    expect(script.tagName).toBe('SCRIPT')
    expect(script.textContent).toBeDefined()
    expect(script.textContent).not.toBeNull()
    expect(script.textContent!).toContain('setSrcBackgroundFromParent')
    expect(script.textContent!).toContain('data-src')
  })

  it('inlines isSafeUrl validation in the generated script', function () {
    const document = dom.window.document
    const script = buildSrcBackgroundScript(document)

    expect(script.textContent!).toContain('isSafeUrl')
    expect(script.textContent!).toContain('isSafeUrl(baseSrc)')
  })

  it('uses textContent to embed the serialized helper', function () {
    const document = dom.window.document
    const script = buildSrcBackgroundScript(document)

    expect(script.textContent).toBeDefined()
    expect(script.textContent).not.toBeNull()
    expect(script.textContent!.length).toBeGreaterThan(0)
  })

  it('inlines an isSafeUrl implementation that rejects unsafe URLs', function () {
    const document = dom.window.document
    const script = buildSrcBackgroundScript(document)

    const isSafeUrlStart = script.textContent!.indexOf('function isSafeUrl(url)')
    expect(isSafeUrlStart).toBeGreaterThan(-1)

    // The generated script ends with `)(function isSafeUrl(url) { ... })`.
    // Slice from the isSafeUrl definition to just before the final IIFE `)`.
    const isSafeUrlSource = script.textContent!.slice(isSafeUrlStart, -1)

    // eslint-disable-next-line no-eval
    const isSafeUrl = eval(`(${isSafeUrlSource})`) as (url: string) => boolean

    expect(isSafeUrl('https://example.com/embed')).toBe(true)
    expect(isSafeUrl('/content/images/example.jpg')).toBe(true)
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isSafeUrl('blob:https://example.com/1234')).toBe(false)
  })
})
