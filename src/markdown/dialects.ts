// One markdown module, two dialects — this module names them and owns the
// seam facts. Nothing here merges them; the merge question at the bottom is
// deliberately open.
//
// **Paste dialect** — `PASTE_MARKDOWN_COMMAND` (`@/plugins/behaviour/clipboard-protocol`)
// handled by `@/plugins/MarkdownPastePlugin`: markdown-it with the footnote,
// lazy-headers, mark, image-lazy-loading, named-headers, sub, and sup plugins
// (`@/markdown/markdown-html-renderer`) → `<br>` strip → `sanitizeHtml` →
// Lexical HTML import. It speaks footnotes (`[^1]`), `==mark==`, `~sub~`,
// `^sup^` — and has no card-fence grammar. The same markdown-it engine has a
// second consumer: the markdown card's HTML export
// (`@/nodes/base/nodes/markdown/markdown-renderer`), so "paste" names the
// pipeline, not the engine's only user.
//
// **Card-aware round-trip dialect** — `markdownToLexicalState` /
// `lexicalStateToMarkdown` (`@/markdown/round-trip`): `@lexical/markdown`'s
// `$convertFromMarkdownString` / `$convertToMarkdownString` with the Inkling
// card transformers (`@/nodes/cards/card-markdown-transformers`) plus
// `DEFAULT_TRANSFORMERS` (`@/markdown/transformers`). It speaks
// ```inkling:<card>``` fences (html, file, button, audio, video, gallery,
// bookmark, toggle, callout, markdown), standard `![alt](src)` image syntax,
// and `~`/`^` sub/sup — but not footnotes. `==mark==` converts in both
// dialects: `@lexical/markdown`'s TEXT_FORMAT_TRANSFORMERS include HIGHLIGHT.
//
// Where the dialects meet: the round-trip dialect's own export does not
// survive the paste dialect. Pasting a ```inkling:*``` fence renders through
// markdown-it as `<pre><code class="language-inkling:*">` and imports as a
// code block card whose language is the fence tag and whose code is the JSON
// body — pinned in `test/unit/plugins/MarkdownPastePlugin.test.tsx` ("paste
// dialect coverage"). The same string imported through
// `markdownToLexicalState` recreates the card — pinned in
// `test/markdown/round-trip-cards.test.ts`.
//
// Open question (docs/markdown-api.md): should the paste path adopt the
// card-aware round-trip dialect so pasted card fences recreate cards? That
// merge is a product decision, deliberately not taken here.

/** The paste dialect: markdown-it → sanitize → Lexical HTML import. */
export const PASTE_DIALECT = 'paste'

/** The card-aware round-trip dialect: `@lexical/markdown` + Inkling card transformers. */
export const CARD_AWARE_ROUND_TRIP_DIALECT = 'card-aware-round-trip'

export type MarkdownDialect = typeof PASTE_DIALECT | typeof CARD_AWARE_ROUND_TRIP_DIALECT
