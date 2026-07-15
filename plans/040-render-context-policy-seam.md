# Plan 040: Put renderer policy behind a render-context seam

> **Executor instructions**: This plan centralizes rendering security policy
> (URL validation, sanitization, render-target branching, feature flags) behind
> one read-only render-context passed to every card renderer. The design is
> decided; do not redesign the seam. Characterize current outputs FIRST — every
> migration commit must keep renderer output byte-identical except the one
> intentional toggle sanitization fix. Interface names marked "illustrative"
> may be refined by the executor; the shape (read-only context, one variant
> helper, DOMPurify convergence) may not. Plan 037 must land before Step 6.
>
> **Drift check (run first)**:
> `git diff --stat 1cad78b..HEAD -- src/nodes/base/export-dom.ts src/nodes/base/generate-decorator-node.ts src/nodes/base/utils/is-safe-url.ts src/nodes/base/utils/add-create-document-option.ts src/nodes/base/utils/clean-dom.ts src/nodes/base/utils/escape-html.ts src/nodes/base/utils/render-helpers/email-button.ts src/utils/sanitize-html.ts src/html/renderer/convert-to-html-string.ts src/html/renderer/LexicalHTMLRenderer.ts src/html/renderer/types.ts src/html/renderer/utils/TextContent.ts src/nodes/base/nodes test/nodes-base/nodes test/nodes-base/utils`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM — security-policy centralization; outputs must not drift
- **Confidence**: HIGH
- **Depends on**: 037 (deletes `renderData` from the renderer options; Step 6 folds the remaining options bag)
- **Category**: architecture deepening / security hardening
- **Planned at**: commit `1cad78b`, 2026-07-15

## Why this matters

Every card renderer currently re-implements its own security policy: URL
allow-lists are hand-rolled at each call site, sanitization is a different
mechanism per card (DOMPurify, a custom DOM walker, `escapeHtml`, or nothing
at all), and the email/web render-target branch is written four different ways
across thirteen files. The policy is small, but it has no single interface, so
each renderer carries its own implementation and the implementations drift.

The drift is not hypothetical. Commit `5301033` split `isSafeUrl` into
navigation vs media helpers and edited 3 renderers; commit `66a31dd`
("enforce media url policy consistently") edited 4 more and added a
drift-guard test (`test/nodes-base/nodes/media-url-policy.test.ts`) just to
keep the policy applied; commit `b87ecc1` fixed the gallery renderer
forgetting to forward `imageBaseUrl`. A policy that needs a regression test to
prove every renderer remembered to call it lives at the wrong seam.

The toggle card proves the stakes: it interpolates user content into HTML
strings with no escaping or sanitization at all. Centralizing policy behind a
typed render-context gives the codebase one interface to audit, one place the
render-target idiom lives, and one sanitizer — and lets us delete the
drift-guard test, since renderers can no longer reach policy modules
directly.

## Current-state evidence

Verified fresh against commit `1cad78b`:

- URL policy lives in `src/nodes/base/utils/is-safe-url.ts`: `isSafeUrl`
  (navigation: http/https/relative only, lines 6-30) and `isSafeMediaUrl`
  (media: additionally `data:`/`blob:`, lines 37-61).
- 27 `isSafeUrl`/`isSafeMediaUrl` call sites across 8 renderer files
  (bookmark 5, button 3, file 2, gallery 2, header 4, image 2, video 7,
  audio 2). 18 are the hand-rolled ternary idiom `isSafeX(v) ? v : ''` across
  6 files; image/gallery use guard idioms instead — the idiom itself is
  inconsistent.
- 16 `options.target` comparisons across 13 files in 4 idioms: early dispatch
  (button-renderer.ts:24, bookmark-renderer.ts:37, file-renderer.ts:27,
  audio-renderer.ts:39, horizontalrule-renderer.ts:45, header-renderer.ts:369);
  IIFE + runtime throw (video-renderer.ts:60-68, audio-renderer.ts:39-42);
  interleaved mid-render (image-renderer.ts:101,177, gallery-renderer.ts:139,154);
  string-template ternary (toggle-renderer.ts:60). Plus transformers
  `aside.ts:14`, `blockquote.ts:16`, and `visibility.ts:152`.
- The missing-postUrl runtime throws live inside renderers
  (video-renderer.ts:62-64, audio-renderer.ts:40-42) with duplicated
  type-guard helpers (video-renderer.ts:44-46, audio-renderer.ts:50-52).
  Tests pin the exact messages: `test/nodes-base/nodes/video.test.ts:403`,
  `test/nodes-base/nodes/audio.test.ts:430`.
- `usesModernEmailButton` is defined at button-renderer.ts:101-105 and
  duplicated inline at header-renderer.ts:258-260. Feature/design flags
  (`emailCustomization`, `emailCustomizationAlpha`, `emailUniqueid`,
  `pictureImageFormats`, `design.buttonStyle`) are read ad hoc in 5 renderers
  (header-renderer.ts:259,303, toggle-renderer.ts:29, image-renderer.ts:126,
  button-renderer.ts:55,70,103, html-renderer.ts:28).
- Color validation is duplicated with different semantics:
  header-renderer.ts:55-60 (`COLOR_REGEX` + `safeColor(value, fallback)`) vs
  `src/nodes/base/utils/render-helpers/email-button.ts:18-23`
  (`SAFE_COLOR_REGEX` + `isValidColor`, which additionally rejects
  `'transparent'`). The regexes are byte-identical; header **uses**
  `'transparent'` as a fallback value (header-renderer.ts:73-75), so the
  rejection cannot simply be unified away.
- Sanitization is fragmented: DOMPurify-backed `sanitizeHtml`
  (`src/utils/sanitize-html.ts:31-48`; dompurify 3.4.11 already a dependency)
  for captions in image-renderer.ts:222, gallery-renderer.ts:200,
  bookmark-renderer.ts:209, codeblock-renderer.ts:37 and the markdown card
  (markdown-renderer.ts:24); the hand-rolled `cleanDOM` allowlist walker
  (`src/nodes/base/utils/clean-dom.ts`, invoked at callout-renderer.ts:39-40);
  plain `escapeHtml` for video captions (video-renderer.ts:84,158; audio's
  email title at audio-renderer.ts:257); and
  **nothing** in toggle — toggle-renderer.ts:16,23 (web), :35,39 (email
  customization branch, via the non-escaping `html` tag,
  tagged-template-fns.ts:9-21), and :49,50 (legacy email) are all raw
  interpolation.
- `TextContent.ts:165` re-validates link `href`s with `isSafeUrl` inside the
  HTML renderer's text layer — a second, hidden policy consumer.
- `convert-to-html-string.ts` never sanitizes; it concatenates
  `innerHTML`/`outerHTML`/value verbatim (lines 42-55, 100-114). That is
  currently an implicit, undocumented decision.
- The open options bag: `ExportDOMOptionsBase` (export-dom.ts:25-39) has 12
  named fields plus `[key: string]: unknown`; `RendererOptions`
  (src/html/renderer/types.ts:3-6) adds `usedIdAttributes` and `renderData`.
  Three parties mutate the bag: `addCreateDocumentOption` installs
  `options.createDocument` (src/nodes/base/utils/add-create-document-option.ts:5-25,
  called by every renderer), convert-to-html-string.ts:16 installs
  `usedIdAttributes`, and LexicalHTMLRenderer.ts:73 installs `renderData`
  (deleted by plan 037).
- `isLocalContentImage` is called from image-renderer (3×: lines 86,129,191),
  gallery-renderer (2×: lines 129,165), and srcset-attribute (2×: lines
  36,46), each forwarding `options.siteUrl`/`options.imageBaseUrl` by hand;
  commit `b87ecc1` fixed gallery forgetting to forward `imageBaseUrl`.
- The dispatch that would build the context: `exportDOM` at
  generate-decorator-node.ts:352-393 (nodeRenderers override, versioned
  dispatch, defaultRenderFn fallback — all receive the raw options bag).

## Scope

**In scope**:

- A typed, read-only render-context module (illustrative path:
  `src/nodes/base/render-context.ts`; illustrative methods `safeUrl(kind,
  value)`, `sanitizeCaption(html)`, `sanitizeCardHtml(html, config)`,
  `variant({ web, email })`, `requirePostUrl()`) plus read-only `target`,
  `imageBaseUrl`, `siteUrl`, and feature/design flag accessors.
- Threading the context through `exportDOM` in generate-decorator-node.ts and
  to the element transformers / `TextContent` in `src/html/renderer/`.
- Migrating all 14 card renderers off direct policy imports, one commit per
  renderer group.
- Converging sanitization on DOMPurify, including the toggle fix (the one
  intentional output change) and callout's allowlist as a named DOMPurify
  config.
- Single-sourcing color validation, documenting the `'transparent'` semantics.
- Folding the options bag's mutating parties into context-owned state.
- Replacing `test/nodes-base/nodes/media-url-policy.test.ts` with seam unit
  tests.

**Out of scope**:

- Changing any renderer output except the toggle sanitization fix.
- The markdown round-trip API (`src/markdown/`) and its documented
  constrained node set.
- `renderData` deletion itself (plan 037's job; this plan folds what remains).
- Redesigning `sanitizeHtml`'s `ALLOWED_URI_REGEXP` to match `isSafeUrl`
  semantics — record the difference, do not harmonize in this plan.
- Editor-side React components (`src/components/`) with their own
  `sanitizeHtml` call sites (`HtmlCard.tsx`, `MarkdownPastePlugin.tsx`).
- Visibility rendering logic (visibility.ts) beyond routing its target check
  through the context, and only if trivially output-safe (executor detail).

## Commands you will need

| Purpose                   | Command                                                    | Expected on success                        |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Characterization baseline | `pnpm vitest run test/nodes-base test/html-renderer`       | all green before any migration             |
| Single renderer group     | `pnpm vitest run test/nodes-base/nodes/<card>.test.ts`     | green, byte-identical expectations         |
| Seam unit tests           | `pnpm vitest run test/nodes-base/utils`                    | green                                      |
| Static + full gates       | `pnpm typecheck && pnpm lint && pnpm test:unit`            | all pass (unit builds via `pretest:unit`)  |
| Format                    | `pnpm format && pnpm format:check`                         | exits 0                                    |
| E2E (only if demo-visible)| `pnpm test:e2e:quiet test/e2e/<spec>`                      | no e2e currently asserts exported markup   |

## Git workflow

- Branch: `advisor/040-render-context-policy-seam`
- Commit 1: `test(renderers): characterize per-card per-target export output`
- Commit 2: `refactor(renderers): introduce read-only render-context seam`
- Commits 3+: `refactor(renderers): route <group> url policy through render context` (one per group)
- Then: `refactor(renderers): converge sanitization on dompurify configs`
- Then: `fix(renderers): sanitize toggle heading and content interpolation`
- Then: `refactor(renderers): unify email variant idiom in render context`
- Then: `refactor(renderers): fold export options bag into render context`
- Finally: `test(renderers): retire media-url-policy drift guard for seam tests`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Characterize current renderer outputs per card per render target

Before touching production code, lock current behavior:

- Run `pnpm vitest run test/nodes-base test/html-renderer`; record the green
  baseline.
- Audit per-card tests for output coverage gaps. Every card needs
  exact-output expectations per render target it supports. Known thin spots:
  toggle (`test/nodes-base/nodes/toggle.test.ts` — verify it pins web,
  email-legacy, AND email-customization output byte-for-byte) and header
  (`test/nodes-base/nodes/header.test.ts` — verify both `useModernButton`
  branches and the legacy path).
- Add cases where thin, using `expectPrettifiedHtml` / `dom` from
  `test/nodes-base/test-utils/`. Include adversarial inputs: `<script>` in
  toggle heading/content, `javascript:` URLs, colors like `expression(...)`,
  captions containing `<b>` markup — the inputs where Step 4 could drift.
- Snapshot the exact current output for those adversarial inputs (including
  toggle's raw passthrough) in the commit message; Step 4 needs the
  before/after evidence.

### Step 2: Introduce the render-context and thread it through exportDOM

Create the seam module (path illustrative, e.g.
`src/nodes/base/render-context.ts`):

- The `RenderContext` interface and a `createRenderContext(options:
  ExportDOMOptions)` factory (names illustrative) with the shape from Scope.
  The factory absorbs `addCreateDocumentOption`'s job: resolve
  `createDocument` once (browser global / `options.dom` /
  `options.createDocument`, preserving the exact non-browser throw at
  add-create-document-option.ts:18) and freeze the result.
- Thread it through the dispatch at generate-decorator-node.ts:352-393: build
  the context once per `exportDOM` call and pass it to the resolved renderer.
  Keep the existing `options` parameter alongside during migration (executor
  detail: the context may wrap options internally; renderers migrate off
  `options` incrementally per group).
- Also construct it in convert-to-html-string.ts:12-34 so `TextContent` and
  the element transformers (aside, blockquote) receive it.
- No renderer changes in this commit; all Step-1 tests stay green unchanged.

### Step 3: Migrate URL policy, one commit per renderer group

Route every `isSafeUrl`/`isSafeMediaUrl` call site through
`context.safeUrl(...)` (illustrative), which returns the safe value or `''` —
absorbing both the ternary and guard idioms. Suggested groups (one commit
each): (a) video + audio; (b) image + gallery + srcset-attribute.ts
(`isLocalContentImage` forwarding folds into the context — the `b87ecc1`
class of bug becomes impossible); (c) bookmark + button + file; (d) header;
(e) TextContent.ts:165 link hrefs + clean-dom.ts:22 + email-button.ts:43.
After each commit run that group's test file; output must be byte-identical.
`src/nodes/base/utils/is-safe-url.ts` stays as the seam's private
implementation — renderers must no longer import it.

### Step 4: Converge sanitization onto DOMPurify

- `sanitizeCaption` (illustrative) routes through DOMPurify via
  `src/utils/sanitize-html.ts`. Image/gallery/bookmark/codeblock captions
  already use `sanitizeHtml` — mechanical move. Video captions use
  `escapeHtml` (video-renderer.ts:84,158; the parallel case in audio is the
  email title at audio-renderer.ts:257): run the Step-1 adversarial cases
  through both and diff; if DOMPurify cannot reproduce `escapeHtml`'s
  output for the plain-text corpus, STOP per the conditions below —
  do not improvise a third sanitizer; an escaping implementation behind the
  same seam method is the fallback, with the divergence recorded.
- Callout: express the `allowedTags` list (callout-renderer.ts:39) plus
  clean-dom.ts's attribute rules (`A[href]` + `isSafeUrl`, `CODE[style]` +
  `CODE_STYLE_REGEX`) as a named DOMPurify config (illustrative:
  `CALLOUT_HTML_CONFIG`). Diff against the Step-1 corpus, including
  nested-disallowed-tag cases — `cleanDOM` unwraps disallowed tags
  (clean-dom.ts:40-43); DOMPurify's keep/drop behavior must match the corpus.
- Toggle (the intentional change): escape `node.heading` and DOMPurify
  `node.content` at all six raw sites (toggle-renderer.ts:16,23,35,39,49,50).
  Content is nested-editor HTML (like callout's) — sanitize, do not escape.
  Benign inputs must remain byte-identical; only markup-bearing inputs
  change. Update the Step-1 expectations and include the before/after diff in
  the commit message and PR description.
- Make the no-sanitize decision at the string layer explicit: comment at
  convert-to-html-string.ts:12 that sanitization happens inside card
  renderers via the render context and the string layer is verbatim by
  design. Do NOT add a blanket sanitize pass there — it would double-escape
  already-sanitized markup.

### Step 5: Unify the render-target variant idiom

- Add the one branching helper `context.variant({ web, email })`
  (illustrative) and migrate the four idioms to it, one renderer group per
  commit where sensible.
- Move the missing-postUrl throws into the seam: the email branch of
  `variant` (or `requirePostUrl()`, illustrative) performs the check.
  Preserve the exact error messages (`renderVideoNode requires
  options.postUrl when options.target is "email"`, audio equivalent) — tests
  pin them at video.test.ts:403 and audio.test.ts:430.
- Collapse the duplicated `usesModernEmailButton` (button-renderer.ts:101-105,
  header-renderer.ts:258-260) and the ad-hoc feature/design flag reads into
  context accessors.
- Single-source color validation: one regex + one helper in the seam's
  implementation, with two documented predicates — the general check and the
  email-button check that additionally rejects `'transparent'`
  (email-button.ts:21-23). Record in the module comment that `'transparent'`
  rejection is email-button-only because header uses `'transparent'` as a
  legitimate fallback (header-renderer.ts:73-75).

### Step 6: Fold the options bag into the context

Prerequisite: plan 037 landed (`renderData` deleted from
LexicalHTMLRenderer.ts:73 / `RendererOptions`).

- `usedIdAttributes` (convert-to-html-string.ts:16) becomes context-owned
  state with a method (illustrative: `context.trackIdAttribute(id)`); update
  its consumers.
- `addCreateDocumentOption` is fully absorbed by the Step-2 factory; delete
  the function and every renderer call site.
- Narrow `ExportDOMOptionsBase` (export-dom.ts:25-39): remove the
  `[key: string]: unknown` index signature where the context now types the
  field (executor detail: keep `ExportDOMOptions` as the public input type;
  the context is the internal read view — do not change the public renderer
  API shape).
- Run `pnpm verify:package` if any public type moved.

### Step 7: Retire the drift-guard test; run full gates

- Delete `test/nodes-base/nodes/media-url-policy.test.ts`. Its purpose —
  proving every renderer remembered the policy — is now structural. Preserve
  its adversarial cases as seam unit tests (e.g. under
  `test/nodes-base/utils/`): `safeUrl` rejects `unsupported-scheme:payload`
  for media and navigation kinds, the variant helper throws without postUrl,
  sanitize configs match the recorded corpus.
- Add a guard that no file under `src/nodes/base/nodes/` imports
  `is-safe-url`, `escape-html`, `clean-dom`, or `sanitize-html` directly
  (executor detail: a small Vitest file reading the sources, or an oxlint
  rule if the config supports it).
- Run: `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit`. No e2e asserts exported markup (verified 2026-07-15); run
  `pnpm test:e2e:quiet` only if a demo-visible path was touched.

## Test plan

| Scenario                        | Command                                                 | Required invariant                             |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| Characterization baseline       | `pnpm vitest run test/nodes-base test/html-renderer`    | green; adversarial corpus recorded             |
| Per-group URL migration         | `pnpm vitest run test/nodes-base/nodes/<card>.test.ts`  | byte-identical output per group                |
| Toggle sanitization fix         | `pnpm vitest run test/nodes-base/nodes/toggle.test.ts`  | benign inputs unchanged; markup neutralized    |
| Callout DOMPurify config        | `pnpm vitest run test/nodes-base/nodes/callout.test.ts` | corpus-identical to `cleanDOM` output          |
| Video/audio caption convergence | `pnpm vitest run test/nodes-base/nodes/video.test.ts`   | corpus-identical, or STOP and record           |
| postUrl guard messages          | video.test.ts:403, audio.test.ts:430                    | exact error messages preserved                 |
| Seam policy unit tests          | `pnpm vitest run test/nodes-base/utils`                 | drift-guard cases covered at the seam          |
| Full gates                      | `pnpm typecheck && pnpm lint && pnpm test:unit`         | all pass                                       |

## Acceptance criteria

- Renderer outputs are byte-identical to the Step-1 baseline EXCEPT the
  toggle sanitization fix, whose expectations carry before/after evidence.
- No file under `src/nodes/base/nodes/` imports `is-safe-url`, `escape-html`,
  `clean-dom`, or `src/utils/sanitize-html` directly; all policy flows
  through the render context.
- One variant helper expresses every email/web branch; the four legacy
  idioms are gone (any exception recorded per STOP conditions).
- Color validation is single-sourced; the comment records that
  `'transparent'` rejection is email-button-only.
- `test/nodes-base/nodes/media-url-policy.test.ts` is deleted, its
  adversarial cases preserved as seam unit tests.
- The options bag's three mutating parties are context-owned; the read-only
  context is the only thing renderers receive.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` green.

## STOP conditions

- Any output drift beyond the toggle fix appears in any migration commit.
  Revert that one commit, keep the characterization tests, reassess the seam
  method's implementation — do not "update expectations" to make it pass.
- DOMPurify cannot reproduce callout's `cleanDOM` output exactly on the
  recorded corpus (unwrap semantics, attribute rules). Keep callout's
  existing logic behind the seam as a named config/fallback — do not
  improvise a third sanitizer and do not accept the drift.
- The variant helper cannot express a renderer's branch without changing
  output (e.g. header's interleaved mid-render ternaries). Leave that branch
  in place inside the renderer, record it in the seam module comment, and
  move on — partial unification is acceptable, output drift is not.
- Plan 037 has not landed (`renderData` still in
  LexicalHTMLRenderer.ts/`RendererOptions`). Execute Steps 1-5 and 7's policy
  tests only; leave Step 6's `renderData` fold and bag-narrowing for a
  follow-up — sequence, don't rework around it.
- Folding `usedIdAttributes` or narrowing `ExportDOMOptionsBase` breaks
  `pnpm verify:package` or the public type surface. Keep the public options
  type as-is; the context is an internal view.

## Rollback plan

Each migration step is its own commit; revert the offending commit alone
(`git revert <sha>`) and keep Step 1's characterization tests — they are the
evidence for the next attempt. If the seam itself (Step 2) proves unsound,
revert to the branch point; the characterization tests remain valid against
un-migrated code, and the drift-guard cases can be restored to
`test/nodes-base/nodes/media-url-policy.test.ts`. The toggle fix is
independent: if it must ship alone, cherry-pick it onto a branch without the
refactor commits — it touches only `toggle-renderer.ts` and its test
expectations.
