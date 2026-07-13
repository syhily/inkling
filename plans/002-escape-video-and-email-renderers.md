# Plan 002: Escape URL and text interpolation in video and email renderers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/nodes/base/nodes/video/video-renderer.ts src/nodes/base/nodes/bookmark/bookmark-renderer.ts src/nodes/base/nodes/button/button-renderer.ts src/nodes/base/nodes/audio/audio-renderer.ts src/nodes/base/nodes/file/file-renderer.ts test/nodes-base/nodes/video.test.ts test/nodes-base/nodes/bookmark.test.ts test/nodes-base/nodes/button.test.ts test/nodes-base/nodes/audio.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-harden-url-validation-export-paths.md (establishes the validated-URL contract this plan escapes)
- **Category**: security
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Several export templates interpolate validated-but-unescaped URLs and raw text
into HTML attribute and element contexts. `isSafeUrl`/`isSafeMediaUrl` allow
scheme-less relative URLs, which can legitimately contain `"`, `'`, `>`, and
spaces — so a "safe" URL like `/x"><img src=y onerror=alert(1)>` breaks out of
its attribute into live markup. Worst cases: the video renderer writes two
attributes **unquoted**; the bookmark/button/audio **email** templates
interpolate URLs and the audio card title raw, injecting arbitrary HTML into
every email recipient's body. Additionally the bookmark email description is
double-escaped (`&amp;amp;`), mangling user content — fixed here because it is
the same lines.

## Current state

- `src/nodes/base/nodes/video/video-renderer.ts:81-98` — `cardTemplate()` builds
  an HTML string. Line 88 is **unquoted**:

  ```ts
  return `
        <figure class="${cardClasses}" data-inkling-thumbnail=${safeThumbnailSrc} data-inkling-custom-thumbnail=${safeCustomThumbnailSrc}>
  ```

  and lines 91/98 quote but never escape:

  ```ts
  src = "${isSafeMediaUrl(node.src) ? node.src : ''}"
  style = "background: transparent url('${thumbnailSrc}') 50% 50% / cover no-repeat;"
  ```

- `src/nodes/base/nodes/bookmark/bookmark-renderer.ts`:
  - `:41` `const description = escapeHtml(node.description)` then `:56`/`:89`
    pass it to `truncateHtml(description, 120, 90)` — but
    `src/nodes/base/utils/truncate.ts` escapes its input again (lines 15, 20,
    33–35, 40). Double-escape bug.
  - `:53,65,80,88,102,110` — `href="${safeUrl}"`, `url('${safeThumbnail}')`,
    `src="${safeIcon}"` with no escaping.
- `src/nodes/base/nodes/button/button-renderer.ts:58,96` — `href="${buttonUrl}"`
  raw (plan 001 renames this to `safeButtonUrl`; escape whatever the validated
  local is called after plan 001 lands).
- `src/nodes/base/nodes/audio/audio-renderer.ts:230-247` — `href="${options.postUrl}"`
  (4 sites), `src="${node.thumbnailSrc}"`, and `${node.title}` (line 247) all raw.
- **Exemplar to copy**: `src/nodes/base/nodes/file/file-renderer.ts:34-41`
  already does this correctly:

  ```ts
  function wrapWithAnchor(content: string, href: string | undefined, cls: string, style?: string) {
    if (href) {
      const styleAttr = style ? ` style="${style}"` : ''
      return `<a href="${escapeHtml(href)}" class="${cls}"${styleAttr}>${content}</a>`
    }
    return `<span class="${cls}">${content}</span>`
  }
  ```

- `escapeHtml` lives at `src/nodes/base/utils/escape-html.ts` and escapes
  `& < > " '`. It is the right tool for attribute and text contexts. For
  `url('…')` CSS contexts, escaping `"`/`'`/`>` via `escapeHtml` is sufficient
  here because the value is additionally quote-wrapped; do not introduce a new
  CSS escaper.

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, print width 120 (`oxfmt`). Vitest with globals. Renderer tests live in
`test/nodes-base/nodes/<card>.test.ts`; the email variants are exercised via
options in the same files — read `test/nodes-base/nodes/bookmark.test.ts`
first to see how email-template output is asserted.

## Commands you will need

| Purpose    | Command             | Expected on success                        |
| ---------- | ------------------- | ------------------------------------------ |
| Install    | `pnpm install`      | exit 0                                     |
| Typecheck  | `pnpm typecheck`    | exit 0                                     |
| Lint       | `pnpm lint`         | exit 0                                     |
| Unit tests | `pnpm test:unit`    | all pass (builds first via `pretest:unit`) |
| Format     | `pnpm format:check` | exit 0                                     |

## Scope

**In scope**:

- `src/nodes/base/nodes/video/video-renderer.ts`
- `src/nodes/base/nodes/bookmark/bookmark-renderer.ts`
- `src/nodes/base/nodes/button/button-renderer.ts`
- `src/nodes/base/nodes/audio/audio-renderer.ts`
- `test/nodes-base/nodes/video.test.ts`
- `test/nodes-base/nodes/bookmark.test.ts`
- `test/nodes-base/nodes/button.test.ts`
- `test/nodes-base/nodes/audio.test.ts`

**Out of scope**:

- `src/nodes/base/utils/truncate.ts` — the double-escape is fixed at the
  bookmark call site, not by changing the shared truncator (other callers may
  rely on it escaping).
- Header renderer color validation — plan 004.
- Callout/visibility sanitization — plan 003.
- Scheme validation of `options.postUrl` in the audio renderer (it is
  integrator-supplied config, not document data) — escape only.
- Gallery/file renderers — already correct.

## Git workflow

- Branch: `advisor/002-escape-export-templates`
- Commit style (from `git log`): e.g. `fix(renderers): escape interpolated URLs in video and email templates`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Quote and escape the video renderer attributes

In `video-renderer.ts` `cardTemplate()`:

- Add quotes around the two unquoted data attributes and escape all four URL
  interpolations:
  `data-inkling-thumbnail="${escapeHtml(safeThumbnailSrc)}"`,
  `data-inkling-custom-thumbnail="${escapeHtml(safeCustomThumbnailSrc)}"`,
  `src="${escapeHtml(isSafeMediaUrl(node.src) ? node.src : '')}"`,
  `url('${escapeHtml(thumbnailSrc)}')`.
- `escapeHtml` is already imported in this file (it is used for the caption at
  line 84) — confirm and reuse.

**Verify**: `pnpm test:unit -t "video"` → all pass.

### Step 2: Fix the bookmark double-escape and escape URL interpolations

In `bookmark-renderer.ts`:

- Change line 41 to `const description = node.description` (raw) and keep
  `truncateHtml(description, 120, 90)` — `truncateHtml` performs the single
  escape. Verify no other use of the old `description` variable assumes it is
  pre-escaped.
- Wrap every `safeUrl`/`safeIcon`/`safeThumbnail` interpolation in both the
  web and Outlook email templates with `escapeHtml(...)` (sites listed in
  Current state). Follow the `file-renderer.ts` exemplar.

**Verify**: `pnpm test:unit -t "bookmark"` → all pass, including the new
double-escape regression test from the Test plan.

### Step 3: Escape button and audio email templates

- `button-renderer.ts`: escape the href value in both email-template branches
  (the `emailCustomization` branch line ~58 and the `emailCustomizationAlpha`
  branch line ~96). Use the validated local from plan 001 (expected name
  `safeButtonUrl` — if plan 001 named it differently, use that name).
- `audio-renderer.ts`: escape `options.postUrl` in all four `href`
  interpolations, `node.thumbnailSrc` in the `src`, and `node.title` in the
  title anchor (line 247). Also apply `isSafeMediaUrl` to `node.thumbnailSrc`
  consistent with other renderers: `const safeThumbnailSrc = isSafeMediaUrl(node.thumbnailSrc) ? node.thumbnailSrc : ''`.

**Verify**: `pnpm test:unit -t "button"` and `pnpm test:unit -t "audio"` → all
pass.

### Step 4: Full verification

`pnpm typecheck` → exit 0; `pnpm lint` → exit 0; `pnpm test:unit` → all pass;
`pnpm format:check` → exit 0 (run `pnpm format` only on the in-scope files if
it complains).

## Test plan

Add to the existing per-card test files (match their structure):

- `video.test.ts`: node with `thumbnailSrc: '/x"><img src=y onerror=alert(1)>'`
  — assert the rendered HTML does not contain `<img src=y onerror` as a live
  element (parse the output with `DOMParser` and assert no injected `img`
  exists, or assert the escaped `&quot;` sequence is present).
- `bookmark.test.ts`: description `'Fish & Chips <3'` — assert email output
  contains `Fish &amp; Chips &lt;3` exactly once (no `&amp;amp;`). Also a URL
  with a quote character (relative URL, passes `isSafeUrl`) — assert it appears
  escaped in the output.
- `button.test.ts`: `buttonUrl` containing `"` — assert escaped output in both
  email branches.
- `audio.test.ts`: `node.title` of `"><script>alert(1)</script>` — assert the
  escaped form in the email output and that no `<script>` element exists when
  parsed.

Regression check: the existing snapshot/assertion tests in these files must
pass unchanged except where the double-escape fix legitimately alters expected
output — if so, update the expectation and note it in the commit message.

Verification: `pnpm test:unit` → all pass.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0; new injection/double-escape tests exist and pass
- [ ] `grep -n 'data-inkling-thumbnail=\${' src/nodes/base/nodes/video/video-renderer.ts` returns no matches (attribute now quoted)
- [ ] `grep -n '\${node.title}' src/nodes/base/nodes/audio/audio-renderer.ts` returns no matches
- [ ] `grep -n 'escapeHtml(node.description)' src/nodes/base/nodes/bookmark/bookmark-renderer.ts` returns no matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- Plan 001 has not landed and `safeButtonUrl` (or equivalent) does not exist in
  `button-renderer.ts` — either land plan 001 first or report; do not invent a
  different validation approach.
- Escaping breaks an existing test in a way that indicates intentional reliance
  on unescaped interpolation (e.g. a consumer contract test) — report the case
  instead of weakening the escape.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The contract after plans 001+002: **validate scheme with `isSafeUrl`/
  `isSafeMediaUrl`, then escape with `escapeHtml` at interpolation**. Any new
  HTML-string template in `src/nodes/base/nodes/**` must follow it; prefer DOM
  APIs (like the bookmark frontend template) where practical since they make
  escaping unnecessary.
- Watch for consumers parsing `data-inkling-thumbnail` attributes — quoting
  them is HTML-compatible, but a downstream regex parser assuming unquoted
  attributes would break; none exists in this repo.
- `options.postUrl` remains integrator-trusted config; if it ever becomes
  document data, add scheme validation too.
