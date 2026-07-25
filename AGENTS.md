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
pnpm bump           # taze: write latest dep versions to package.json + install
```

## Code style

- Formatter/linter: `oxfmt` and `oxlint`.
- Single quotes, no semicolons, trailing commas, print width 120.
- Tailwind classes scoped under `.inkling-lexical`.
- Import sorting is handled by `oxfmt`.

## Architecture notes

- `CONTEXT.md` is the domain glossary (card, card adjacency, card spec, card declaration, render target). Keep it current as terms crystallize.
- `src/index.ts` is the public barrel. Do **not** import from `@/index` inside `src/nodes/*Node.ts` shim files; import shared primitives directly (`@/components/InklingCardWrapper`, `@/nodes/MinimalNodes`).
- Every card is collapsed to its declaration (`src/nodes/cards/*.declaration.ts`): the registered class is assembled exactly once per card by the memoized `assembleCardNodeOnce` in `src/nodes/assemble-card-node.ts`, and `CARD_WRAPPER_NODES` in `src/nodes/cards/card-wrappers.ts` is derived from `CARD_DECLARATIONS`. The `src/nodes/*Node.ts` paths are type-only shims re-exporting the assembled class (via `assembleCardNodeOnce`) and the base-canonical `$is*`. Base node classes are named `Base*Node` (e.g. `BaseAudioNode`) with a `$createBase*Node` factory; the public `*Node` name / `$create*Node` factory belong to the shim and construct the assembled class. Card-specific behaviour lives on the declaration (e.g. transient props) or the base class (e.g. `isEmpty`); nested-editor/transient specs are adopted via class statics only — the generator's options bag has no `nestedEditors` entry. Each card declaration also carries its insert command, card-menu entry, and drag icon — `src/nodes/cards/card-commands.ts`, the menu/drag-icon registries, and the `src/nodes/cards/decorate/*.tsx` targets are derived views over the declarations, so adding a card means writing a declaration plus one decorate module.
- Top-level editor surfaces are presets over one composition rule: node sets derive from `EDITOR_BASE_NODES` (src/nodes/DefaultNodes.ts), feature plugins come from `DEFAULT_FEATURE_PLUGINS` (src/plugins/DefaultFeaturePlugins.tsx), and a custom host surface wraps its top-level tree in exactly one `InklingSurface` (exported from `src/index.ts`) inside an `InklingComposer` so nested card editors share the top-level undo stack and `onChange`.
- Each card has a renderer under `src/nodes/base/nodes/<card>/`.

## Documented tradeoffs

- The public markdown round-trip API (`src/markdown/round-trip.ts`) intentionally uses a constrained node set and does not round-trip decorator cards. See `docs/markdown-api.md` and `docs/markdown-card-transformers.md`.
- Feature runtimes (markdown-it, CodeMirror, emoji-mart, fast-average-color, yjs/y-websocket) are bundled into the dist artifacts; only `react`/`react-dom` are external peers. The CJS artifact is `dist/editor.umd.cjs`; `dist/editor.umd.js` is a legacy copy with an identical runtime body made by `scripts/copy-legacy-umd.ts`. `pnpm verify:package` (`scripts/verify-packed-package.ts`) is the packed-consumer gate — do not re-externalize feature packages without it.
- `pnpm build` also emits the single bundled declaration `dist/editor.d.ts` via `scripts/build-types.ts` (dts-bundle-generator on the repo's own TypeScript; unplugin-dts/API Extractor cannot parse TS 6 output). Types of bundled runtimes are inlined; the `react`/`react-dom` family is the only type-level external. `pnpm verify:types` (`scripts/verify-packed-types.ts`) is the packed type-consumer gate. Base node classes must not reuse DOM global names — this is why every base class is `Base*Node` (e.g. `BaseAudioNode`, not `AudioNode`): declaration bundlers collide with lib.dom.d.ts. `taze.config.ts` pins `typescript` to `minor` so `pnpm bump` cannot jump to TS 7 (no JS compiler API for these scripts); it also leaves `peerDependencies` untouched — the react peer floor is a consumer contract.
- `scripts/*.ts` run on Node's native type stripping — no tsx/ts-node. Requires Node ≥ 22.18; the repo pins 24 (`.nvmrc`, CI). No `engines` field: the published package.json must not gate consumers' Node (they never run these scripts).

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
