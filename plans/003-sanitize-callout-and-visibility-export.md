# Plan 003: Sanitize callout attributes and validate visibility segment in exports

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/nodes/base/utils/clean-dom.ts src/nodes/base/nodes/callout/callout-renderer.ts src/nodes/base/utils/visibility.ts test/nodes-base/nodes/callout.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (callout attribute stripping can alter legitimate formatting if over-aggressive — the allowlist below avoids that)
- **Depends on**: plans/001-harden-url-validation-export-paths.md (callout link hrefs reuse `isSafeUrl`)
- **Category**: security
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Two stored-content injection paths remain in the export layer. (1) The callout
renderer stores rich text as an HTML string (`node.calloutText`) and sanitizes
it with `cleanDOM`, which unwraps disallowed **tags** but never touches
**attributes** — so `onmouseover=…`, `style=…`, or `href="javascript:…"` on an
allowed tag (`A`, `MARK`, `CODE`, …) pass straight into published output.
(2) The web-visibility wrapper embeds `memberSegment` and card content in an
HTML comment marker that downstream publishers parse; a `memberSegment`
containing `-->` terminates the comment early, un-gating restricted content and
injecting live markup.

## Current state

- `src/nodes/base/utils/clean-dom.ts` — the whole file:

  ```ts
  export function cleanDOM(node: Element, allowedTags: string[]) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i]
      if (child.nodeType === 1 && !allowedTags.includes((child as Element).tagName)) {
        while (child.firstChild) {
          node.insertBefore(child.firstChild, child)
        }
        node.removeChild(child)
        i -= 1
      } else if (child.nodeType === 1) {
        cleanDOM(child as Element, allowedTags)
      }
    }
  }
  ```

  Only caller: `src/nodes/base/nodes/callout/callout-renderer.ts:36-42`:

  ```ts
  const temporaryContainer = document.createElement('div')
  temporaryContainer.innerHTML = node.calloutText

  const allowedTags = ['A', 'STRONG', 'EM', 'B', 'I', 'BR', 'CODE', 'MARK', 'S', 'DEL', 'U', 'SUP', 'SUB']
  cleanDOM(temporaryContainer, allowedTags)

  textElement.innerHTML = temporaryContainer.innerHTML
  ```

  (`node.calloutText` originates from pasted/nested-editor content — see
  `callout-parser.ts`, which reads `innerHTML`.)

- `src/nodes/base/utils/visibility.ts:216-225` — the web wrapper:

  ```ts
  function _renderWithWebVisibility(
    document: Document,
    content: string,
    webVisibility: { nonMember: boolean; memberSegment: string },
  ): ExportDOMOutput<'value'> {
    const { nonMember, memberSegment } = webVisibility
    const wrappedContent = `\n<!--inkling-gated-block:begin nonMember:${nonMember} memberSegment:"${memberSegment}" -->${content}<!--inkling-gated-block:end-->\n`
    const textarea = document.createElement('textarea')
    textarea.value = wrappedContent
    return { element: textarea, type: 'value' as const }
  }
  ```

  Documented segment alphabet (comments at `visibility.ts:84-87`):
  `memberSegment: '' = no-one`, `'status:free'`, `'status:-free'`,
  `'status:free,status:-free'` — i.e. comma-separated `status:` tokens. The
  constants `ALL_MEMBERS_SEGMENT` / `NO_MEMBERS_SEGMENT` are defined in this
  same file (lines 13–16 area); reuse them.

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Vitest globals. Existing tests:
`test/nodes-base/nodes/callout.test.ts` (pattern to follow). Visibility has no
dedicated test file — create `test/nodes-base/utils/visibility.test.ts`; model
its structure on `test/nodes-base/utils/is-safe-url.test.ts`.

## Commands you will need

| Purpose    | Command             | Expected on success |
| ---------- | ------------------- | ------------------- |
| Install    | `pnpm install`      | exit 0              |
| Typecheck  | `pnpm typecheck`    | exit 0              |
| Lint       | `pnpm lint`         | exit 0              |
| Unit tests | `pnpm test:unit`    | all pass            |
| Format     | `pnpm format:check` | exit 0              |

## Scope

**In scope**:

- `src/nodes/base/utils/clean-dom.ts`
- `src/nodes/base/nodes/callout/callout-renderer.ts` (only if the allowlist
  constant needs to move — prefer keeping changes in `clean-dom.ts`)
- `src/nodes/base/utils/visibility.ts`
- `test/nodes-base/nodes/callout.test.ts`
- `test/nodes-base/utils/visibility.test.ts` (create)

**Out of scope**:

- Other users of `node.calloutText` (editor UI renders it through React/Lexical,
  which is not an HTML-injection sink).
- Changing the gated-block comment marker format itself — downstream publishers
  parse it; this plan only constrains the interpolated values.
- `email` visibility rendering (it does not use the comment marker).
- DOMPurify adoption — the repo already has a hand-rolled cleaner; extending it
  is the minimal change. Do not add a new dependency.

## Git workflow

- Branch: `advisor/003-sanitize-callout-visibility`
- Commit style: e.g. `fix(renderers): strip non-allowlisted attributes in callout export`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Strip non-allowlisted attributes in `cleanDOM`

Extend `cleanDOM` with a second parameter and attribute filtering. Target
shape:

```ts
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  A: ['href'],
}

export function cleanDOM(
  node: Element,
  allowedTags: string[],
  allowedAttributes: Record<string, string[]> = ALLOWED_ATTRIBUTES,
) {
  // existing tag-unwrap loop, plus for each surviving element child:
  //   - remove every attribute whose name is not in allowedAttributes[tagName]
  //   - for A[href], additionally require isSafeUrl(value); remove the attribute otherwise
}
```

Keep the unwrap behavior for disallowed tags exactly as-is (children survive).
Import `isSafeUrl` from `@/nodes/base/utils/is-safe-url`. Update the callout
renderer's call only if the default parameter isn't sufficient (it should be).

**Verify**: `pnpm test:unit -t "callout"` → all pass, including new tests from
the Test plan.

### Step 2: Validate `memberSegment` and coerce `nonMember`

In `_renderWithWebVisibility`:

```ts
const SEGMENT_REGEX = /^(status:[\w+-]+,)*status:[\w+-]+$/
const safeSegment = memberSegment === '' || SEGMENT_REGEX.test(memberSegment) ? memberSegment : ''
const safeNonMember = nonMember === true
```

Use `safeSegment`/`safeNonMember` in the marker. Empty string is valid
("no-one"). Add an exported helper if the same validation is needed elsewhere —
but only if a second caller exists; otherwise keep it local.

**Verify**: `pnpm test:unit -t "visibility"` → all pass.

### Step 3: Full verification

`pnpm typecheck` → exit 0; `pnpm lint` → exit 0; `pnpm test:unit` → all pass.

## Test plan

- `test/nodes-base/nodes/callout.test.ts` — extend with export cases:
  - `calloutText: '<a href="javascript:alert(1)" onmouseover="alert(2)">x</a>'`
    → exported HTML contains the `<a>` with **no** `href` and **no**
    `onmouseover`.
  - `calloutText: '<a href="https://example.com">ok</a>'` → `href` preserved.
  - `calloutText: '<mark style="background:red" onclick="x">m</mark>'` →
    `style` and `onclick` removed, text preserved.
  - regression: `<strong>bold</strong>` and disallowed-tag unwrapping
    (`<div><script>…</script>text</div>` → script tag removed per existing
    tag behavior) still work as before.
- `test/nodes-base/utils/visibility.test.ts` (new) — call the web-visibility
  render path (import from `@/nodes/base/utils/visibility`; check the file's
  exports for the public entry — if only internal functions are exported,
  export a small wrapper for testability rather than testing through DOM
  internals):
  - `memberSegment: 'status:free'` → marker contains `memberSegment:"status:free"`.
  - `memberSegment: 'status:free,status:-free'` → preserved.
  - `memberSegment: '--><img src=x onerror=alert(1)>'` → falls back to `''`;
    output contains no `-->` before the intended comment end and no `<img`.
  - `nonMember` truthy non-boolean (e.g. `"yes"` as unknown as boolean) →
    rendered as `false`.

Verification: `pnpm test:unit` → all pass including new tests.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0; new callout and visibility tests exist and pass
- [ ] `grep -n "cleanDOM" src/ test/` shows the attribute allowlist wired in
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- A real callout in existing tests/fixtures relies on attributes outside the
  allowlist (e.g. `class` on `<a>`) — report the attribute; do not silently
  expand the allowlist beyond `A[href]`.
- `memberSegment` values in existing fixtures fail `SEGMENT_REGEX` — that means
  the documented alphabet is incomplete; report the actual values seen.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- `cleanDOM` now owns both tag and attribute policy for stored-HTML export.
  If a future card needs stored-HTML sanitization, reuse it rather than writing
  a second cleaner; extend `ALLOWED_ATTRIBUTES` deliberately per tag.
- The gated-block marker is parsed by downstream publishing systems; the
  `status:` token regex must stay in sync with the documented format in the
  comments at `visibility.ts:70-90`. If new segment kinds appear (e.g.
  `label:`), update regex, docs, and tests together.
- Reviewers should confirm no fixture snapshots legitimately contained event
  handlers — any snapshot change here is the fix working, not a regression.
