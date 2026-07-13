# Plan 015: Implement decorator-card markdown transformers

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/markdown/card-transformers.ts src/markdown/round-trip.ts test/markdown/round-trip-cards.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

The public markdown round-trip API currently supports headings, lists, links, code blocks, horizontal rules, and images. Decorator cards (gallery, bookmark, audio, video, toggle, callout, button, file, html) are silently dropped or lost on import/export. `docs/markdown-card-transformers.md` already defines canonical markdown representations for each card. Implementing these transformers makes the round-trip API usable for real Inkling documents.

## Current state

- `src/markdown/card-transformers.ts` — only implements `IMAGE_CARD_TRANSFORMER`:

```ts
import type { ElementTransformer } from '@lexical/markdown'

import { $createImageNode, $isImageNode, ImageNode } from '@/nodes/ImageNode'

export const IMAGE_CARD_TRANSFORMER: ElementTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null
    }
    return `![${node.alt || ''}](${node.src})`
  },
  regExp: /^!\[([^\]]*)\]\(([^)]+)\)$/,
  replace: (parentNode, _children, match, _isImport) => {
    const [, alt, src] = match
    const node = $createImageNode({ src, alt, caption: '' })
    parentNode.replace(node)
  },
  type: 'element',
}
```

- `src/markdown/round-trip.ts` — registers only `ImageNode` from the decorator set:

```ts
const MARKDOWN_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  CodeBlockNode,
  HorizontalRuleNode,
  ImageNode,
]
```

- `test/markdown/round-trip-cards.test.ts` — only tests image round-trip.
- `docs/markdown-card-transformers.md` — defines canonical formats for Gallery, Bookmark, Audio, Video, Toggle, Callout, Button, File, HTML.

Repo conventions:

- Transformers are `ElementTransformer` objects from `@lexical/markdown`.
- Round-trip tests call `markdownToLexicalState` and `lexicalStateToMarkdown` from `src/markdown/round-trip.ts`.
- Card nodes are created via `$create<Node>` helpers in wrapper node files.

## Commands you will need

| Purpose   | Command                                   | Expected on success |
| --------- | ----------------------------------------- | ------------------- |
| Typecheck | `pnpm typecheck`                          | exit 0, no errors   |
| Lint      | `pnpm lint`                               | exit 0              |
| Tests     | `pnpm test:unit -t "Markdown round-trip"` | all pass            |
| Full unit | `pnpm test:unit`                          | all pass            |

## Scope

**In scope**:

- `src/markdown/card-transformers.ts` — add transformers for decorator cards.
- `src/markdown/round-trip.ts` — register the corresponding nodes and transformers.
- `test/markdown/round-trip-cards.test.ts` — add round-trip tests for each implemented card.

**Out of scope**:

- Async metadata fetching (bookmark thumbnails, image dimensions, etc.) — keep transformers synchronous per the spike doc.
- Changing the public API signature (still synchronous; optional node lists are a future design question).
- `MarkdownNode` transformer (still `.todo` until its canonical form is decided).

## Git workflow

- Branch: `advisor/015-implement-card-markdown-transformers`
- Commit message style: `feat(markdown): add round-trip transformers for decorator cards`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Implement one transformer at a time

For each card in the order below, add an `ElementTransformer` to `src/markdown/card-transformers.ts` and register its node in `src/markdown/round-trip.ts`.

Recommended order (simplest first):

1. HTML card (`HtmlNode`) — fenced code block with language `inkling:html`.
2. File card (`FileNode`) — fenced code block with language `inkling:file` and JSON metadata.
3. Button card (`ButtonNode`) — fenced code block with language `inkling:button` and JSON metadata.
4. Audio card (`AudioNode`) — fenced code block with language `inkling:audio` and JSON metadata.
5. Video card (`VideoNode`) — fenced code block with language `inkling:video` and JSON metadata.
6. Gallery card (`GalleryNode`) — fenced code block with language `inkling:gallery` and JSON metadata.
7. Bookmark card (`BookmarkNode`) — fenced code block with language `inkling:bookmark` and JSON metadata.
8. Toggle card (`ToggleNode`) — fenced code block with language `inkling:toggle` and nested markdown content.
9. Callout card (`CalloutNode`) — fenced code block with language `inkling:callout` and nested markdown content.

Example transformer shape for a JSON-metadata card (File):

````ts
export const FILE_CARD_TRANSFORMER: ElementTransformer = {
  dependencies: [FileNode],
  export: (node) => {
    if (!$isFileNode(node)) {
      return null
    }
    const data = JSON.stringify({
      src: node.src,
      fileName: node.fileName,
      fileCaption: node.fileCaption,
    })
    return `\`\`\`inkling:file\n${data}\n\`\`\``
  },
  regExp: /^```inkling:file\s([\s\S]*?)```$/,
  replace: (parentNode, _children, match, _isImport) => {
    const [, json] = match
    const data = JSON.parse(json)
    const node = $createFileNode({
      src: data.src,
      fileName: data.fileName,
      fileCaption: data.fileCaption,
    })
    parentNode.replace(node)
  },
  type: 'element',
}
````

For Toggle/Callout, the fenced block contains nested markdown. Use the existing `$convertFromMarkdownString`/`$convertToMarkdownString` inside the transformer to handle nested content, or store plain text fields if nested markdown support is too complex for this plan. If nested markdown proves complex, document the limitation and stop at plain fields.

### Step 2: Register nodes and transformers

In `src/markdown/round-trip.ts`:

1. Import the wrapper nodes and transformers for the cards you implement.
2. Add each node to `MARKDOWN_NODES`.
3. Add each transformer to `TRANSFORMERS`.

### Step 3: Add round-trip tests

For each implemented card, add a test in `test/markdown/round-trip-cards.test.ts` that:

1. Defines a markdown string using the canonical format.
2. Calls `markdownToLexicalState` and asserts the resulting node type and fields.
3. Calls `lexicalStateToMarkdown` and asserts the output matches the input (or matches the documented dropped-field behavior).

Example:

````ts
it('round-trips a file card', function () {
  const markdown =
    '```inkling:file\n{"src":"https://example.com/file.pdf","fileName":"report.pdf","fileCaption":"Q3 report"}\n```'
  const state = markdownToLexicalState(markdown)

  const fileNode = state.root.children[0] as { type: string; src: string; fileName: string }
  expect(fileNode.type).toBe('file')
  expect(fileNode.src).toBe('https://example.com/file.pdf')

  const exported = lexicalStateToMarkdown(state)
  expect(exported.trim()).toBe(markdown)
})
````

### Step 4: Run tests iteratively

After each card transformer, run:

```bash
pnpm test:unit -t "Markdown round-trip"
```

Fix failures before moving to the next card.

### Step 5: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit -t "Markdown round-trip"` → all pass
- `pnpm test:unit` → exit 0

## Test plan

- Updated file: `test/markdown/round-trip-cards.test.ts`.
- One test per implemented card covering import and export.
- If nested markdown for Toggle/Callout is deferred, add a test for the plain-field subset and document the limitation.

## Done criteria

- [ ] `src/markdown/card-transformers.ts` exports transformers for the implemented decorator cards.
- [ ] `src/markdown/round-trip.ts` registers the corresponding nodes and transformers.
- [ ] `test/markdown/round-trip-cards.test.ts` covers each implemented card.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- A card node does not have a `$create<Node>` helper or `$is<Node>` guard.
- The `replace` transformer cannot create the node because required constructor arguments are missing.
- Nested markdown for Toggle/Callout proves too complex; report which cards are done and which are blocked.

## Maintenance notes

- The public markdown API signature may later accept optional node/transformer lists; keep the transformer exports public so they can be reused.
- Async metadata (bookmark thumbnails, image dimensions) remains out of scope; document dropped fields clearly in `docs/markdown-card-transformers.md` if not already.
- A reviewer should verify that no new circular imports are introduced between `src/markdown/` and `src/nodes/`.
