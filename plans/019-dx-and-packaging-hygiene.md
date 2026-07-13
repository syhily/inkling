# Plan 019: DX and packaging hygiene — format check in CI, dev-server timeout, CLAUDE.md consolidation, React peer deps

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- .github/workflows/ci.yml playwright.config.js CLAUDE.md AGENTS.md package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (the format-check step may fail on existing unformatted files — Step 1 handles it)
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Four independent one-commit-class fixes: (1) CI never runs `format:check`, so
formatting is enforced only by a bypassable local husky hook — unformatted
code lands on `main` and produces formatting-only churn in later PRs.
(2) Playwright's `webServer.timeout` is 10s for a two-process dev server
(`vite` + `y-websocket`); on a cold CI runner that reads as whole-suite
failure. (3) `CLAUDE.md` and `AGENTS.md` are divergent agent-onboarding docs
— `CLAUDE.md` is titled "Inkling Lexical Test Guide" with a partial command
set, while `AGENTS.md` is the canonical 54-line version; two sources will
keep drifting. (4) The built bundle imports `react`/`react-dom` externally,
but `package.json` never declares them as peer dependencies, so installing
`@inkling/editor` in an app without React produces no install-time warning
and fails at runtime.

## Current state

- `.github/workflows/ci.yml:26-32` — `check` job steps: typecheck, lint,
  lint:css, test:unit. No `format:check`.
- `playwright.config.js:59-64`:

  ```js
  webServer: {
    command: `pnpm dev:test`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
  ```

  `pnpm dev:test` = `concurrently "vite --port 5174" "pnpm multiplayer"`.

- `CLAUDE.md:1` — `# Inkling Lexical Test Guide` with its own command subset
  (missing lint/format/typecheck guidance that `AGENTS.md` has).
- `package.json:162-183` — `peerDependencies` lists only optional card deps;
  `react@19.2.7`/`react-dom@19.2.7` appear only in `devDependencies`
  (`:145-147`). Verified against the built bundle: `dist/editor.js` begins
  with external `react`, `react/jsx-runtime`, `react-dom`,
  `react-dom/client` imports.

Repo conventions: after changing `package.json`, run `pnpm format`.

## Commands you will need

| Purpose             | Command               | Expected on success                          |
| ------------------- | --------------------- | -------------------------------------------- |
| Install             | `pnpm install`        | exit 0                                       |
| Format check        | `pnpm format:check`   | exit 0                                       |
| Lint                | `pnpm lint`           | exit 0                                       |
| Unit tests          | `pnpm test:unit`      | all pass                                     |
| E2E (config change) | `pnpm test:e2e:quiet` | suite starts; server comes up within timeout |

## Scope

**In scope**:

- `.github/workflows/ci.yml`
- `playwright.config.js`
- `CLAUDE.md`
- `package.json` (peerDependencies block only)

**Out of scope**:

- `AGENTS.md` content itself (it is canonical; `CLAUDE.md` points to it).
- Any other workflow/job changes (coverage step is plan 015).
- Bumping react versions or changing the bundled-vs-peer split beyond the
  declaration (Lexical stays bundled by design).

## Git workflow

- Branch: `advisor/019-dx-packaging-hygiene`
- Four small commits (one per fix) or one commit with four bullets — either
  is fine; style: e.g. `ci: enforce format:check in the check job`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add format:check to CI

Run `pnpm format:check` locally first. If it fails, run `pnpm format` and
commit the formatting-only result separately **before** the CI change (keep
the two commits distinct). Then add to the `check` job in `ci.yml`, after
`pnpm lint:css`:

```yaml
- run: pnpm format:check
```

**Verify**: `pnpm format:check` → exit 0 locally.

### Step 2: Raise the Playwright webServer timeout

In `playwright.config.js`, change `timeout: 10000` to `timeout: 120000`.
Playwright polls the URL, so a fast start still proceeds immediately — this
only raises the failure ceiling.

**Verify**: `pnpm test:e2e:quiet` → the dev server starts and the suite runs
(or, if browsers are unavailable, report the config change as unverified).

### Step 3: Make CLAUDE.md a thin pointer

Replace `CLAUDE.md`'s content with a short pointer (keep the file — tooling
looks for it):

```markdown
# CLAUDE.md

This repository's agent onboarding, commands, and conventions live in
[`AGENTS.md`](./AGENTS.md). Follow it as the single source of truth.
```

**Verify**: `diff <(sed -n '1,5p' CLAUDE.md) /dev/null` shows the new content;
no other file references the old "Test Guide" title
(`grep -rn "Lexical Test Guide" . --include='*.md'` → no matches outside
git history).

### Step 4: Declare React peer dependencies

In `package.json` `peerDependencies`, add at the top of the block:

```json
"react": "^19.0.0",
"react-dom": "^19.0.0"
```

Do not mark them optional. Keep them in `devDependencies` (needed for the
repo's own build/test). Run `pnpm install` and `pnpm format` on the manifest.

**Verify**: `pnpm install` → exit 0; `pnpm typecheck` → exit 0;
`pnpm test:unit` → all pass.

## Test plan

- No new tests; verification is the command table per step. The e2e config
  change is verified by the suite starting normally.

## Done criteria

- [ ] `pnpm format:check` exits 0 and `ci.yml` contains `- run: pnpm format:check`
- [ ] `playwright.config.js` webServer timeout is 120000
- [ ] `CLAUDE.md` is a ≤10-line pointer to `AGENTS.md`
- [ ] `package.json` declares `react` and `react-dom` peers; `pnpm install` exits 0
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` all exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm format` produces a large diff (more than a handful of files) — that
  means `main` has accumulated serious formatting drift; report the scale
  before committing the formatting sweep.
- Adding React peers breaks the repo's own install (peer conflict with a
  devDependency) — report the conflict rather than loosening the range.
- Something else in tooling consumes the old `CLAUDE.md` content
  (a grep hit outside git history) — reconcile before replacing.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The React peer range (`^19`) mirrors the tested versions; widen it only
  with a tested matrix. React is externalized in `vite.config.ts:30`
  (`external: [/^react($|\/)/, /^react-dom($|\/)/]`) — keep the declaration
  and the build config in sync.
- `AGENTS.md` remains canonical; if onboarding content changes, edit
  `AGENTS.md` — `CLAUDE.md` intentionally has nothing to drift.
- If plan 015 landed first, keep its `pnpm coverage` step and place
  `format:check` before it (cheap checks first).
