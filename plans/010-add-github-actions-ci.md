# Plan 010: Add GitHub Actions CI workflow

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- .github/workflows/ci.yml`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (can run after plan 009 lands, but does not require it)
- **Category**: dx
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

The repo currently relies on Husky pre-commit hooks that only lint and format staged files. There is no CI to block type errors, failing unit tests, or broken e2e tests from landing on `main`. Adding a GitHub Actions workflow enforces the verification baseline on every PR and main-branch push.

## Current state

- `.github/hooks/pre-commit` runs `pnpm exec lint-staged`.
- `package.json:249-253` configures lint-staged to run `oxlint --fix` and `oxfmt --write`.
- No `.github/workflows/*.yml` exists.
- Baseline verification passes on `main` at `c295b9c`:
  - `pnpm typecheck` → exit 0
  - `pnpm lint` → exit 0
  - `pnpm test:unit` → 1249 passed, 25 todo
- The project uses `pnpm@11.9.0` and Node 24 locally.

Repo conventions:

- GitHub Actions workflows live in `.github/workflows/`.
- Keep the workflow focused and fast; e2e tests are slower and can be in a separate job.

## Commands you will need

| Purpose  | Command                                         | Expected on success |
| -------- | ----------------------------------------------- | ------------------- |
| Validate | `act push` (if `act` is installed)              | workflow passes     |
| Local    | `pnpm typecheck && pnpm lint && pnpm test:unit` | all exit 0          |

## Scope

**In scope**:

- Create `.github/workflows/ci.yml`.

**Out of scope**:

- Modifying Husky hooks.
- Adding deployment, release, or Storybook workflows.

## Git workflow

- Branch: `advisor/010-add-github-actions-ci`
- Commit message style: `ci: add GitHub Actions workflow for typecheck, lint, and tests`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Create the workflow file

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 11.9.0

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck

      - run: pnpm lint

      - run: pnpm lint:css

      - run: pnpm test:unit

  e2e:
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 11.9.0

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm test:e2e
```

### Step 2: Validate the workflow locally if possible

If `act` is installed:

```bash
act -j check
```

If not, at least run the same commands manually:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm lint:css
pnpm test:unit
```

**Expected**: all pass.

### Step 3: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit` → exit 0

## Test plan

- No code tests; the workflow itself is the test.
- After landing, open a PR to verify the workflow triggers and passes.

## Done criteria

- [ ] `.github/workflows/ci.yml` exists with `check` and `e2e` jobs.
- [ ] The workflow runs `pnpm typecheck`, `pnpm lint`, `pnpm lint:css`, and `pnpm test:unit` in the check job.
- [ ] The workflow runs `pnpm test:e2e` in the e2e job.
- [ ] Local verification of the same commands passes.
- [ ] No files outside `.github/workflows/ci.yml` are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- A `.github/workflows/ci.yml` already exists.
- `pnpm test:e2e` does not pass locally at `c295b9c` (the workflow should not be added on top of a broken baseline).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Keep Node and pnpm versions in the workflow in sync with `package.json` (`packageManager: pnpm@11.9.0`).
- If e2e becomes flaky on CI, split it into a scheduled job or add retries before blocking PRs.
- Update the workflow when new required checks (e.g., `pnpm format:check`) are added.
