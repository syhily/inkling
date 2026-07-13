# Plan 008: Externalize yjs/y-websocket as optional peer dependencies

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/components/InklingComposer.tsx src/components/InklingNestedComposer.tsx vite.config.ts package.json README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (changes the consumer install contract for the multiplayer feature; the demo and e2e multiplayer path must keep working)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Multiplayer is opt-in (`enableMultiplayer` defaults to `false`), yet
`InklingComposer.tsx` statically imports `yjs` and `y-websocket`, so every
consumer bundle includes the collaboration stack: the built `editor.js`
(1.23 MB / 332 kB gzip) contains 38 yjs modules, 32 lib0 modules, y-protocols,
and y-websocket — an estimated 100–150 kB minified that the vast majority of
consumers never use. The repo already has a documented pattern for exactly
this situation: markdown-it, CodeMirror, emoji-mart, and fast-average-color
are externalized optional peer dependencies that disable specific features
when absent. This plan moves yjs/y-websocket onto that pattern.

## Current state

- `src/components/InklingComposer.tsx:5-6`:

  ```ts
  import { WebsocketProvider } from 'y-websocket'
  import { Doc } from 'yjs'
  ```

  Used only inside `createWebsocketProvider` (`:107-132`), which is only
  reached when `enableMultiplayer` is true (`:173-183`). Types reference
  `import('yjs').Doc` inline (`:108`) — type-only imports are free and stay.

- `src/components/InklingNestedComposer.tsx` imports only
  `@lexical/react` collaboration modules — no direct yjs imports.
  `@lexical/yjs` (pulled in by `CollaborationPlugin`) stays bundled: it is
  part of the pinned Lexical 0.46 set and is small relative to yjs/lib0.
  Do not externalize it in this plan.

- `vite.config.ts:85-93` — the library build's external list:

  ```ts
  external: [
    /^markdown-it/,
    /^@uiw\/react-codemirror/,
    /^@uiw\/codemirror-extensions-basic-setup/,
    /^@codemirror\//,
    /^emoji-mart/,
    /^@emoji-mart\//,
    'fast-average-color',
  ],
  ```

  and the UMD globals map at `:98-123` (with a deterministic fallback namer at
  `:127-129`). Also note `:59-61`: a `yjs` resolve alias to
  `require.resolve('yjs/src/index.js')` preventing CJS/ESM double-bundling in
  dev — keep it; it helps the demo, not the externalized lib build.

- `package.json:159-160` — `y-websocket: 3.0.0` and `yjs: 13.6.31` in
  `devDependencies`. `peerDependencies` (`:162-183`) and `peerDependenciesMeta`
  (`:184-245`) hold the existing optional peers — follow their exact shape.

- `README.md:13-22` — "Installing peer dependencies" section listing each
  optional peer group; add a bullet for multiplayer.

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Build: `pnpm build` (vite lib mode → `dist/`).

## Commands you will need

| Purpose           | Command                | Expected on success                          |
| ----------------- | ---------------------- | -------------------------------------------- |
| Install           | `pnpm install`         | exit 0                                       |
| Build             | `pnpm build`           | exit 0, writes `dist/`                       |
| Typecheck         | `pnpm typecheck`       | exit 0                                       |
| Lint              | `pnpm lint`            | exit 0                                       |
| Unit tests        | `pnpm test:unit`       | all pass (runs build first)                  |
| Multiplayer smoke | `pnpm dev:multiplayer` | editor loads, connects to y-websocket server |

## Scope

**In scope**:

- `vite.config.ts` (external list + globals map)
- `package.json` (peerDependencies + peerDependenciesMeta entries)
- `README.md` (peer-deps bullet)
- `src/components/InklingComposer.tsx` (only if the static imports need a
  comment or type adjustment — the imports themselves stay; externalization
  happens at the bundler)

**Out of scope**:

- `@lexical/yjs` / `@lexical/react` collaboration modules — stay bundled.
- Dynamic-import/lazy-loading alternatives — externalization is the chosen
  approach; do not re-architect `createWebsocketProvider`.
- `demo/` multiplayer wiring — should work unchanged once the deps remain in
  devDependencies.
- Changing `enableMultiplayer` semantics or defaults.

## Git workflow

- Branch: `advisor/008-externalize-yjs`
- Commit style: e.g. `perf(build): externalize yjs and y-websocket as optional peers`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Externalize in the library build

In `vite.config.ts`, add `'yjs'` and `'y-websocket'` to the `external` array
(at `:85-93`). Add explicit globals to the map at `:98-123`:

```ts
yjs: 'Y',
'y-websocket': 'yWebsocket',
```

**Verify**: `pnpm build` → exit 0. Then confirm externalization:

- `head -30 dist/editor.js | grep -E "from ['\"](yjs|y-websocket)"` → matches
  (ESM build imports them externally).
- `grep -c "y-protocols\|lib0/" dist/editor.js` → 0 (their code is no longer
  bundled). If the grep finds remnants, investigate — likely a second import
  path; report if you cannot resolve it within scope.

### Step 2: Declare the optional peers

In `package.json`, add to `peerDependencies` (match existing formatting):

```json
"y-websocket": "^3.0.0",
"yjs": "^13.6.0"
```

and to `peerDependenciesMeta`:

```json
"y-websocket": { "optional": true },
"yjs": { "optional": true }
```

Keep both in `devDependencies` (demo/tests/dev server need them). Run
`pnpm install` → exit 0. Run `pnpm format` on `package.json` if
`pnpm format:check` complains (repo rule: format after manifest changes).

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.

### Step 3: Document in README

In `README.md`'s "Installing peer dependencies" section (`:13-22`), add a
bullet in the existing style:

```markdown
- `yjs` and `y-websocket` — required by the multiplayer/collaboration mode
  (`enableMultiplayer` on `InklingComposer`).
```

**Verify**: `pnpm test:unit` → all pass (it rebuilds; confirms the build still
succeeds with the new externals).

### Step 4: Multiplayer smoke test

Run `pnpm dev:multiplayer`, open the demo URL, enable multiplayer in the demo
(if the demo exposes the toggle — check `demo/` for how `enableMultiplayer` is
set; if it requires a code change to enable, note that and instead verify via
the e2e multiplayer path: `pnpm test:e2e -- -g "multiplayer"` if such tests
exist). Confirm the websocket provider connects (status logs in console when
`multiplayerDebug` is on).

If Playwright browsers are not installed, document the manual `pnpm dev` smoke
instead: load the standard demo (multiplayer off) and confirm no console
errors about missing `yjs` — the default path must not touch the peer deps.

## Test plan

- No new unit tests: this is a packaging change. The verification is the build
  composition checks in Step 1 plus the existing suite.
- If `test/unit/build-output.test.ts` style assertions make it easy, optionally
  add one asserting `dist/editor.js` imports `yjs` externally rather than
  bundling `y-protocols` — only if it stays simple (that file reads `dist/`
  from disk; match its pattern). Skip if it complicates.

## Done criteria

- [ ] `pnpm build` exits 0 and `dist/editor.js` shows external `yjs` /
      `y-websocket` imports with zero bundled `y-protocols`/`lib0` code
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0
- [ ] `package.json` peers + meta entries present; `pnpm install` exits 0
- [ ] Standard (non-multiplayer) demo loads with no missing-peer console errors
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- The bundle still contains yjs/lib0 code after externalizing and the cause is
  an import from a file outside the in-scope list — report the importer
  instead of expanding scope silently.
- The UMD build breaks for existing consumers in a way the globals map can't
  fix (e.g. y-websocket has no usable UMD entry) — report; the fallback may be
  to mark the UMD bundle as not supporting multiplayer.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Consumers upgrading `@inkling/editor` who use `enableMultiplayer` must now
  install `yjs` + `y-websocket` — this is a **minor-version-breaking** change
  for that feature; call it out in the release notes/changelog entry.
- `@lexical/yjs` remains bundled deliberately; if a future pass wants it gone,
  it must be externalized together with the `@lexical/*` set decision (the
  repo currently bundles Lexical by design).
- Reviewers: check the `pnpm-lock.yaml` diff shows the peer edges and no
  accidental removal from devDependencies.
