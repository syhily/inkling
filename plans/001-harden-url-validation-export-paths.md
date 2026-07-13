# Plan 001: Harden URL validation across all export paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/nodes/base/utils/is-safe-url.ts src/html/renderer/utils/TextContent.ts src/nodes/base/nodes/image/image-renderer.ts src/nodes/base/nodes/button/button-renderer.ts test/nodes-base/utils/is-safe-url.test.ts test/html-renderer/links.test.ts test/nodes-base/nodes/image.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

The editor exports documents to HTML (web) and email. A previous hardening pass
(commits `564ac15`, `cdcaf15`, `5301033`) added `isSafeUrl` validation to card
renderers, but three gaps remain: (1) `isSafeUrl` itself is bypassable — a URL
like `jav\tascript:alert(1)` contains a tab inside the scheme, so the scheme
regex does not match and the value is treated as a "relative URL" and allowed,
while browsers strip ASCII tab/LF/CR before scheme parsing and navigate it as
`javascript:`; (2) inline rich-text links (the most common link type) are
exported with no validation at all; (3) the image card `href` and button card
`href` were missed by the card hardening. The result: a document JSON
containing a `javascript:` link produces a live script link in published
content.

## Current state

- `src/nodes/base/utils/is-safe-url.ts` — the two URL validators. Current scheme
  check (lines 16–23):

  ```ts
  const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!schemeMatch) {
    // No scheme -> treat as a relative URL
    return true
  }
  ```

  `isSafeMediaUrl` (lines 31–49) has the identical structure. Both need the fix.

- `src/html/renderer/utils/TextContent.ts:159-163` — inline link export, no
  validation:

  ```ts
  _buildAnchorElement(anchor: HTMLElement, node: LinkNode) {
    // Only set the href if we have a URL, otherwise we get a link to the current page
    if (node.getURL()) {
      anchor.setAttribute('href', node.getURL())
    }
  ```

- `src/nodes/base/nodes/image/image-renderer.ts:139-146` — image card link, no
  validation (the sibling gallery renderer validates the identical field):

  ```ts
  if (node.href) {
    const a = document.createElement('a')
    a.setAttribute('href', node.href)
    a.appendChild(img)
    figure.appendChild(a)
  ```

- `src/nodes/base/nodes/button/button-renderer.ts:37` — button frontend template
  sets `button.setAttribute('href', node.buttonUrl)` raw; the email template
  interpolates `href="${buttonUrl}"` (lines 58, 96) with no `isSafeUrl` call.
  (The email-template _escaping_ is fixed by plan 002; this plan adds the scheme
  validation.)

- Existing test files to extend (use as patterns, do not rewrite):
  - `test/nodes-base/utils/is-safe-url.test.ts` — validator unit tests
  - `test/html-renderer/links.test.ts` — inline-link HTML export tests
  - `test/nodes-base/nodes/image.test.ts` — image card renderer tests
  - `test/nodes-base/nodes/button.test.ts` — button card renderer tests

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, print width 120 (enforced by `oxfmt`). Tests use Vitest with globals
enabled (`describe`/`it`/`expect` available without import in most suites;
`test/html-renderer` files import from `vitest` explicitly — match the file you
edit). Renderer tests follow the pattern in `test/nodes-base/nodes/gallery.test.ts`,
which already asserts `isSafeUrl` behavior — read it first and mirror its style.

## Commands you will need

| Purpose    | Command             | Expected on success                                   |
| ---------- | ------------------- | ----------------------------------------------------- |
| Install    | `pnpm install`      | exit 0                                                |
| Typecheck  | `pnpm typecheck`    | exit 0, no errors                                     |
| Lint       | `pnpm lint`         | exit 0                                                |
| Unit tests | `pnpm test:unit`    | all pass (runs `pnpm build` first via `pretest:unit`) |
| Format     | `pnpm format:check` | exit 0                                                |

## Scope

**In scope** (the only files you should modify):

- `src/nodes/base/utils/is-safe-url.ts`
- `src/html/renderer/utils/TextContent.ts`
- `src/nodes/base/nodes/image/image-renderer.ts`
- `src/nodes/base/nodes/button/button-renderer.ts`
- `test/nodes-base/utils/is-safe-url.test.ts`
- `test/html-renderer/links.test.ts`
- `test/nodes-base/nodes/image.test.ts`
- `test/nodes-base/nodes/button.test.ts`

**Out of scope** (do NOT touch, even though they look related):

- The other card renderers (bookmark, file, gallery, header) — they already
  validate; verified during the audit.
- `src/components/ui/FloatingLinkToolbar.tsx` / `AtLinkPlugin.tsx` input-side
  validation — export-side validation is sufficient for this plan; input-side
  validation is a product decision (silently refusing typed URLs is a UX change).
- Video/audio/bookmark renderer _escaping_ — covered by plan 002.
- Any public API change.

## Git workflow

- Branch: `advisor/001-harden-url-validation`
- One commit per step is fine; message style from `git log`: conventional, e.g.
  `fix(utils): reject control characters in isSafeUrl scheme check`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Reject control characters in both URL validators

In `src/nodes/base/utils/is-safe-url.ts`, before the scheme regex check in
**both** `isSafeUrl` and `isSafeMediaUrl`, reject URLs containing ASCII control
characters or whitespace anywhere (not just leading/trailing). Browsers strip
`\t`, `\n`, `\r` from URLs before parsing, so `jav\tascript:` must not be
treated as relative:

```ts
// Browsers strip ASCII tab/LF/CR before scheme parsing; a URL containing
// them can smuggle a dangerous scheme past the regex below.
if (/[\x00-\x20]/.test(trimmed)) {
  return false
}
```

Place it after the empty-string check, before `schemeMatch`. Do not change the
allowed-scheme lists.

**Verify**: add the Step 1 tests below, then `pnpm test:unit -t "isSafeUrl"` →
all pass, including new tab/newline cases.

### Step 2: Validate inline-link hrefs at export

In `src/html/renderer/utils/TextContent.ts`, import `isSafeUrl` from
`@/nodes/base/utils/is-safe-url` and gate the href:

```ts
if (node.getURL() && isSafeUrl(node.getURL())) {
  anchor.setAttribute('href', node.getURL())
}
```

The existing comment ("Only set the href if we have a URL…") already documents
the no-href fallback — keep it, extend it with one clause noting unsafe URLs
are also dropped.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Validate image card href at export

In `src/nodes/base/nodes/image/image-renderer.ts`, wrap the anchor creation:

```ts
if (node.href && isSafeUrl(node.href)) {
```

`isSafeUrl` is already imported in sibling renderers (check
`gallery-renderer.ts` for the exact import path and match it).

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Validate button href in both button templates

In `src/nodes/base/nodes/button/button-renderer.ts`:

- Frontend template (~line 37): compute
  `const safeButtonUrl = isSafeUrl(node.buttonUrl) ? node.buttonUrl : ''` and
  use `button.setAttribute('href', safeButtonUrl)`.
- Email template (lines 58, 96): replace `href="${buttonUrl}"` with
  `href="${safeButtonUrl}"` using the same local. Do not add escaping here —
  plan 002 owns that.

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.

## Test plan

Add tests to the existing files (match their current structure and imports):

- `test/nodes-base/utils/is-safe-url.test.ts` — new cases for **both**
  `isSafeUrl` and `isSafeMediaUrl`:
  - `jav\tascript:alert(1)` (tab inside scheme) → `false`
  - `java\nscript:alert(1)` (newline) → `false`
  - `java\rscript:alert(1)` (CR) → `false`
  - `https://example.com/a b` (space in path) → `false`
  - regression: `/relative/path`, `https://example.com`, `data:image/png;base64,...`
    (media only) still → `true`
- `test/html-renderer/links.test.ts` — export a link node with URL
  `javascript:alert(1)`; assert the output `<a>` has no `href` attribute.
  Regression: `https://example.com` and `/posts/hello` links keep their href.
- `test/nodes-base/nodes/image.test.ts` — image card with `href:
'javascript:alert(1)'` renders the `<img>` without a wrapping `<a>` (or with
  an `<a>` lacking href — assert whichever shape your implementation produces
  and keep it consistent). Regression: safe href still wraps.
- `test/nodes-base/nodes/button.test.ts` — button with
  `buttonUrl: 'javascript:alert(1)'` renders `href=""` in both frontend and
  email templates. Regression: `https://` URL preserved.

Verification: `pnpm test:unit` → all pass, including the new tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0; the new test cases listed above exist and pass
- [ ] `grep -n "setAttribute('href', node.getURL())" src/html/renderer/utils/TextContent.ts` returns no matches
- [ ] `grep -n "setAttribute('href', node.href)" src/nodes/base/nodes/image/image-renderer.ts` returns no matches
- [ ] `grep -n 'href="\${buttonUrl}"' src/nodes/base/nodes/button/button-renderer.ts` returns no matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- Rejecting `[\x00-\x20]` breaks an existing test that relies on URLs with
  literal spaces — that would mean real content contains such URLs and the
  rejection needs a narrower design; report the failing case.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- `isSafeUrl` is the single choke point for navigation URLs in export; any new
  card renderer with a user-controlled `href` must use it (see plan 002 for the
  escaping half of the contract). A reviewer should check that every new
  `setAttribute('href', …)` / `href="${…}"` in `src/nodes/base/nodes/**` and
  `src/html/**` goes through `isSafeUrl`.
- Input-side validation (link toolbar, at-link) is deliberately deferred: it is
  a UX decision. If added later, reuse the same helper rather than a second
  regex.
