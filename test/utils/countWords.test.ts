import { countWords } from '@/utils/index'

describe('countWords', function () {
  it('counts plain words', function () {
    countWords('Some words here').should.equal(3)
  })

  it('sanitizes HTML tags', function () {
    const html = '<p>This is a text example! Count me in ;)</p>'
    countWords(html).should.equal(8)
  })

  it('sanitizes non alpha-numeric characters', function () {
    const html = '<p>This is a text example! I love Döner. Especially number 875.</p>'
    countWords(html).should.equal(11)
  })

  it('counts Chinese characters', function () {
    const html = '<p>我今天在家吃了好多好多好吃的，现在的我非常开心非常满足</p>'
    countWords(html).should.equal(26)
  })

  it('sanitizes whitespace correctly', function () {
    const html = ' <p> This is a text example!\n Count   me in ;)</p> '
    countWords(html).should.equal(8)
  })

  it('counts Arabic characters', function () {
    const html = '<p>انا هذا رائع جدا يا صاح</p>'
    countWords(html).should.equal(6)
  })

  it('counts Hebrew characters', function () {
    const html = '<p>מנסה לגרום לזה לעבוד</p>'
    countWords(html).should.equal(4)
  })

  it('returns 0 for empty / falsy input', function () {
    countWords('').should.equal(0)
    countWords(null).should.equal(0)
    countWords(undefined).should.equal(0)
  })

  it('unwraps Handlebars SafeString via .string', function () {
    countWords({ string: 'one two three' }).should.equal(3)
  })
})
