# Plan 009: Create `AGENTS.md` for AI onboarding

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- AGENTS.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

The repo only has `CLAUDE.md`, which focuses on test commands. AI agents repeatedly working on this codebase need a single reference for: how to build/test/lint, code style, the node wrapper vs. base-node architecture, the public barrel rules, and documented design tradeoffs (such as the markdown round-trip constraints). `AGENTS.md` reduces repeated recon and prevents agents from reintroducing barrel cycles or violating the markdown API scope.

## Current state

- No `AGENTS.md` exists at the repo root.
- `CLAUDE.md` exists but is test-centric.
- Key conventions observed during recon:
  - Package manager: `pnpm@11.9.0`.
  - TypeScript/React/Lexical editor library; `src/index.ts` is the public barrel.
  - Commands: `pnpm typecheck`, `pnpm lint`, `pnpm lint:css`, `pnpm test:unit`, `pnpm test:e2e`, `pnpm build`, `pnpm dev`.
  - Formatter: `oxfmt`; linter: `oxlint`.
  - Node architecture: wrapper nodes in `src/nodes/*Node.tsx` import primitives directly (not from `@/index`); base nodes live in `src/nodes/base/nodes/*/`.
  - Markdown round-trip API uses a constrained node set and does not round-trip decorator cards; see `docs/markdown-api.md`.
  - Styling uses Tailwind classes scoped under `.lexical`.

## Commands you will need

| Purpose | Command             | Expected on success |
| ------- | ------------------- | ------------------- |
| Format  | `pnpm format:check` | exit 0              |
| Lint    | `pnpm lint`         | exit 0              |

## Scope

**In scope**:

- Create `AGENTS.md` at the repo root.

**Out of scope**:

- Modifying `CLAUDE.md` or other docs.
- Adding code.

## Git workflow

- Branch: `advisor/009-create-agents-md`
- Commit message style: `docs: add AGENTS.md for AI onboarding`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Write `AGENTS.md`

Create `AGENTS.md` with the following sections. Keep it concise and factual.

````markdown
# AGENTS.md — Inkling Editor

## Project overview

- Single-package repo for `@inkling/editor`, a Lexical-based rich-text editor.
- React 19, TypeScript 6, Lexical 0.46.
- Source: `src/`, tests: `test/`, demo: `demo/`.

## Essential commands

Run these in the repo root:

```bash
pnpm install
pnpm typecheck      # tsc --noEmit
pnpm lint           # oxlint
pnpm lint:css       # stylelint
pnpm test:unit      # vitest run
pnpm test:e2e       # playwright
pnpm build          # vite library build
pnpm dev            # standalone demo on http://localhost:5173
pnpm format         # oxfmt --write
pnpm format:check   # oxfmt --check
```
````

## Code style

- Formatter/linter: `oxfmt` and `oxlint`.
- Single quotes, no semicolons, trailing commas, print width 120.
- Tailwind classes scoped under `.lexical`.
- Import sorting is handled by `oxfmt`.

## Architecture notes

- `src/index.ts` is the public barrel. Do **not** import from `@/index` inside `src/nodes/*Node.tsx` wrapper files; import shared primitives directly (`@/components/InklingCardWrapper`, `@/nodes/MinimalNodes`).
- Wrapper nodes (`src/nodes/*Node.tsx`) extend base nodes (`src/nodes/base/nodes/*/`).
- Each card has a renderer under `src/nodes/base/nodes/<card>/`.

## Documented tradeoffs

- The public markdown round-trip API (`src/markdown/round-trip.ts`) intentionally uses a constrained node set and does not round-trip decorator cards. See `docs/markdown-api.md` and `docs/markdown-card-transformers.md`.
- Optional peer dependencies (markdown-it, CodeMirror, emoji-mart, fast-average-color) are externalized; missing deps disable specific cards.

## Testing

- Unit tests: Vitest, jsdom, globals enabled.
- E2E tests: Playwright against `pnpm dev:test` on port 5174.
- Coverage thresholds are in `vitest.config.ts`.

## Before finishing work

1. Run `pnpm typecheck`, `pnpm lint`, and `pnpm test:unit`.
2. Run `pnpm format` if you changed `package.json` or imports.
3. Do not commit secrets or external fixture URLs for removed integrations.

```

Adapt the content if any fact above is contradicted by the live code.

### Step 2: Verify formatting

**Verify**:
- `pnpm format:check` → exit 0
- `pnpm lint` → exit 0

## Test plan

- No code tests.
- Optional: ask a human to review `AGENTS.md` for accuracy.

## Done criteria

- [ ] `AGENTS.md` exists at repo root with the sections above.
- [ ] `pnpm format:check` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] No files outside `AGENTS.md` are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:
- An `AGENTS.md` already exists with different content (drift).
- `pnpm lint` reports errors in the new file that cannot be fixed by `pnpm format`.

## Maintenance notes

- Update `AGENTS.md` whenever a new convention (e.g., a new required command or an architecture boundary) is established.
- Do not let `AGENTS.md` become stale; stale onboarding docs are worse than none.
```
