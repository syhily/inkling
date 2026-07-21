/**
 * Cross-path equivalence pin for the editor's two HTML export paths:
 *
 * - LIVE: `HtmlOutputPlugin` (src/plugins/HtmlOutputPlugin.tsx) exports from
 *   the mounted editor via Lexical's `$generateHtmlFromNodes`. The helper
 *   below drives that exact call (HtmlOutputPlugin.tsx:22) against an editor
 *   configured like `InklingComposer` (DEFAULT_NODES + defaultTheme); the
 *   plugin's remaining behaviour (empty-document guard, debounce) is covered
 *   by HtmlOutputPlugin.test.ts.
 * - HEADLESS: `LexicalHTMLRenderer` (src/html/renderer/LexicalHTMLRenderer.ts)
 *   renders a serialized state via `$convertToHtmlString` and Inkling's
 *   element transformers (src/html/renderer/transformers/element/).
 *
 * The two paths intentionally produce different markup for non-card elements.
 * This suite PINS the divergence instead of unifying it: heading-id
 * generation needs the per-render dedup tracking that lives in the headless
 * render context, so sharing exportDOM is out of scope by design.
 *
 * Every case pins BOTH paths' exact output. The suite fails if:
 * - a NEW divergence appears (either path's output changes), or
 * - a pinned divergence is silently FIXED (the outputs converge or a path's
 *   output no longer matches its pin).
 * If you unified the paths or fixed a divergence on purpose, that is the pin
 * doing its job — update the pinned strings and the `relationship` field
 * deliberately, and adjust docs/html-api.md to match.
 */

import { $generateHtmlFromNodes } from '@lexical/html'
import { JSDOM } from 'jsdom'
import { createEditor } from 'lexical'
import { describe, expect, it } from 'vitest'

import { LexicalHTMLRenderer } from '@/html/renderer/index'
import DEFAULT_NODES from '@/nodes/DefaultNodes'
import defaultTheme from '@/themes/default'

const dom = new JSDOM()

// The HtmlOutputPlugin route: same node set and theme InklingComposer passes
// to LexicalComposer, same $generateHtmlFromNodes(editor, null) call.
function renderLivePath(serializedState: string): string {
  const editor = createEditor({
    namespace: 'test',
    nodes: DEFAULT_NODES,
    theme: defaultTheme,
    onError: (error) => {
      throw error
    },
  })
  editor.setEditorState(editor.parseEditorState(serializedState))

  let html = ''
  editor.read(() => {
    html = $generateHtmlFromNodes(editor, null)
  })
  return html
}

// The LexicalHTMLRenderer route, driven exactly as test/html-renderer does.
async function renderHeadlessPath(serializedState: string): Promise<string> {
  const renderer = new LexicalHTMLRenderer({
    dom,
    onError: (error) => {
      throw error
    },
  })
  return renderer.render(serializedState)
}

const text = (content: string, format = 0) => ({
  type: 'text',
  version: 1,
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text: content,
})

const block = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  children,
  ...extra,
})

const doc = (children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 },
  })

interface ExportPathCase {
  name: string
  input: string
  // Exact pinned output of each path. `identical` asserts the two paths agree
  // byte-for-byte; `divergent` asserts they differ (and the pinned strings
  // pin down exactly how).
  relationship: 'identical' | 'divergent'
  live: string
  headless: string
}

const cases: ExportPathCase[] = [
  {
    name: 'paragraph',
    // Live wraps text runs in <span style="white-space: pre-wrap"> and adds
    // dir attributes (Lexical core exportDOM); headless emits clean markup.
    relationship: 'divergent',
    input: doc([block('paragraph', [text('Plain text')])]),
    live: '<p dir="ltr"><span style="white-space: pre-wrap;">Plain text</span></p>',
    headless: '<p>Plain text</p>',
  },
  {
    name: 'basic text formats',
    // Live doubles format tags and applies Inkling theme classes
    // (<b><strong>, <i><em class="italic">, ...); headless emits single
    // semantic tags. Tags agree on: strong, em, s, u, code.
    relationship: 'divergent',
    input: doc([
      block('paragraph', [
        text('bold', 1),
        text('italic', 2),
        text('strikethrough', 4),
        text('underline', 8),
        text('code', 16),
      ]),
    ]),
    live: '<p dir="ltr"><b><strong style="white-space: pre-wrap;">bold</strong></b><i><em class="italic" style="white-space: pre-wrap;">italic</em></i><s><span class="line-through" style="white-space: pre-wrap;">strikethrough</span></s><u><span class="underline" style="white-space: pre-wrap;">underline</span></u><code spellcheck="false" style="white-space: pre-wrap;"><span>code</span></code></p>',
    headless: '<p><strong>bold</strong><em>italic</em><s>strikethrough</s><u>underline</u><code>code</code></p>',
  },
  {
    name: 'subscript, superscript and highlight formats',
    // Same semantic tags in both paths (sub, sup, mark); only Lexical's
    // style/span noise differs.
    relationship: 'divergent',
    input: doc([block('paragraph', [text('subscript', 32), text('superscript', 64), text('highlight', 128)])]),
    live: '<p dir="ltr"><sub style="white-space: pre-wrap;"><span>subscript</span></sub><sup style="white-space: pre-wrap;"><span>superscript</span></sup><mark style="white-space: pre-wrap;"><span>highlight</span></mark></p>',
    headless: '<p><sub>subscript</sub><sup>superscript</sup><mark>highlight</mark></p>',
  },
  {
    name: 'text-transform formats',
    // Live preserves lowercase/uppercase/capitalize via inline text-transform
    // styles; headless maps them to a bare <span> and the format is LOST.
    relationship: 'divergent',
    input: doc([block('paragraph', [text('lowercase', 256), text('uppercase', 512), text('capitalize', 1024)])]),
    live: '<p dir="ltr"><span style="white-space: pre-wrap; text-transform: lowercase;">lowercase</span><span style="white-space: pre-wrap; text-transform: uppercase;">uppercase</span><span style="white-space: pre-wrap; text-transform: capitalize;">capitalize</span></p>',
    headless: '<p><span>lowercase</span><span>uppercase</span><span>capitalize</span></p>',
  },
  {
    name: 'heading',
    // The pinned divergence this suite exists for: only the headless path
    // adds the generated id (src/html/renderer/transformers/element/heading.ts).
    relationship: 'divergent',
    input: doc([block('heading', [text('Heading one')], { tag: 'h1' })]),
    live: '<h1 dir="ltr"><span style="white-space: pre-wrap;">Heading one</span></h1>',
    headless: '<h1 id="heading-one">Heading one</h1>',
  },
  {
    name: 'duplicate headings',
    // Headless ids are deduped within one render (render-context tracking);
    // live emits no ids at all.
    relationship: 'divergent',
    input: doc([
      block('heading', [text('Heading one')], { tag: 'h1' }),
      block('heading', [text('Heading one')], { tag: 'h2' }),
    ]),
    live: '<h1 dir="ltr"><span style="white-space: pre-wrap;">Heading one</span></h1><h2 dir="ltr"><span style="white-space: pre-wrap;">Heading one</span></h2>',
    headless: '<h1 id="heading-one">Heading one</h1><h2 id="heading-one-1">Heading one</h2>',
  },
  {
    name: 'extended-heading',
    // Inkling's serialized heading type; both paths resolve it to
    // ExtendedHeadingNode and the same id divergence applies.
    relationship: 'divergent',
    input: doc([block('extended-heading', [text('Extended heading')], { tag: 'h3' })]),
    live: '<h3 dir="ltr"><span style="white-space: pre-wrap;">Extended heading</span></h3>',
    headless: '<h3 id="extended-heading">Extended heading</h3>',
  },
  {
    name: 'quote',
    relationship: 'divergent',
    input: doc([block('quote', [text('A quote')])]),
    live: '<blockquote dir="ltr"><span style="white-space: pre-wrap;">A quote</span></blockquote>',
    headless: '<blockquote>A quote</blockquote>',
  },
  {
    name: 'aside',
    // Completely different element mapping: live renders the AsideNode DOM
    // (<aside> with its inner paragraph), headless renders the alt blockquote
    // and flattens the inner paragraph (transformers/element/aside.ts).
    relationship: 'divergent',
    input: doc([block('aside', [block('paragraph', [text('An aside')])])]),
    live: '<aside dir="ltr"><p dir="ltr"><span style="white-space: pre-wrap;">An aside</span></p></aside>',
    headless: '<blockquote class="inkling-blockquote-alt">An aside</blockquote>',
  },
  {
    name: 'bullet list',
    // Live stamps value="n" on every <li>; headless omits it.
    relationship: 'divergent',
    input: doc([
      block('list', [block('listitem', [text('one')], { value: 1 }), block('listitem', [text('two')], { value: 2 })], {
        listType: 'bullet',
        start: 1,
        tag: 'ul',
      }),
    ]),
    live: '<ul><li value="1" dir="ltr"><span style="white-space: pre-wrap;">one</span></li><li value="2" dir="ltr"><span style="white-space: pre-wrap;">two</span></li></ul>',
    headless: '<ul><li>one</li><li>two</li></ul>',
  },
  {
    name: 'numbered list with start',
    // The ol start attribute agrees across paths; the li value does not.
    relationship: 'divergent',
    input: doc([
      block('list', [block('listitem', [text('three')], { value: 3 })], { listType: 'number', start: 3, tag: 'ol' }),
    ]),
    live: '<ol start="3"><li value="3" dir="ltr"><span style="white-space: pre-wrap;">three</span></li></ol>',
    headless: '<ol start="3"><li>three</li></ol>',
  },
  {
    name: 'nested list',
    // Nesting structure agrees; only the attribute/style noise differs.
    relationship: 'divergent',
    input: doc([
      block(
        'list',
        [
          block('listitem', [text('one')], { value: 1 }),
          block(
            'listitem',
            [
              block('list', [block('listitem', [text('nested')], { value: 1 })], {
                listType: 'bullet',
                start: 1,
                tag: 'ul',
              }),
            ],
            { value: 2 },
          ),
        ],
        { listType: 'bullet', start: 1, tag: 'ul' },
      ),
    ]),
    live: '<ul><li value="1" dir="ltr"><span style="white-space: pre-wrap;">one</span><ul><li value="1" dir="ltr"><span style="white-space: pre-wrap;">nested</span></li></ul></li></ul>',
    headless: '<ul><li>one<ul><li>nested</li></ul></li></ul>',
  },
  {
    name: 'link',
    // href and rel agree across paths.
    relationship: 'divergent',
    input: doc([
      block('paragraph', [
        block('link', [text('a link')], { url: 'https://example.com', rel: 'noopener', target: null, title: null }),
      ]),
    ]),
    live: '<p dir="ltr"><a href="https://example.com" rel="noopener" dir="ltr"><span style="white-space: pre-wrap;">a link</span></a></p>',
    headless: '<p><a href="https://example.com" rel="noopener">a link</a></p>',
  },
  {
    name: 'paragraph with line break',
    relationship: 'divergent',
    input: doc([block('paragraph', [text('line one'), { type: 'linebreak', version: 1 }, text('line two')])]),
    live: '<p dir="ltr"><span style="white-space: pre-wrap;">line one</span><br><span style="white-space: pre-wrap;">line two</span></p>',
    headless: '<p>line one<br>line two</p>',
  },
  {
    name: 'trailing empty paragraph',
    // Headless deliberately drops the trailing blank paragraph Inkling keeps
    // at the end of a doc (convert-to-html-string.ts); live renders it.
    relationship: 'divergent',
    input: doc([block('paragraph', [text('content')]), block('paragraph', [])]),
    live: '<p dir="ltr"><span style="white-space: pre-wrap;">content</span></p><p dir="ltr"><br></p>',
    headless: '<p>content</p>',
  },
  {
    name: 'card (horizontal rule)',
    // Control case: cards share exportDOM across both paths, so their markup
    // is byte-identical. If this starts diverging, a card stopped sharing its
    // exportDOM implementation.
    relationship: 'identical',
    input: doc([{ type: 'horizontalrule', version: 1 }]),
    live: '<hr>',
    headless: '<hr>',
  },
]

describe('HTML export path parity (HtmlOutputPlugin vs LexicalHTMLRenderer)', () => {
  for (const { name, input, relationship, live, headless } of cases) {
    it(`pins both paths for: ${name}`, async () => {
      const liveOutput = renderLivePath(input)
      const headlessOutput = await renderHeadlessPath(input)

      expect(liveOutput).toBe(live)
      expect(headlessOutput).toBe(headless)

      if (relationship === 'identical') {
        expect(liveOutput).toBe(headlessOutput)
      } else {
        expect(liveOutput).not.toBe(headlessOutput)
      }
    })
  }

  it('pins the heading-id divergence explicitly', async () => {
    const input = doc([
      block('heading', [text('Heading one')], { tag: 'h1' }),
      block('heading', [text('Heading one')], { tag: 'h2' }),
    ])

    const liveOutput = renderLivePath(input)
    const headlessOutput = await renderHeadlessPath(input)

    // The live path never emits heading ids...
    expect(liveOutput).not.toContain('id=')
    // ...and the headless path emits exactly these deduped ids.
    expect(headlessOutput).toContain('<h1 id="heading-one">')
    expect(headlessOutput).toContain('<h2 id="heading-one-1">')
  })
})
