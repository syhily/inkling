# Plan 041: Shrink the escape-html allowlist onto context.escapeText

> **Executor instructions**: This plan deletes the six remaining `escape-html`
> exceptions from the plan-040 import guard by migrating every card renderer's
> template escaping onto the render-context seam method `escapeText`. The seam
> method delegates to the same `escapeHtml` implementation, so the migration is
> byte-identical by construction — zero test-expectation changes are expected
> or permitted. The work is one mechanical commit; do not redesign the seam, do
> not add seam methods, and do not touch the markdown card's `sanitize-html`
> site (a different concern, decided in plan 040).
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/nodes/base/nodes/audio/audio-renderer.ts src/nodes/base/nodes/bookmark/bookmark-renderer.ts src/nodes/base/nodes/button/button-renderer.ts src/nodes/base/nodes/file/file-renderer.ts src/nodes/base/nodes/header/renderers/header-renderer.ts src/nodes/base/nodes/video/video-renderer.ts src/nodes/base/render-context.ts test/nodes-base/nodes/render-policy-imports.test.ts`
>
> **Baseline at `d998080`**: `pnpm test:unit` = 206 files / 1707 passed / 21
> todo; `pnpm vitest run test/nodes-base test/html-renderer` = 46 files / 730
> passed / 21 todo. Both must be unchanged after this plan — same counts, same
> todo set, no expectation edits.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — delegation to the identical implementation; the import guard itself is the proof
- **Confidence**: HIGH
- **Depends on**: — (builds on plan 040, already landed at `c8e522f`)
- **Category**: architecture deepening / seam consolidation
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

Plan 040 put renderer policy behind the render-context seam and added a
shrink-only import guard (`test/nodes-base/nodes/render-policy-imports.test.ts`)
whose comment says the allowlists "may only shrink: delete an entry when a file
migrates onto the seam." Six of the seven allowlist entries are still
`escape-html` carve-outs — the largest remaining exception class. Plan 040's
own execution notes name this migration as "the natural follow-up": a
byte-identical move to `context.escapeText` that shrinks the allowlist to just
the markdown renderer.

The friction is leverage, not correctness: today the escaping policy for card
templates lives in two places — the seam (toggle, video captions, audio email
title already use `context.escapeText`) and six direct imports of the
implementation module. Every direct import is a place a future renderer change
can improvise escaping ad hoc instead of going through the one interface, and
each one weakens the guard as a statement of architecture: "card sources must
not import the policy modules directly" currently needs six asterisks. Closing
them makes the seam's locality complete for escaping — one method, one
implementation, one guard entry that names the single intentional exception.

The migration is safe by construction: `escapeText` in
`src/nodes/base/render-context.ts:242-244` is `return escapeHtml(value)` — the
identical function the renderers call today — so output cannot drift.

## Current-state evidence

Verified fresh against commit `d998080`:

- Exactly six files under `src/nodes/base/nodes/` import `escape-html`
  (`import { escapeHtml } from '@/nodes/base/utils/escape-html'`, line 4 in
  each), holding 38 `escapeHtml(...)` call sites:
  - `audio/audio-renderer.ts` — 6 sites, all inside `emailTemplate`
    (`:~213`): `:~229`, `:~233`, `:~242`, `:~246`, `:~254`, `:~257` (four
    `escapeHtml(postUrl)`, one `escapeHtml(safeThumbnailSrc)`; `:~246` already
    mixes `escapeHtml(postUrl)` with `context.escapeText(node.title)`).
  - `bookmark/bookmark-renderer.ts` — 13 sites, all inside `emailTemplate`
    (`:~40`): `:~41-43`, `:~48`, `:~55`, `:~60`, `:~67-68`, `:~82`, `:~90`,
    `:~104-105`, `:~112` (text fields plus already-policy-checked URLs/icons/
    thumbnails). `frontendTemplate` (`:~133`) uses DOM `textContent`, no
    escaping.
  - `button/button-renderer.ts` — 2 sites inside `renderButtonNode`'s legacy
    branch: `:~84`, `:~90`.
  - `file/file-renderer.ts` — 7 sites: one inside the module-level helper
    `wrapWithAnchor` (`:~32-38`, call at `:~35`) and six inside `emailTemplate`
    (`:~40`): `:~63`, `:~72`, `:~78`, `:~84`, `:~85`, `:~87`.
  - `header/renderers/header-renderer.ts` — 6 sites: three in `cardTemplate`
    (`:~61`, calls at `:~66-68`) and three in `emailTemplate` (`:~225`, calls
    at `:~228-230`).
  - `video/video-renderer.ts` — 4 sites on 3 lines inside `cardTemplate`
    (`:~51`): `:~71` (two calls), `:~74`, `:~81`. `emailCardTemplate` (`:~128`)
    already uses `context.escapeText` (`:~143`).
- Every call site already has `context: RenderContext` in scope EXCEPT
  `file/file-renderer.ts`'s `wrapWithAnchor(content, href, cls, style?)`, which
  takes no context. Its only callers are `emailTemplate`'s `:~63`, `:~72`,
  `:~78`, which have context. Threading `context` into the helper is required —
  escaping at the call sites does not typecheck, because the helper branches on
  the `href === undefined` sentinel and `escapeText` takes a `string`.
- The guard allowlist `ALLOWED_DIRECT_IMPORTS`
  (`test/nodes-base/nodes/render-policy-imports.test.ts:22-30`) has 7 entries:
  the six `escape-html` files above plus
  `'markdown/markdown-renderer.ts': ['sanitize-html']`. Its comment (`:~15-21`)
  describes the escape-html exceptions as "template interpolation of plain text
  or already-policy-checked URLs" and becomes stale once they are gone.
- The seam method: `RenderContext.escapeText(value: string): string`
  (`src/nodes/base/render-context.ts:150`), implemented at `:242-244` as
  `return escapeHtml(value)`. Its interface doc (`:~140-150`) records the plan
  040 Step 4 STOP-condition divergence (DOMPurify cannot reproduce `escapeHtml`
  on the pinned corpus) and names the two original call-site families ("video
  captions, the audio email title") — an understatement once this plan lands.
- The seam idiom is already in the codebase: `toggle-renderer.ts:16`,
  `video-renderer.ts:67,143`, `audio-renderer.ts:246` call
  `context.escapeText`.
- The render-context module header (`src/nodes/base/render-context.ts:50-54`)
  names the guard but no exception count — it needs no edit.
- `escape-html` importers that REMAIN after this plan (all outside the guard's
  `src/nodes/base/nodes` scan dir, all out of scope):
  `src/nodes/base/render-context.ts:6` (the seam's private implementation),
  `src/nodes/base/utils/truncate.ts:1` (`truncateHtml`, used by bookmark's
  email template at `:~58`), and
  `src/nodes/base/utils/render-helpers/email-button.ts:2`.
- The markdown card keeps `sanitizeHtml` on markdown-it's rendered output
  (`markdown/markdown-renderer.ts:5,27`) — sanitizing rendered markdown-it HTML
  is a different concern from template escaping; plan 040 decided it stays.
- The per-card test files already pin exact escaping output, including
  adversarial inputs (e.g. file's "properly escapes HTML in all fields",
  bookmark's "escapes HTML for text fields in web/email") — plan 040's
  characterization. No new characterization is needed; the unchanged green
  suite is the drift proof.
- `render-context` is not exported from the public barrel (`src/index.ts` has
  no `render-context`/`RenderContext` reference) — no public surface can shift.

## Scope

**In scope**:

- Migrating all 38 `escapeHtml(...)` call sites in the six renderer files to
  `context.escapeText(...)`, and deleting the six `escape-html` import lines.
- Threading `context: RenderContext` into `file/file-renderer.ts`'s
  `wrapWithAnchor` (one added parameter, three call sites updated).
- Shrinking `ALLOWED_DIRECT_IMPORTS` in the guard to the single markdown entry
  and rewriting its stale comment block.
- Updating the `escapeText` interface doc in `src/nodes/base/render-context.ts`
  so it no longer implies only two call-site families use it (the recorded
  DOMPurify divergence paragraph stays verbatim — it is the evidence for why
  the implementation remains behind the seam).

**Out of scope**:

- `markdown/markdown-renderer.ts`'s `sanitize-html` import and call site.
- `src/nodes/base/utils/truncate.ts` and
  `src/nodes/base/utils/render-helpers/email-button.ts` — direct `escape-html`
  importers outside the guard's scan dir; leave them and record them as known
  leftovers.
- Any new seam methods, any change to `escape-html.ts` itself, any output
  change.
- Editor-side React sources (`src/components/`).

## Commands you will need

| Purpose                   | Command                                                                                                                                                                                                                                       | Expected on success                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Characterization baseline | `pnpm vitest run test/nodes-base test/html-renderer`                                                                                                                                                                                          | 46 files / 730 passed / 21 todo, before any edit |
| Migrated cards            | `pnpm vitest run test/nodes-base/nodes/audio.test.ts test/nodes-base/nodes/bookmark.test.ts test/nodes-base/nodes/button.test.ts test/nodes-base/nodes/file.test.ts test/nodes-base/nodes/header.test.ts test/nodes-base/nodes/video.test.ts` | green, byte-identical expectations               |
| Import guard              | `pnpm vitest run test/nodes-base/nodes/render-policy-imports.test.ts`                                                                                                                                                                         | green against the shrunk allowlist               |
| Static + full gates       | `pnpm typecheck && pnpm lint && pnpm test:unit`                                                                                                                                                                                               | all pass; 1707 passed / 21 todo                  |
| Format                    | `pnpm format && pnpm format:check`                                                                                                                                                                                                            | exits 0 (imports changed, so format runs)        |

No e2e: no demo-visible path changes, and plan 040 verified no e2e asserts
exported markup. No `verify:package`/`verify:types`: the render context is not
in the public barrel and no public type moves.

## Git workflow

- Work commits DIRECTLY on `main` — no branch, no push, no PR (this overrides
  the `advisor/NNN-<slug>` convention in `plans/README.md`).
- Commit 1: `refactor(renderers): route template escaping through context.escapeText`
- Commit 2 (after gates): `docs(plans): 041 done - escape-html allowlist shrunk to markdown`
- Conventional commit messages; nothing else.

## Steps

### Step 1: Migrate the six renderers onto context.escapeText and shrink the allowlist

One commit. All edits are mechanical renames of the callee; nothing else in the
templates changes.

- In each of the six renderer files, replace every `escapeHtml(` call with
  `context.escapeText(` (38 sites, enumerated in Current-state evidence), then
  delete the now-unused
  `import { escapeHtml } from '@/nodes/base/utils/escape-html'` (line 4 in each
  file). Typecheck and lint prove no identifier use remains.
- `file/file-renderer.ts`: add `context: RenderContext` as a parameter of
  `wrapWithAnchor` (`:~32`) and pass `context` at its three call sites
  (`:~63`, `:~72`, `:~78`) so the `:~35` call can migrate. Do not move escaping
  to the call sites — the helper's `href === undefined` sentinel branch depends
  on receiving the raw `string | undefined`.
- `audio/audio-renderer.ts`: leave the `:~30-33` comment (verbatim escaped
  postUrl, deliberate divergence from `safeUrl`) untouched — it explains why
  the value is not routed through `context.safeUrl`, which is unaffected by
  which escaping helper renders it.
- Shrink the guard (`test/nodes-base/nodes/render-policy-imports.test.ts`):
  `ALLOWED_DIRECT_IMPORTS` becomes
  `{ 'markdown/markdown-renderer.ts': ['sanitize-html'] }`. Rewrite the comment
  at `:~15-21`: the escape-html exceptions paragraph is replaced by a note that
  all card-template escaping now goes through `context.escapeText`; keep the
  sanitize-html sentence (markdown-it output sanitization, same
  DOMPurify-backed helper the seam wraps). The header comment (`:~4-11`,
  "may only shrink") stays.
- Update the `escapeText` doc in `src/nodes/base/render-context.ts` (`:~140-150`)
  so the parenthetical no longer reads as the complete call-site list — e.g.
  "introduced for the fields whose pinned output is `escapeHtml`'s (video
  captions, the audio email title); now the single template-escaping path
  behind the seam." Keep the recorded DOMPurify divergence sentences verbatim.
  Do not touch the module header (`:50-54`) — it names no count.
- Proof for the commit: the six per-card test files pass with byte-identical
  expectations, the import guard passes against the shrunk allowlist, and
  `git diff` shows only callee renames, the `wrapWithAnchor` parameter, import
  deletions, and comment edits. Zero test-expectation changes.

### Step 2: Run full gates and record completion

- Run `pnpm format`, then: `pnpm format:check`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit` (expect 206 files / 1707 passed / 21 todo), and
  `pnpm vitest run test/nodes-base test/html-renderer` (expect 46 files / 730
  passed / 21 todo).
- Update the plan's status row in `plans/README.md` to `DONE (<sha>)` and
  commit as the `docs(plans): 041 done ...` commit.

## Test plan

| Scenario          | Command                                                                                   | Required invariant                               |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Baseline          | `pnpm vitest run test/nodes-base test/html-renderer`                                      | 730 passed / 21 todo before any edit             |
| Per-card escaping | `pnpm vitest run test/nodes-base/nodes/{audio,bookmark,button,file,header,video}.test.ts` | byte-identical output; no expectation edits      |
| Guard shrink      | `pnpm vitest run test/nodes-base/nodes/render-policy-imports.test.ts`                     | offenders equal the one-entry markdown allowlist |
| Full gates        | `pnpm typecheck && pnpm lint && pnpm test:unit`                                           | all pass; 1707 passed / 21 todo                  |

## Acceptance criteria

- No file under `src/nodes/base/nodes/` imports `escape-html`; the guard's
  `ALLOWED_DIRECT_IMPORTS` is exactly
  `{ 'markdown/markdown-renderer.ts': ['sanitize-html'] }`.
- Every former `escapeHtml(...)` call site in the six renderers calls
  `context.escapeText(...)`; renderer output is byte-identical (no
  test-expectation change anywhere).
- The guard comment and the `escapeText` interface doc describe the post-plan
  state; the DOMPurify divergence record is preserved verbatim.
- Baselines unchanged: `pnpm test:unit` 1707 passed / 21 todo;
  nodes-base + html-renderer 730 passed / 21 todo; typecheck, lint,
  format:check clean.

## STOP conditions

- Any test expectation needs editing to stay green. Revert the commit — the
  seam delegates to the identical implementation, so drift means a call site
  was mis-migrated (wrong receiver, wrong value, or a site that was not a plain
  `escapeHtml` call). Never update expectations to mask drift.
- `wrapWithAnchor` turns out to have a caller beyond `emailTemplate`'s three
  sites (verified at `d998080`: only `:~63`, `:~72`, `:~78`). Thread context
  through that caller too if trivially output-safe; otherwise stop and report.
- The guard test fails because a NEW offender appears (an `escape-html` import
  under `src/nodes/base/nodes/` that did not exist at `d998080`). That is
  baseline drift — check what landed since, migrate that file the same way if
  it is a template-escaping site, and otherwise stop and report rather than
  re-growing the allowlist.
- Temptation to "also" migrate `truncate.ts` or `email-button.ts` while in
  here. Stop — they are outside the guard's scan dir and outside this plan's
  scope; record them as leftovers instead.

## Rollback plan

The migration is a single commit: `git revert <sha>` restores the six imports,
the old allowlist, and the old comments in one move. No public surface, no test
expectations, and no other plan's files are touched, so the revert is complete
on its own. If only the guard shrink is contested (e.g. a downstream consumer
is discovered importing the renderers' escaping behavior), the renderer
migration can stay while the allowlist lines are restored — but that outcome
means the guard's contract was misunderstood; report it rather than landing a
half-shrunk guard silently.
