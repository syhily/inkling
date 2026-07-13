# Plan 004: Validate navigation URLs in gallery and file card renderers

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/nodes/base/nodes/gallery/gallery-renderer.ts src/nodes/base/nodes/file/file-renderer.ts test/nodes-base/nodes/gallery.test.ts test/nodes-base/nodes/file.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

The gallery and file card renderers set `href` attributes from serialized node data without validating the URL scheme. A malicious `javascript:` or `data:text/html` URL in `image.href` or `node.src` executes when a reader clicks the rendered card. The codebase already has `isSafeUrl` for navigation URLs; applying it here aligns these cards with the existing URL-safety policy.

## Current state

- `src/nodes/base/utils/is-safe-url.ts` defines:

```ts
export function isSafeUrl(url: string): boolean
```

It allows only `http:`, `https:`, and scheme-less relative URLs.

- `src/nodes/base/nodes/gallery/gallery-renderer.ts:182-186`:

```ts
if (image.href) {
  const a = document.createElement('a')
  a.setAttribute('href', image.href)
  a.appendChild(img)
  imgDiv.appendChild(a)
}
```

- `src/nodes/base/nodes/file/file-renderer.ts:102-110`:

```ts
const container = document.createElement('a')
container.setAttribute('class', 'inkling-file-card-container')
container.setAttribute('href', node.src)
container.setAttribute('title', 'Download')
container.setAttribute('download', '')
```

- The file renderer's email template also uses `node.src` as an `href` at lines 49, 62, 71, 77, 83.

Repo conventions:

- `isSafeUrl` and `isSafeMediaUrl` live in `src/nodes/base/utils/is-safe-url.ts`.
- The bookmark renderer already uses `isSafeUrl(node.url)` at `src/nodes/base/nodes/bookmark/bookmark-renderer.ts:26`.

## Commands you will need

| Purpose   | Command                              | Expected on success |
| --------- | ------------------------------------ | ------------------- | -------- |
| Typecheck | `pnpm typecheck`                     | exit 0, no errors   |
| Lint      | `pnpm lint`                          | exit 0              |
| Tests     | `pnpm test:unit -t "gallery renderer | file renderer"`     | all pass |
| Full unit | `pnpm test:unit`                     | all pass            |

## Scope

**In scope**:

- `src/nodes/base/nodes/gallery/gallery-renderer.ts`
- `src/nodes/base/nodes/file/file-renderer.ts`
- `test/nodes-base/nodes/gallery.test.ts`
- `test/nodes-base/nodes/file.test.ts` (create if absent)

**Out of scope**:

- Media `src` URLs (images, audio, video thumbnails) — those use `isSafeMediaUrl` and are covered separately.
- Changing `isSafeUrl` itself.

## Git workflow

- Branch: `advisor/004-validate-card-navigation-urls`
- Commit message style: `fix(renderers): validate gallery and file card hrefs with isSafeUrl`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Import `isSafeUrl`

Ensure both renderer files import `isSafeUrl` from `@/nodes/base/utils/is-safe-url`:

```ts
import { isSafeUrl } from '@/nodes/base/utils/is-safe-url'
```

### Step 2: Validate gallery image `href`

In `src/nodes/base/nodes/gallery/gallery-renderer.ts`, guard the anchor creation:

```ts
if (image.href && isSafeUrl(image.href)) {
  const a = document.createElement('a')
  a.setAttribute('href', image.href)
  a.appendChild(img)
  imgDiv.appendChild(a)
} else {
  imgDiv.appendChild(img)
}
```

This preserves the existing behavior for safe URLs and renders an unlinked image for unsafe/missing URLs.

### Step 3: Validate file card `href`

In `src/nodes/base/nodes/file/file-renderer.ts`, the card template wraps the whole card in an anchor. If `node.src` is unsafe, render the card as a non-clickable container instead.

Current target shape:

```ts
function cardTemplate(node: FileNodeData, document: Document) {
  const card = document.createElement('div')
  card.setAttribute('class', 'inkling-card inkling-file-card')

  const contents = document.createElement('div')
  contents.setAttribute('class', 'inkling-file-card-contents')
  // ... existing title/caption/meta construction ...

  if (node.src && isSafeUrl(node.src)) {
    const container = document.createElement('a')
    container.setAttribute('class', 'inkling-file-card-container')
    container.setAttribute('href', node.src)
    container.setAttribute('title', 'Download')
    container.setAttribute('download', '')
    container.appendChild(contents)
    card.appendChild(container)
  } else {
    const container = document.createElement('div')
    container.setAttribute('class', 'inkling-file-card-container')
    container.appendChild(contents)
    card.appendChild(container)
  }

  return { element: card, type: 'outer' as const }
}
```

Keep the existing DOM structure and class names; only change the wrapper element from `a` to `div` when the URL is unsafe.

### Step 4: Validate email template file links

In the same file's `emailTemplate`, the `href` variable is built from `options.postUrl || node.src`. If `href` is present, validate it with `isSafeUrl` before using it in `wrapWithAnchor`. If invalid, omit the anchor wrapper and render the text unlinked.

### Step 5: Add regression tests

Add tests in `test/nodes-base/nodes/gallery.test.ts` and `test/nodes-base/nodes/file.test.ts` that export a card with `href`/`src` set to `javascript:alert(1)` and assert the output does not contain `javascript:` in an `href` attribute (or that no anchor is produced).

Also test that safe `https://example.com` still produces a normal link.

**Verify**: `pnpm test:unit -t "gallery renderer|file renderer"` → all pass.

### Step 6: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit` → exit 0

## Test plan

- `test/nodes-base/nodes/gallery.test.ts`: add "skips unsafe image href" and "preserves safe image href".
- `test/nodes-base/nodes/file.test.ts`: add "skips unsafe file src href" and "preserves safe file src href".
- If `test/nodes-base/nodes/file.test.ts` does not exist, create it modeled on `test/nodes-base/nodes/gallery.test.ts`.

## Done criteria

- [ ] Gallery renderer validates `image.href` with `isSafeUrl` before creating an anchor.
- [ ] File renderer validates `node.src` with `isSafeUrl` in both card and email templates.
- [ ] Regression tests exist for unsafe and safe URLs in both cards.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- The gallery or file renderer files do not match the excerpts above.
- `isSafeUrl` is not importable from `@/nodes/base/utils/is-safe-url`.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Any future card that turns user data into an `href` should validate with `isSafeUrl` before setting the attribute.
- If relative file URLs need to remain supported, `isSafeUrl` already permits scheme-less strings, so no extra handling is required.
