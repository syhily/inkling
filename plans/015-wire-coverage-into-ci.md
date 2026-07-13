# Plan 015: Wire coverage into verification (fix `pnpm coverage` and enforce in CI)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- package.json vitest.config.ts .github/workflows/ci.yml test/unit/build-output.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (config-only; threshold ratchet may initially fail until set to the measured baseline — Step 3 handles this)
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

`pnpm coverage` fails on a fresh checkout: `test/unit/build-output.test.ts`
reads `dist/editor.umd.js` and `dist/style.css` from disk and hard-fails when
`dist/` is absent, and unlike `test:unit` (which has `pretest:unit: pnpm build`)
the `coverage` script has no build precondition. Reproduced during the audit:
`npx vitest run test/unit/build-output.test.ts` with no `dist/` → both tests
fail. Consequently nobody runs coverage, and the thresholds in
`vitest.config.ts` (lines 46 / functions 46 / branches 42 / statements 46 for
a 38k-line library with 42k lines of tests) are dead config that CI never
executes. This plan makes the coverage command work, wires it into CI, and
resets thresholds to the measured baseline so they actually ratchet.

## Current state

- `package.json:27` — `"coverage": "vitest run --coverage"` (no precoverage).
- `package.json:42` — `"pretest:unit": "pnpm build"` (the pattern to mirror).
- `vitest.config.ts:32-37`:

  ```ts
  coverage: {
    provider: 'v8',
    reporter: ['text', 'cobertura'],
    include: ['src/**'],
    thresholds: { lines: 46, functions: 46, branches: 42, statements: 46 },
  },
  ```

- `.github/workflows/ci.yml:26-32` — the `check` job runs
  `pnpm typecheck`, `pnpm lint`, `pnpm lint:css`, `pnpm test:unit`; no
  coverage step. `e2e` is a separate job (`:34-51`) gated on `check`.
- `test/unit/build-output.test.ts:5-24` — reads `dist/` files; fine once the
  build precondition exists.

Repo conventions: after changing `package.json`, run `pnpm format`.

## Commands you will need

| Purpose    | Command          | Expected on success             |
| ---------- | ---------------- | ------------------------------- |
| Install    | `pnpm install`   | exit 0                          |
| Coverage   | `pnpm coverage`  | exit 0, prints a coverage table |
| Unit tests | `pnpm test:unit` | all pass                        |
| Lint       | `pnpm lint`      | exit 0                          |

## Scope

**In scope**:

- `package.json` (add `precoverage`)
- `vitest.config.ts` (threshold values only)
- `.github/workflows/ci.yml` (add coverage step)

**Out of scope**:

- Writing new tests to raise coverage — plans 016/017 do that; this plan only
  makes the measurement work and ratchets the floor to reality.
- Changing the coverage provider or reporters.
- The e2e CI job.

## Git workflow

- Branch: `advisor/015-wire-coverage-into-ci`
- Commit style: e.g. `ci: run coverage with thresholds in the check job`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the build precondition

In `package.json`, add `"precoverage": "pnpm build"` immediately above the
`coverage` script (mirroring `pretest:unit`). Run `pnpm format` on the
manifest if `format:check` complains.

**Verify**: delete `dist/` (`rm -rf dist` — safe, it is a build artifact),
then `pnpm coverage` → exit 0 with a coverage table printed. This is the
exact reproduction that failed during the audit.

### Step 2: Measure the real baseline

From the Step 1 output, record the actual `All files` percentages for lines,
functions, branches, statements. Write them into the commit message.

### Step 3: Set thresholds to baseline −1%

In `vitest.config.ts`, set each threshold to the measured value minus one
percentage point (floor at the current config values if measured is somehow
lower — investigate and report if so; do not lower thresholds below 46/46/42/46
without reporting). The −1 buffer avoids CI flake from minor instrumentation
variance while guaranteeing regressions beyond 1% fail.

**Verify**: `pnpm coverage` → exit 0.

### Step 4: Add coverage to CI

In `.github/workflows/ci.yml`, add `- run: pnpm coverage` to the `check` job
after `- run: pnpm test:unit`. (Coverage includes a build, so test:unit's
build is reused — no extra cost beyond instrumentation.)

**Verify**: `git diff` shows the single added line; optionally push the branch
and confirm the `check` job passes in GitHub Actions (report the run URL if
you do — pushing requires operator approval per repo rules; if not approved,
note "CI change unverified remotely" in the commit).

## Test plan

- No new tests. The verification is that `pnpm coverage` runs green from a
  clean checkout and fails when thresholds are set above the baseline (sanity
  check: temporarily set lines +50 and confirm failure, then revert — do not
  commit the probe).

## Done criteria

- [ ] From a clean checkout (`rm -rf dist`), `pnpm coverage` exits 0
- [ ] `pnpm test:unit` exits 0
- [ ] Thresholds equal measured baseline −1 and are not below 46/46/42/46
- [ ] `.github/workflows/ci.yml` `check` job contains `pnpm coverage`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Measured coverage is **below** the current config thresholds — that means
  the suite regressed silently; report the numbers instead of lowering the bar.
- `pnpm coverage` is flaky across two runs with identical code — report the
  variance before choosing the buffer.
- The CI step roughly doubles job time (>10 min added) — report; consider
  moving coverage to a separate job.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Ratchet policy going forward: whenever plans 016/017 (or any test-adding
  work) raise measured coverage, bump thresholds to the new baseline −1 in the
  same PR. Never lower thresholds without a note in the commit explaining why.
- Reviewers: check the threshold diff matches the commit message's measured
  numbers.
