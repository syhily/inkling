import type { Options } from 'markdown-it'
import type Renderer from 'markdown-it/lib/renderer.mjs'
import type Token from 'markdown-it/lib/token.mjs'

import MarkdownIt from 'markdown-it'
import markdownItFootnote from 'markdown-it-footnote'
import markdownItImageLazyLoading from 'markdown-it-image-lazy-loading'
import markdownItLazyHeaders from 'markdown-it-lazy-headers'
import markdownItMark from 'markdown-it-mark'
import markdownItSub from 'markdown-it-sub'
import markdownItSup from 'markdown-it-sup'

import { slugify } from '@/utils'

// Only the `<4.x` vs `>=4.x` distinction matters (pre-4.0 slug formats).
// Versions that don't parse as `major.minor` are treated as latest, matching
// the old null-coercion fallthrough.
function isLegacyVersion(inklingVersion: string): boolean {
  const major = Number.parseInt(inklingVersion, 10)
  return !Number.isNaN(major) && major < 4
}

const renderers: Record<string, MarkdownIt> = {}

interface RenderOptions {
  inklingVersion?: string
}

const namedHeaders = function ({ inklingVersion }: RenderOptions = {}) {
  const usedHeaders: Record<string, number> = {}

  const generateSlug = function (inputString: string) {
    let slug = slugify(inputString, { inklingVersion, type: 'markdown' })
    if (usedHeaders[slug]) {
      usedHeaders[slug] += 1
      slug += usedHeaders[slug]
    } else {
      usedHeaders[slug] = 1
    }
    return slug
  }

  return function (md: MarkdownIt) {
    const originalHeadingOpen = md.renderer.rules.heading_open

    // originally from https://github.com/leff/markdown-it-named-headers
    // moved here to avoid pulling in http://stringjs.com dependency
    md.renderer.rules.heading_open = function (
      tokens: Token[],
      idx: number,
      options: Options,
      env: unknown,
      self: Renderer,
    ) {
      tokens[idx].attrs = tokens[idx].attrs || []
      const title = tokens[idx + 1].children!.reduce(function (acc: string, t: Token) {
        return acc + t.content
      }, '')
      const slug = generateSlug(title)
      tokens[idx].attrs!.push(['id', slug])
      if (originalHeadingOpen) {
        return originalHeadingOpen.call(this, tokens, idx, options, env, self)
      } else {
        return self.renderToken(tokens, idx, options)
      }
    }
  }
}

const selectRenderer = function (options: RenderOptions): MarkdownIt {
  if (isLegacyVersion(options.inklingVersion || '4.0')) {
    if (renderers['<4.x']) {
      return renderers['<4.x']
    }
    const markdownIt = new MarkdownIt({ html: true, breaks: true, linkify: true })
      .use(markdownItFootnote)
      .use(markdownItLazyHeaders)
      .use(markdownItMark)
      .use(markdownItImageLazyLoading)
      .use(namedHeaders(options))
      .use(markdownItSub)
      .use(markdownItSup)
    markdownIt.linkify.set({ fuzzyLink: false })
    renderers['<4.x'] = markdownIt
    return markdownIt
  } else {
    if (renderers.latest) {
      return renderers.latest
    }
    const markdownIt = new MarkdownIt({ html: true, breaks: true, linkify: true })
      .use(markdownItFootnote)
      .use(markdownItLazyHeaders)
      .use(markdownItMark)
      .use(markdownItImageLazyLoading)
      .use(namedHeaders(options))
      .use(markdownItSub)
      .use(markdownItSup)
    markdownIt.linkify.set({ fuzzyLink: false })
    renderers.latest = markdownIt
    return markdownIt
  }
}

export function render(markdown: string, options: RenderOptions = {}): string {
  return selectRenderer(options).render(markdown)
}
