// Inkling speaks two markdown dialects. The divergence used to live only in
// this file's prose; it is now structural — each dialect is a real module
// whose `grammar` declares what it speaks as data, and this file is the
// shared seam both declare against:
//
// - **Paste dialect** → `@/markdown/paste-dialect` (`pasteDialect`):
//   clipboard markdown (`PASTE_MARKDOWN_COMMAND` → `MarkdownPastePlugin` →
//   the headless `markdownToSanitizedHtml`) and the markdown card's HTML
//   export (`@/nodes/base/nodes/markdown/markdown-renderer`).
// - **Card-aware round-trip dialect** → `@/markdown/round-trip`
//   (`roundTripDialect`): the public markdown import/export API
//   (`markdownToLexicalState` / `lexicalStateToMarkdown`).
//
// Nothing here merges them: whether the paste path should adopt the
// round-trip dialect so pasted card fences recreate cards is an open product
// question (docs/markdown-api.md).

/**
 * What a markdown dialect speaks, declared as data on the dialect module so
 * the divergence between the two dialects is observable in code, not prose.
 */
export interface MarkdownDialectGrammar {
  /** `[^1]` footnote references. */
  footnotes: boolean
  /** `==mark==` highlight. */
  mark: boolean
  /** `~sub~` and `^sup^`. */
  subSup: boolean
  /** ` ```inkling:<card>``` ` fences recreate cards on import. */
  cardFences: boolean
}

export interface MarkdownDialect {
  name: string
  grammar: MarkdownDialectGrammar
}
