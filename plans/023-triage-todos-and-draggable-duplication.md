# Plan 023: Triage the TODO cluster and investigate the cross-repo draggable duplication

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/utils/draggable/ScrollHandler.ts src/utils/draggable/draggable-utils.ts src/nodes/BookmarkNodeComponent.tsx src/components/ui/SettingsPanel.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (mostly triage; the two code changes are small and local)
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

`src/` carries 25 TODO/FIXME/HACK markers, clustered on the highest-touch
surfaces (cards, drag-scroll, shortcuts) — individually minor, collectively a
blind spot: nobody knows which are stale, which are real work, and which hide
portability bugs in a published library. Two deserve immediate action:
`ScrollHandler.ts:84-86` hardcodes an assumption that "will only work inside
Admin" — a latent portability bug for any consumer whose layout differs — and
the `draggable-utils.ts` header TODOs admit the same DnD geometry logic is
"more or less duplicated in inkling-card-gallery", so fixes in one repo never
reach the other. This plan clears the cluster: triage all 25, fix the two
actionable ones, and produce a decision on the cross-repo duplication.

## Current state

- `src/utils/draggable/ScrollHandler.ts:84-86` — hardcoded Admin assumption
  (read the full method; the TODO describes a scroll-container lookup that
  only works in the Admin app's layout).
- `src/utils/draggable/draggable-utils.ts:6` — TODO: "more or less duplicated
  in inkling-card-gallery other than direction"; `:31` — second TODO noting
  `getParent` naming drift.
- `src/nodes/BookmarkNodeComponent.tsx:61,77,217` — three TODOs on event
  handling/custom hooks in one file.
- `src/components/ui/SettingsPanel.tsx:209-224` — `InputUrlSetting`
  autocomplete sets state after possible unmount (same async-race class as
  plan 005; flagged there as deferred to this plan).
- `src/plugins/MarkdownShortcutPlugin.tsx:27`, `src/plugins/AtLinkPlugin.tsx:393`,
  `src/utils/getEditorCardNodes.ts:3` — other known markers
  (`getEditorCardNodes`'s upstream-PR TODO is being relocated by plan 011;
  if 011 landed, skip it here).
- Full list: `grep -rn "TODO\|FIXME\|HACK" src/ --include='*.ts' --include='*.tsx'`
  — expect ~25 hits; enumerate at start.

Repo conventions: TypeScript strict, single quotes, no semicolons, width 120
(`oxfmt`). The `inkling-card-gallery` repo is **not** in this working tree —
cross-repo investigation requires access the executor may not have (see Step
3's fallback).

## Commands you will need

| Purpose      | Command                      | Expected on success |
| ------------ | ---------------------------- | ------------------- |
| Install      | `pnpm install`               | exit 0              |
| Typecheck    | `pnpm typecheck`             | exit 0              |
| Lint         | `pnpm lint`                  | exit 0              |
| Unit tests   | `pnpm test:unit`             | all pass            |
| E2E (scroll) | `pnpm test:e2e -- -g "drag"` | pass                |

## Scope

**In scope**:

- `src/utils/draggable/ScrollHandler.ts`
- `src/components/ui/SettingsPanel.tsx` (lines ~209-224 only)
- `docs/tech-debt-triage.md` (create — the triage list and the draggable
  duplication decision)
- Any TODO comment line removed because it is stale (delete only, no code
  change) — in the files enumerated at Step 1

**Out of scope**:

- The `inkling-card-gallery` repository itself (no code changes there in this
  plan).
- Reworking BookmarkNodeComponent's event handling (its TODOs get triaged,
  not implemented — if one is a one-line fix, do it; otherwise it goes on the
  list).
- The remaining `editor._*` internals — plan 011.
- The deferred untested hooks — plan 017 tracks them; just reference.

## Git workflow

- Branch: `advisor/023-triage-todos-draggable`
- Commit style: e.g. `fix(draggable): make ScrollHandler container configurable`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Enumerate and triage all markers

Run the grep, open each site, and classify into: **stale** (code no longer
matches the TODO — delete the comment), **tracked** (real work, not now —
keep the comment, add to `docs/tech-debt-triage.md` with a one-line scope),
**fix-now** (this plan). Write `docs/tech-debt-triage.md` with the full
table (file:line, marker text, classification, one-line note).

Expected fix-now items (verify, don't assume): ScrollHandler portability,
SettingsPanel unmount race. Everything else defaults to stale-or-tracked.

### Step 2: Fix the ScrollHandler portability TODO

Read `ScrollHandler.ts` around `:84-86`. Make the scroll container
configurable: accept the container element (or a selector) via the
constructor/options of the class, defaulting to the current Admin-specific
lookup so existing behavior is unchanged. Update the TODO comment to describe
the new option.

**Verify**: `pnpm typecheck` → exit 0; `pnpm test:unit` → all pass;
`pnpm test:e2e -- -g "drag"` → pass (or report as not-run).

### Step 3: Fix the SettingsPanel unmount race

At `SettingsPanel.tsx:209-224`, apply the same pattern as plan 005's
HeaderCard fix: capture the request input in a local, guard the `.then`
state update with a `cancelled` flag flipped in effect cleanup.

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0;
`pnpm test:unit -t "SettingsPanel"` → pass (a SettingsPanel test exists under
`test/unit/components/`).

### Step 4: Decide the draggable duplication

Investigate the `inkling-card-gallery` copy: if the sibling repo is
accessible (check `ls ../inkling-card-gallery` or ask the operator), diff its
draggable utils against `src/utils/draggable/draggable-utils.ts` and record
in `docs/tech-debt-triage.md`: which copy has drifted where, and a
recommendation — (a) extract a shared internal package, (b) vendor-sync with
a source-of-truth note in both files, or (c) accept duplication with a
"change both" comment. If the repo is **not** accessible, record option (b)
as the default: add a header comment to `draggable-utils.ts` naming
`inkling-card-gallery` as the second home and requiring mirrored changes,
replacing the vague TODO.

**Verify**: the two TODO comments at `draggable-utils.ts:6,31` are resolved
(replaced by the decision), and the doc records the reasoning.

## Test plan

- ScrollHandler: existing drag e2e tests are the net; if a unit seam exists
  (`test/unit/` draggable tests — check), add a case constructing the handler
  with an explicit container.
- SettingsPanel: extend the existing component test with a rapid-prop-change
  case if the harness makes it cheap; otherwise rely on typecheck + manual
  smoke note in the commit.

## Done criteria

- [ ] `docs/tech-debt-triage.md` exists with all ~25 markers classified
- [ ] `grep -rn "TODO\|FIXME\|HACK" src/ --include='*.ts' --include='*.tsx' | wc -l`
      decreased; every remaining marker appears in the triage doc
- [ ] ScrollHandler accepts a configurable container (default = current behavior)
- [ ] SettingsPanel effect has a cancellation guard
- [ ] The draggable-duplication decision is recorded and both TODOs resolved
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A TODO marked "stale" is actually load-bearing documentation (the code
  still does what the TODO describes as temporary) — reclassify as tracked;
  do not delete.
- The ScrollHandler change alters behavior for the current Admin layout (e2e
  drag tests fail) — revert to a smaller change and report.
- The BookmarkNodeComponent TODOs turn out to be one-line fixes of real bugs —
  fix only if obviously correct; otherwise track and report.
- `inkling-card-gallery` access reveals the copies have drifted in
  behavior-incompatible ways — that is a product decision; document and stop.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- `docs/tech-debt-triage.md` is a living list: new TODOs should be added with
  a classification; reviewers can reject TODO-less drive-by comments or
  require triage entries.
- The tracked list is the seed for the next `/improve reconcile` — it records
  what was deliberately not done and why.
- If the shared-package option (a) is chosen later, it becomes its own plan
  with cross-repo coordination.
