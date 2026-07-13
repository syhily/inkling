import should from 'should'

import { dom } from '#/nodes-base/test-utils/index'
import { buildSrcBackgroundScript } from '@/nodes/base/utils/set-src-background-from-parent'

void should

describe('buildSrcBackgroundScript', function () {
  it('returns a script element with the serialized helper as textContent', function () {
    const document = dom.window.document
    const script = buildSrcBackgroundScript(document)

    script.tagName.should.equal('SCRIPT')
    should.exist(script.textContent)
    script.textContent!.should.containEql('setSrcBackgroundFromParent')
    script.textContent!.should.containEql('data-src')
  })

  it('inlines isSafeUrl validation in the generated script', function () {
    const document = dom.window.document
    const script = buildSrcBackgroundScript(document)

    script.textContent!.should.containEql('isSafeUrl')
    script.textContent!.should.containEql('isSafeUrl(baseSrc)')
  })

  it('uses textContent to embed the serialized helper', function () {
    const document = dom.window.document
    const script = buildSrcBackgroundScript(document)

    should.exist(script.textContent)
    script.textContent!.length.should.be.greaterThan(0)
  })

  it('inlines an isSafeUrl implementation that rejects unsafe URLs', function () {
    const document = dom.window.document
    const script = buildSrcBackgroundScript(document)

    const isSafeUrlStart = script.textContent!.indexOf('function isSafeUrl(url)')
    isSafeUrlStart.should.be.greaterThan(-1)

    // The generated script ends with `)(function isSafeUrl(url) { ... })`.
    // Slice from the isSafeUrl definition to just before the final IIFE `)`.
    const isSafeUrlSource = script.textContent!.slice(isSafeUrlStart, -1)

    // eslint-disable-next-line no-eval
    const isSafeUrl = eval(`(${isSafeUrlSource})`) as (url: string) => boolean

    isSafeUrl('https://example.com/embed').should.be.true()
    isSafeUrl('/content/images/example.jpg').should.be.true()
    isSafeUrl('javascript:alert(1)').should.be.false()
    isSafeUrl('data:text/html,<script>alert(1)</script>').should.be.false()
    isSafeUrl('blob:https://example.com/1234').should.be.false()
  })
})
