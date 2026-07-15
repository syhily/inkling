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
pnpm verify:package # packed-consumer smoke test (ESM + CJS, react peers only)
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

- `CONTEXT.md` is the domain glossary (card, card adjacency, card spec, card declaration, render target). Keep it current as terms crystallize.
- `src/index.ts` is the public barrel. Do **not** import from `@/index` inside `src/nodes/*Node.tsx` wrapper files; import shared primitives directly (`@/components/InklingCardWrapper`, `@/nodes/MinimalNodes`).
- Wrapper nodes (`src/nodes/*Node.tsx`) extend base nodes (`src/nodes/base/nodes/*/`).
- Each card has a renderer under `src/nodes/base/nodes/<card>/`.

## Documented tradeoffs

- The public markdown round-trip API (`src/markdown/round-trip.ts`) intentionally uses a constrained node set and does not round-trip decorator cards. See `docs/markdown-api.md` and `docs/markdown-card-transformers.md`.
- Feature runtimes (markdown-it, CodeMirror, emoji-mart, fast-average-color, yjs/y-websocket) are bundled into the dist artifacts; only `react`/`react-dom` are external peers. The CJS artifact is `dist/editor.umd.cjs`; `dist/editor.umd.js` is a legacy copy with an identical runtime body made by `scripts/copy-legacy-umd.mjs`. `pnpm verify:package` (`scripts/verify-packed-package.mjs`) is the packed-consumer gate — do not re-externalize feature packages without it.
- `pnpm build` also emits the single bundled declaration `dist/editor.d.ts` via `scripts/build-types.mjs` (dts-bundle-generator on the repo's own TypeScript; unplugin-dts/API Extractor cannot parse TS 6 output). Types of bundled runtimes are inlined; the `react`/`react-dom` family is the only type-level external. `pnpm verify:types` (`scripts/verify-packed-types.mjs`) is the packed type-consumer gate. Base node classes must not reuse DOM global names (e.g. `BaseAudioNode`, not `AudioNode`) — declaration bundlers collide with lib.dom.d.ts.

## Testing

- Unit tests: Vitest, jsdom, globals enabled.
- E2E tests: Playwright against `pnpm dev:test` on port 5174.
- Coverage thresholds are in `vitest.config.ts`.

### AI-friendly vs human-friendly entry points

AI agents (scripted, parseable output):

- `pnpm test:e2e:quiet` — e2e with the single-line reporter; append spec paths directly to narrow (e.g. `pnpm test:e2e:quiet test/e2e/linking.test.ts`).
- `pnpm test:unit` — full unit suite; `pnpm vitest run <file>` for one file.
- `pnpm typecheck`, `pnpm lint`, `pnpm lint:css`, `pnpm format:check` — static gates.

Humans (interactive, visual):

- `pnpm test:e2e:headed` — headed browser; `pnpm test:e2e:report` — HTML report.
- `pnpm test:unit:watch` — Vitest watch mode.
- `pnpm storybook` — browse card/component states at http://localhost:6006.

## Before finishing work

1. Run `pnpm typecheck`, `pnpm lint`, and `pnpm test:unit`.
2. Run `pnpm format` if you changed `package.json` or imports.
3. Do not commit secrets or external fixture URLs for removed integrations.
