import { countWords } from '@/utils/index'

describe('countWords', function () {
  it('counts plain words', function () {
    expect(countWords('Some words here')).toBe(3)
  })

  it('sanitizes HTML tags', function () {
    const html = '<p>This is a text example! Count me in ;)</p>'
    expect(countWords(html)).toBe(8)
  })

  it('sanitizes non alpha-numeric characters', function () {
    const html = '<p>This is a text example! I love Döner. Especially number 875.</p>'
    expect(countWords(html)).toBe(11)
  })

  it('counts Chinese characters', function () {
    const html = '<p>我今天在家吃了好多好多好吃的，现在的我非常开心非常满足</p>'
    expect(countWords(html)).toBe(26)
  })

  it('sanitizes whitespace correctly', function () {
    const html = ' <p> This is a text example!\n Count   me in ;)</p> '
    expect(countWords(html)).toBe(8)
  })

  it('counts Arabic characters', function () {
    const html = '<p>انا هذا رائع جدا يا صاح</p>'
    expect(countWords(html)).toBe(6)
  })

  it('counts Hebrew characters', function () {
    const html = '<p>מנסה לגרום לזה לעבוד</p>'
    expect(countWords(html)).toBe(4)
  })

  it('returns 0 for empty / falsy input', function () {
    expect(countWords('')).toBe(0)
    expect(countWords(null)).toBe(0)
    expect(countWords(undefined)).toBe(0)
  })

  it('unwraps Handlebars SafeString via .string', function () {
    expect(countWords({ string: 'one two three' })).toBe(3)
  })
})
