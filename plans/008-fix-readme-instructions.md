# Plan 008: Fix stale README instructions for demo path and test command

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- README.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

The README is the first onboarding doc for contributors and consumers. It currently points to `demo/demo.jsx`, which does not exist (the file is `demo/demo.tsx`), and claims `pnpm test` runs all tests, when it only runs unit tests. These small inaccuracies erode trust and can mislead new contributors.

## Current state

- `README.md:30`:

```markdown
Run `pnpm dev` to start the editor in standalone mode for development on http://localhost:5173. This command generates a demo site from the `index.html` file, which renders the demo app in `demo/demo.jsx`.
```

- `index.html:11` confirms the real entry is `/demo/demo.tsx`.

- `README.md:87`:

```markdown
- `pnpm test` runs all tests and exits
```

- `package.json:47` defines:

```json
"test": "vitest run"
```

which runs only unit tests. E2E tests require `pnpm test:e2e` (`package.json:48`).

Repo conventions:

- Docs use Markdown with backticks for commands and file paths.
- Keep changes minimal and localized to the inaccurate lines.

## Commands you will need

| Purpose | Command                                             | Expected on success |
| ------- | --------------------------------------------------- | ------------------- |
| Format  | `pnpm format:check`                                 | exit 0              |
| Verify  | `grep -n "demo/demo.jsx\|runs all tests" README.md` | no matches          |

## Scope

**In scope**:

- `README.md` only.

**Out of scope**:

- `CLAUDE.md` or `docs/*.md`.
- Changing package.json scripts.

## Git workflow

- Branch: `advisor/008-fix-readme-instructions`
- Commit message style: `docs(readme): correct demo entry path and test command description`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Fix the demo entry path

In `README.md`, replace:

```markdown
...which renders the demo app in `demo/demo.jsx`.
```

with:

```markdown
...which renders the demo app in `demo/demo.tsx`.
```

### Step 2: Fix the test command description

In `README.md`, replace:

```markdown
- `pnpm test` runs all tests and exits
```

with:

```markdown
- `pnpm test` runs unit tests and exits
- `pnpm test:e2e` runs end-to-end tests and exits
```

### Step 3: Verify

**Verify**:

- `pnpm format:check` → exit 0
- `grep -n "demo/demo.jsx\|runs all tests" README.md` → no matches

## Test plan

- No code tests needed.
- Optional: add a simple markdown lint or CI check that fails if `demo/demo.jsx` reappears.

## Done criteria

- [ ] `README.md` references `demo/demo.tsx`.
- [ ] `README.md` says `pnpm test` runs unit tests and lists `pnpm test:e2e` separately.
- [ ] `pnpm format:check` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- `README.md` does not contain the excerpted lines.
- `pnpm format:check` fails because of unrelated pre-existing formatting issues.

## Maintenance notes

- When renaming demo entry files or changing test scripts, update `README.md` in the same PR.
- Consider moving the command reference table into `AGENTS.md` once plan 009 lands.
