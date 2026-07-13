import { render } from '@/markdown/markdown-html-renderer'

describe('Markdown HTML renderer', function () {
  describe('latest', function () {
    it('outputs urlencoded headers', function () {
      const markdown = `\n# Header One\n\n## Héader Two\n`
      const result = render(markdown, { inklingVersion: '4.0' })
      expect(result).toMatch(/<h1 id="header-one">/)
      expect(result).toMatch(/<h2 id="h%C3%A9ader-two">/)
    })

    it('deduplicates heading ids', function () {
      const result = render('# Hello\n# Hello', { inklingVersion: '4.0' })
      expect(result).toMatch(/<h1 id="hello">/)
      expect(result).toMatch(/<h1 id="hello2">/)
    })

    it('outputs `loading="lazy"` on images', function () {
      const markdown = `![](https://mysite.com/content/images/lazy.png)`
      const result = render(markdown, { inklingVersion: '3.0' })
      expect(result).toContain('loading="lazy"')
    })
  })

  describe('<4.x', function () {
    it('outputs `loading="lazy"` on images', function () {
      const markdown = `![](https://mysite.com/content/images/lazy.png)`
      const result = render(markdown, { inklingVersion: '3.0' })
      expect(result).toContain('loading="lazy"')
    })

    it('outputs backwards compatible headers', function () {
      const markdown = `\n# Header One\n\n## Héader Two\n`
      const result = render(markdown, { inklingVersion: '3.0' })
      expect(result).toMatch(/<h1 id="headerone">/)
      expect(result).toMatch(/<h2 id="hadertwo">/)
    })
  })
})
