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
