# Plan 020: Add the markdown card transformer (finish the round-trip API)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/markdown/card-transformers.ts src/markdown/round-trip.ts test/markdown/round-trip.test.ts test/markdown/round-trip-cards.test.ts src/nodes/base/nodes/markdown/MarkdownNode.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (follows the established transformer pattern with a round-trip test)
- **Depends on**: none (plan 021 updates the docs to match; do 020 first)
- **Category**: direction
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

The markdown round-trip API shipped with 10 card transformers; the only
remaining card gap is the markdown card itself — visible as
`it.todo('round-trips a markdown card')` in `test/markdown/round-trip.test.ts:51`.
Documents containing markdown cards silently lose them on export. It is also
the cheapest possible transformer: the card's canonical markdown
representation is its own content. `docs/markdown-card-transformers.md:72-79`
establishes the exact per-card implementation pattern this plan follows.

## Current state

- `src/nodes/base/nodes/markdown/MarkdownNode.ts` — a single-property
  decorator node:

  ```ts
  const markdownProperties = [
    { name: 'markdown', default: '', urlType: 'markdown', wordCount: true },
  ] as const satisfies readonly DecoratorNodeProperty[]
  …
  export function $createMarkdownNode(dataset: MarkdownData = {}) {
    return new MarkdownNode(dataset)
  }

  export function $isMarkdownNode(node: unknown): node is MarkdownNode {
    return node instanceof MarkdownNode
  }
  ```

  (There is no `src/nodes/MarkdownNode.tsx` wrapper — the base node is used
  directly; `grep MarkdownNode src/index.ts` returns nothing, but the node is
  registered in `src/nodes/base/inkling-default-nodes.ts`.)

- `src/markdown/card-transformers.ts:32-61` — the `createCardTransformer`
  factory used by 9 of the 10 shipped transformers; the image transformer
  (`:15-30`) shows the hand-written `ElementTransformer` alternative. Factory
  example (`HTML_CARD_TRANSFORMER`, `:63-68`):

  ```ts
  export const HTML_CARD_TRANSFORMER = createCardTransformer({
    card: 'html',
    nodeClass: HtmlNode,
    getData: (node) => ({ html: node.html }),
    createNode: (data) => $createHtmlNode({ html: data.html as string }),
  })
  ```

  Factory output format: fenced ` ```inkling:<card> ` block containing JSON.

- `src/markdown/round-trip.ts:46-79` — `MARKDOWN_NODES` and
  `CARD_TRANSFORMERS` arrays where the new node/transformer register.

- `test/markdown/round-trip-cards.test.ts:1-60` — the test pattern:
  `inklingCard(card, data)` helper builds the fenced block; each test
  round-trips and asserts fields. `test/markdown/round-trip.test.ts:51` holds
  the `it.todo` this plan resolves, with a stale comment claiming decorator
  cards can't serialize — update the comment.

**Design decision (from `docs/markdown-api.md:75-77`, open question 3):** the
markdown card's representation is a fenced ` ```inkling:markdown ` block whose
body is the card's **raw markdown content** (not JSON). Rationale: unlike
other cards, the payload is text that may itself contain JSON-hostile content;
a raw-body fence keeps export byte-identical and human-readable. This deviates
from the `createCardTransformer` JSON factory, so write a hand-rolled
`MultilineElementTransformer` (the factory's type) instead of using it.

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Vitest globals in `test/markdown/`.

## Commands you will need

| Purpose    | Command             | Expected on success |
| ---------- | ------------------- | ------------------- |
| Install    | `pnpm install`      | exit 0              |
| Unit tests | `pnpm test:unit`    | all pass            |
| Typecheck  | `pnpm typecheck`    | exit 0              |
| Lint       | `pnpm lint`         | exit 0              |
| Format     | `pnpm format:check` | exit 0              |

## Scope

**In scope**:

- `src/markdown/card-transformers.ts`
- `src/markdown/round-trip.ts`
- `test/markdown/round-trip-cards.test.ts`
- `test/markdown/round-trip.test.ts` (convert the `it.todo`; update the stale comment)

**Out of scope**:

- HeaderNode round-trip (the other card gap — its data is heavily styled;
  separate decision, tracked in plan 021's doc update and plan 023's list).
- Async metadata population (bookmarks etc.) — documented out of scope in
  `docs/markdown-card-transformers.md:60-69`.
- The opt-in node/transformer list (open question 1) — a separate spike.
- Docs updates — plan 021.

## Git workflow

- Branch: `advisor/020-markdown-card-transformer`
- Commit style: e.g. `feat(markdown): round-trip markdown cards via inkling:markdown fence`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the transformer

In `src/markdown/card-transformers.ts`, add a hand-written
`MultilineElementTransformer` next to the factory-made ones:

````ts
export const MARKDOWN_CARD_TRANSFORMER: MultilineElementTransformer = {
  dependencies: [MarkdownNode],
  export: (node) => {
    if (!$isMarkdownNode(node)) {
      return null
    }
    return '```inkling:markdown\n' + node.markdown + '\n```'
  },
  regExpEnd: /^```\s*$/,
  regExpStart: /^```inkling:markdown\s*$/,
  replace: (rootNode, _children, _startMatch, _endMatch, linesInBetween, _isImport) => {
    const markdown = linesInBetween?.join('\n') ?? ''
    rootNode.append($createMarkdownNode({ markdown }))
  },
  type: 'multiline-element',
}
````

Import `$createMarkdownNode`, `$isMarkdownNode`, `MarkdownNode` from
`@/nodes/base/nodes/markdown/MarkdownNode` (check how other base-node imports
are pathed in this file — it imports wrapper nodes from `@/nodes/*`; the
markdown node has no wrapper, so import the base node directly).

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Register it

In `src/markdown/round-trip.ts`, add `MarkdownNode` to `MARKDOWN_NODES` and
`MARKDOWN_CARD_TRANSFORMER` to `CARD_TRANSFORMERS` (both arrays are at
`:46-77`; add the import alongside the existing card-transformer imports).

**Verify**: `pnpm test:unit -t "round-trip"` → all pass including the new
tests from Step 3.

### Step 3: Tests

- In `test/markdown/round-trip-cards.test.ts`, add
  `it('round-trips a markdown card', …)` following the file's pattern but with
  a raw fence body instead of `inklingCard()`:

  ````ts
  const markdown = '```inkling:markdown\n# Inner heading\n\nSome **bold** text\n```'
  ````

  Assert the node type is `markdown`, `node.markdown` equals the inner
  content, and `lexicalStateToMarkdown(state).trim()` equals the input.
  Add an edge case: empty card (` ```inkling:markdown\n\n``` `) round-trips
  to a markdown node with empty content.

- In `test/markdown/round-trip.test.ts:51`, convert the `it.todo` — either
  delete it (coverage now lives in `round-trip-cards.test.ts`) or replace with
  a one-line test asserting the same round-trip through the file's existing
  `roundTrip` helper. Update the stale comment above it (lines 48–50) to note
  markdown cards round-trip via the `inkling:markdown` fence.

**Verify**: `pnpm test:unit` → all pass; `pnpm lint` → exit 0;
`pnpm format:check` → exit 0.

## Test plan

Covered in Step 3. Also verify no regression: the existing 10 card tests in
`round-trip-cards.test.ts` must pass unmodified.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0; markdown-card round-trip tests exist and pass
- [ ] `grep -n "it.todo('round-trips a markdown card')" test/markdown/round-trip.test.ts` returns no matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- The raw-body fence breaks `@lexical/markdown`'s multiline parsing when the
  card content itself contains a closing ` ``` ` fence (nested fence) — that
  is a real format limitation; report it and fall back to the JSON factory
  format with a `markdown` string field instead of improvising a third format.
- The transformer's `regExpStart` conflicts with another transformer (test
  failures showing the wrong card type parsed) — report the conflict.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- `docs/markdown-api.md` and `docs/markdown-card-transformers.md` must be
  updated to match — that is plan 021, which depends on this one.
- Nested-fence content (a markdown card containing a code fence) is the known
  format edge; if it matters to users, the JSON factory format is the escape
  hatch noted in the STOP conditions.
- HeaderNode is now the only card without a round-trip; decide its
  representation (JSON fence is the obvious candidate) when the need arises.
