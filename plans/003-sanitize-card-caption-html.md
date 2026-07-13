# Plan 003: Sanitize caption HTML in image, gallery, and code-block renderers

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/nodes/base/nodes/image/image-renderer.ts src/nodes/base/nodes/gallery/gallery-renderer.ts src/nodes/base/nodes/codeblock/codeblock-renderer.ts test/nodes-base/nodes/image.test.ts test/nodes-base/nodes/gallery.test.ts test/nodes-base/nodes/codeblock.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

The image, gallery, and code-block card renderers assign `node.caption` directly to `innerHTML`. A malicious serialized caption can therefore inject arbitrary markup and scripts into the exported HTML. The bookmark renderer already sanitizes its caption with `sanitizeHtml(node.caption)`; these three renderers should do the same for consistency and safety.

## Current state

- `src/nodes/base/nodes/image/image-renderer.ts:147-150`
- `src/nodes/base/nodes/gallery/gallery-renderer.ts:196-199`
- `src/nodes/base/nodes/codeblock/codeblock-renderer.ts:30-37`

Excerpts:

```ts
// src/nodes/base/nodes/image/image-renderer.ts:147
if (node.caption) {
  const caption = document.createElement('figcaption')
  caption.innerHTML = node.caption
  figure.appendChild(caption)
}
```

```ts
// src/nodes/base/nodes/gallery/gallery-renderer.ts:196
if (node.caption) {
  const figcaption = document.createElement('figcaption')
  figcaption.innerHTML = node.caption
  figure.appendChild(figcaption)
  figure.setAttribute('class', `${figure.getAttribute('class')} inkling-card-hascaption`)
}
```

```ts
// src/nodes/base/nodes/codeblock/codeblock-renderer.ts:30
if (node.caption) {
  const figure = document.createElement('figure')
  figure.setAttribute('class', 'inkling-card inkling-code-card')
  figure.appendChild(pre)

  const figcaption = document.createElement('figcaption')
  figcaption.innerHTML = node.caption
  figure.appendChild(figcaption)

  return { element: figure, type: 'outer' as const }
}
```

Comparison — the bookmark renderer already does this safely at `src/nodes/base/nodes/bookmark/bookmark-renderer.ts:201-203`:

```ts
const figCaption = document.createElement('figcaption')
figCaption.innerHTML = sanitizeHtml(caption)
element.appendChild(figCaption)
```

Repo conventions:

- Card renderer tests live in `test/nodes-base/nodes/<card>.test.ts`.
- Import paths inside `src/nodes/base/nodes/*` use `@/nodes/base/utils/*` and `@/utils/*`.

## Commands you will need

| Purpose   | Command                            | Expected on success |
| --------- | ---------------------------------- | ------------------- | ----------- | -------- |
| Typecheck | `pnpm typecheck`                   | exit 0, no errors   |
| Lint      | `pnpm lint`                        | exit 0              |
| Tests     | `pnpm test:unit -t "image renderer | gallery renderer    | codeblock"` | all pass |
| Full unit | `pnpm test:unit`                   | all pass            |

## Scope

**In scope**:

- `src/nodes/base/nodes/image/image-renderer.ts`
- `src/nodes/base/nodes/gallery/gallery-renderer.ts`
- `src/nodes/base/nodes/codeblock/codeblock-renderer.ts`
- `test/nodes-base/nodes/image.test.ts`
- `test/nodes-base/nodes/gallery.test.ts`
- `test/nodes-base/nodes/codeblock.test.ts`

**Out of scope**:

- Other renderers (bookmark already sanitizes; audio/video/file captions are handled separately).
- Changing the `sanitizeHtml` implementation itself (separate plan).

## Git workflow

- Branch: `advisor/003-sanitize-card-caption-html`
- Commit message style: `fix(renderers): sanitize captions in image, gallery, and code-block cards`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Import `sanitizeHtml` where needed

In each of the three renderer files, ensure `sanitizeHtml` is imported from `@/utils/sanitize-html`.

- `src/nodes/base/nodes/image/image-renderer.ts`
- `src/nodes/base/nodes/gallery/gallery-renderer.ts`
- `src/nodes/base/nodes/codeblock/codeblock-renderer.ts`

Bookmark renderer is the exemplar:

```ts
import { sanitizeHtml } from '@/utils/sanitize-html'
```

### Step 2: Wrap caption assignment with `sanitizeHtml`

Change the three `innerHTML = node.caption` lines to `innerHTML = sanitizeHtml(node.caption)`.

Target shapes:

```ts
// image-renderer.ts
caption.innerHTML = sanitizeHtml(node.caption)
```

```ts
// gallery-renderer.ts
figcaption.innerHTML = sanitizeHtml(node.caption)
```

```ts
// codeblock-renderer.ts
figcaption.innerHTML = sanitizeHtml(node.caption)
```

Do not change any other logic (class names, parent insertion, etc.).

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Add regression tests

In each corresponding `test/nodes-base/nodes/<card>.test.ts` file, add a test that exports a card with a caption containing a `<script>` tag or `onclick` attribute and asserts the exported HTML does not contain the malicious markup.

Example assertion shape (adapt to the existing test helper style):

```ts
it('sanitizes caption HTML', () => {
  const result = exportCard({ ...defaultNodeData, caption: '<img src=x onerror=alert(1)>' })
  expect(result.html).not.toContain('onerror')
  expect(result.html).not.toContain('<img')
})
```

If the test files do not have an existing helper for rendering a card to HTML, model the test after the existing assertions in `test/nodes-base/nodes/bookmark.test.ts` (which already exercises `sanitizeHtml` behavior, if present) or the simplest existing test in the target file.

**Verify**: `pnpm test:unit -t "image renderer|gallery renderer|codeblock"` → all pass, including new tests.

### Step 4: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit` → exit 0

## Test plan

- Add one regression test per card in:
  - `test/nodes-base/nodes/image.test.ts`
  - `test/nodes-base/nodes/gallery.test.ts`
  - `test/nodes-base/nodes/codeblock.test.ts`
- Each test asserts that a malicious caption is sanitized in the exported HTML.

## Done criteria

- [ ] `image-renderer.ts`, `gallery-renderer.ts`, and `codeblock-renderer.ts` use `sanitizeHtml(node.caption)`.
- [ ] Regression tests exist for all three cards and pass.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- Any of the three renderer files do not contain the excerpted `innerHTML = node.caption` lines.
- A renderer already imports `sanitizeHtml` under a different name or uses a conflicting sanitizer.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Any future card that renders user-controlled caption HTML should follow the bookmark pattern: `figcaption.innerHTML = sanitizeHtml(caption)`.
- If captions later need to support limited inline formatting (bold, italic), extend `sanitizeHtml` with an explicit allowlist rather than bypassing it.
