# Plan 018: Stabilize e2e waits and triage the skipped-test cluster

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- test/e2e playwright.config.js test/clean-basic-html/clean-basic-html.test.ts test/markdown/round-trip.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (replacing sleeps with condition waits can expose real races the sleeps were hiding — that is the point, but expect some tests to need the underlying timing fixed rather than the wait tuned)
- **Depends on**: none (but plan 012 requires this plan's stable suite as its net — do 018 before 012)
- **Category**: tests
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

The e2e suite leans on 45 fixed `waitForTimeout` calls across 16 files, and CI
runs with `retries: 2`, which hides flakes instead of surfacing them — the
recent history-merge stabilization commit (`33a23bf`) had to encode Lexical's
1000ms history-merge window as literal sleeps in five files. Sleeps make the
suite both slow and racy (600ms is not a guarantee on a loaded CI runner), and
the next Lexical upgrade will rediscover this the hard way. Separately, a
cluster of skipped tests dating to the repo's init commit disables real
feature coverage (card copy/paste, gallery-by-drag, paste-as-link) and has
become invisible.

## Current state

- The repeated undo/redo pattern (5 files) — example
  `test/e2e/cards/callout-card.test.ts:363-368`:

  ```ts
  await page.keyboard.type('Hello world')
  // let the nested editor's sync to the card node settle so its history
  // entries don't interleave with the deletion entries below
  await page.waitForTimeout(600)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Backspace')
  // Lexical's history merges consecutive same-type changes within 1000ms;
  // wait so the card deletion becomes its own undo group
  await page.waitForTimeout(1200)
  ```

  Same shape in `bookmark-card-without-search.test.ts:272-277`,
  `bookmark-card-with-search.test.ts:278-283`, `code-block-card.test.ts:202-207`,
  `toggle-card.test.ts:268-279`.

- `playwright.config.js:17` — `retries: process.env.CI ? 2 : 0`.
- Skipped tests (with `git log -S` showing they date to the init commit):
  - `test/e2e/card-behaviour.test.ts:1708` — `describe.skip('CMD+BACKSPACE')`
  - `test/e2e/card-behaviour.test.ts:2203` — `test.skip('can copy/paste')`
  - `test/e2e/cards/image-card.test.ts:361` and `:1112` — caption paste,
    drag-to-gallery
  - `test/e2e/cards/bookmark-card-with-search.test.ts:201` /
    `bookmark-card-without-search.test.ts:195` — paste-as-link
  - `test/unit/plugins/EmojiPickerPlugin.test.ts:235` (unit skip)
  - `test/unit/plugins/TKPlugin.test.ts:82` (unit skip)
  - `test/clean-basic-html/clean-basic-html.test.ts:21` (unit skip)
  - `test/markdown/round-trip.test.ts:51` — `it.todo('round-trips a markdown card')`
    (owned by plan 020 — do not touch here)

Repo conventions: e2e runs via `pnpm test:e2e` against `pnpm dev:test` on
port 5174 (Playwright starts it via `webServer`). Helpers in `test/e2e/utils/`
(or similar — check imports in the test files). Unit tests: Vitest globals.

## Commands you will need

| Purpose    | Command               | Expected on success |
| ---------- | --------------------- | ------------------- |
| E2E        | `pnpm test:e2e`       | all pass            |
| E2E quiet  | `pnpm test:e2e:quiet` | all pass            |
| Unit tests | `pnpm test:unit`      | all pass            |
| Lint       | `pnpm lint`           | exit 0              |

## Scope

**In scope**:

- The five e2e files with the history-merge sleep pattern
- `playwright.config.js` (retries line only, and only after Step 2 is green)
- The skipped test files listed in Current state (except the markdown
  round-trip todo, which plan 020 owns)
- A shared wait helper if needed: `test/e2e/utils/` (extend the existing
  helpers file — find it via imports in the e2e tests)

**Out of scope**:

- The ~50ms menu-animation sleeps — keep them; they wait on CSS transitions,
  not application state.
- `test/markdown/round-trip.test.ts:51` (`it.todo`) — plan 020.
- Source changes under `src/` — if a race is real, STOP and report it as a
  product bug rather than fixing it in this test plan.
- Rewriting e2e assertions or coverage scope beyond unskipping.

## Git workflow

- Branch: `advisor/018-stabilize-e2e`
- Commit per step; style: e.g. `test(e2e): replace history-merge sleeps with condition waits`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace history-merge sleeps with condition waits

Create/extend a helper in the e2e utils (name suggestion:
`waitForHistoryGroupBoundary(page)`) that replaces the fixed waits with a
condition: poll `page.evaluate` until the editor is idle — concretely, wait
for `document.activeElement` stability plus a `requestAnimationFrame` pair,
then for the specific locator state the test next asserts (e.g.
`await expect(page.locator('[data-inkling-card="callout"]')).toBeVisible()`
already present). Where the 1000ms history-merge window is the actual
contract (the test needs the deletion to become its own undo group), keep a
single named constant `HISTORY_MERGE_WINDOW_MS = 1000` in the helper with the
explanatory comment — one documented wait replacing five anonymous ones.

Convert all five files. Run each converted file
(`pnpm test:e2e -- <path>`) three times locally — zero flakes.

### Step 2: Reduce CI retries

Set `retries: process.env.CI ? 1 : 0` in `playwright.config.js` — after the
full suite passes 3 consecutive local runs. Do not go to 0 in this plan;
flake visibility at 1 retry is already a big improvement.

**Verify**: full `pnpm test:e2e` → all pass.

### Step 3: Triage each skipped test

For every skip listed in Current state, one of three outcomes, each in its
own commit:

1. **Re-enable**: the underlying issue is gone (test passes 3×).
2. **Fix and re-enable**: the test is stale (selectors/API drifted); update
   it minimally.
3. **Delete with a note**: the feature no longer exists or the coverage moved
   elsewhere — delete the block and say why in the commit message.

If a skip hides a **real product bug** (test fails for a legitimate reason),
do not fix the product code here: leave the skip, add a
`// SKIP-REASON: <one line>` comment, and report it in the final summary.

**Verify**: `pnpm test:e2e` and `pnpm test:unit` → all pass; the two unit
skips are resolved as part of this step.

### Step 4: Add a skip sentinel

Add a CI-visible guard so new skips require justification: either an oxlint
rule (if the installed oxlint supports flagging `test.skip`/`describe.skip` —
check `oxlint.config.ts` and available rules) or a 10-line script invoked
from `pnpm lint` that greps `test/e2e test/unit` for `\.skip\(` and
`\.todo\(` and fails unless the line carries a `SKIP-REASON` comment. Pick
whichever is simpler; keep it dependency-free.

**Verify**: introduce a temporary bare skip, confirm the guard fails, revert.

## Test plan

This plan _is_ test infrastructure; verification is the suite itself plus the
guard probe in Step 4.

## Done criteria

- [ ] Full `pnpm test:e2e` passes 3 consecutive runs locally
- [ ] `grep -rn "waitForTimeout(600)\|waitForTimeout(1200)" test/e2e` returns no matches
- [ ] `playwright.config.js` retries reduced to 1 on CI
- [ ] Every skip from Current state is re-enabled, fixed, or deleted with a
      commit-message rationale (or carries `SKIP-REASON` + a reported product bug)
- [ ] The skip guard fails on a bare new skip (probed and reverted)
- [ ] `pnpm test:unit` exits 0
- [ ] No `src/` files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A converted test flakes twice after honest wait tuning — the underlying
  race is real; restore a named constant wait for that case and report the
  race as a product finding (do not fix `src/` here).
- An unskipped test reveals a product bug (see Step 3).
- Playwright browsers cannot run in the environment — this plan cannot be
  executed blind; hand off with a note.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- New e2e tests must use the condition-wait helpers; reviewers should reject
  new anonymous `waitForTimeout` above 100ms.
- `HISTORY_MERGE_WINDOW_MS` documents a Lexical behavioral constant — on
  Lexical upgrades, re-verify the merge window (0.46 changed history behavior
  once already; commits `33a23bf`, `3a4c109`).
- Plan 012 (keyboard split) depends on this suite being stable — keep 018
  green before merging 012.
