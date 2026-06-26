import { truncateHtml, truncateText } from '@/nodes/base/utils/truncate'

describe('Utils: truncate', function () {
  describe('truncateText', function () {
    it('returns the original text when within max length', function () {
      truncateText('hello', 10).should.equal('hello')
    })

    it('truncates text longer than max length', function () {
      truncateText('hello world', 8).should.equal('hello w…')
    })

    it('returns empty string for empty input', function () {
      truncateText('', 10).should.equal('')
    })
  })

  describe('truncateHtml', function () {
    it('escapes and truncates plain text', function () {
      truncateHtml('<b>hello world</b>', 8).should.equal('&lt;b&gt;hell…')
    })

    it('returns escaped text when within mobile length', function () {
      truncateHtml('hello', 10, 5).should.equal('hello')
    })

    it('hides desktop portion when text exceeds mobile length', function () {
      const result = truncateHtml('hello world', 20, 5)
      result.should.containEql('hide-desktop')
      result.should.containEql('hell')
    })

    it('adds ellipsis when text exceeds both lengths', function () {
      const result = truncateHtml('hello world this is long', 15, 5)
      result.should.containEql('desktop-only')
      result.should.endWith('…')
    })
  })
})
