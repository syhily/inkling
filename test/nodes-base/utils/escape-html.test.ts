import { escapeHtml } from '@/nodes/base/utils/escape-html'

describe('Utils: escapeHtml', function () {
  it('escapes special HTML characters', function () {
    escapeHtml('&').should.equal('&amp;')
    escapeHtml('<').should.equal('&lt;')
    escapeHtml('>').should.equal('&gt;')
    escapeHtml('"').should.equal('&quot;')
    escapeHtml("'").should.equal('&#039;')
  })

  it('escapes a string with multiple special characters', function () {
    escapeHtml('<div class="test">It\'s & </div>').should.equal(
      '&lt;div class=&quot;test&quot;&gt;It&#039;s &amp; &lt;/div&gt;',
    )
  })

  it('returns an empty string for empty input', function () {
    escapeHtml('').should.equal('')
  })
})
