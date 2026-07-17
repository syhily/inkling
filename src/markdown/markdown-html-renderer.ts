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

const renderers: Partial<Record<'<4.x' | 'latest', MarkdownIt>> = {}

interface RenderOptions {
  inklingVersion?: string
}

// The named-headers dedup map carried on the per-render env: slug → count.
function isUsedHeaders(value: unknown): value is Record<string, number> {
  return typeof value === 'object' && value !== null && Object.values(value).every((count) => typeof count === 'number')
}

const namedHeaders = function ({ inklingVersion }: RenderOptions = {}) {
  const generateSlug = function (inputString: string, usedHeaders: Record<string, number>) {
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
      env: Record<string, unknown>,
      self: Renderer,
    ) {
      // Dedup state must live on the per-render `env` (markdown-it creates a
      // fresh env object for every render() call) — keeping it in a closure
      // would leak heading ids across renders of the cached MarkdownIt
      // instance, while a fresh object per heading would never dedupe. The
      // slot is validated rather than asserted: env is caller-controlled, so
      // a foreign value must reset the map instead of corrupting it.
      let usedHeaders: Record<string, number>
      if (isUsedHeaders(env.usedHeaders)) {
        usedHeaders = env.usedHeaders
      } else {
        usedHeaders = {}
        env.usedHeaders = usedHeaders
      }

      tokens[idx].attrs = tokens[idx].attrs || []
      const title = tokens[idx + 1].children!.reduce(function (acc: string, t: Token) {
        return acc + t.content
      }, '')
      const slug = generateSlug(title, usedHeaders)
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
