# Task 6 report — final review remediation and retained differences

## Outcome and scope

**DONE_WITH_CONCERNS.** Both final-review Important findings are fixed in commit `a7dd99f`; no Critical or other Important
finding remains. The sole concern is the accepted pre-existing RestrictContent plain-text paste STOP, reproduced unchanged
by the final full e2e run and linked below.

- Final-review baseline: clean local `main` at `3cc28c7`.
- Whole repair review range: `4f8dd97..a7dd99f`.
- Production runtime files changed by this remediation: **0**.
- Remediation surfaces: strict gate/config/scripts, README, Playwright specs/helper, and the InklingComposer provider test.
- Report corrections: Task 4 no longer classifies `InklingComposer.test.tsx` as serialized-data narrowing; Task 5 now records
  the semantic e2e gate and the exact compiler RED.

## Final-review finding dispositions

### Important 1 — separate semantic e2e TypeScript gate: fixed

`tsconfig.e2e.json` extends the canonical strict config, explicitly loads Node and Playwright ambient types, and has exact
roots for all 45 `test/e2e/**` TypeScript specs plus `test/utils/e2e.ts`. Unit, deliberate typecheck, and consumer fixture
trees remain outside this program. Imported dependencies are still checked transitively, as TypeScript requires.

`pnpm typecheck:e2e` runs `tsc --noEmit -p tsconfig.e2e.json`; canonical `pnpm typecheck` now composes source, unit, and e2e
programs. The unchanged CI static job already invokes that canonical command. README distinguishes this semantic analysis
from `pnpm test:e2e`, which separately transforms and executes browser tests.

The first compiler RED produced **3,960 diagnostics across 46/46 target files**. Exact code counts and grouped categories
are preserved in the final-review remediation section of `task-5-report.md`. Repairs address root contracts: explicit
Playwright fixtures, honest helper payloads/options/callbacks, runtime DOM/serialized-data narrowing, and null guards. No
strict option was weakened and no forbidden hatch was added.

### Important 2 — InklingComposer provider assertions: fixed

`test/unit/InklingComposer.test.tsx` now explicitly verifies and guards the captured `LexicalProviderFactory`, retains the
factory's provider return type, checks its required surface directly, and calls `provider.disconnect()` directly. The
`factory!`, provider `as unknown as Record<string, unknown>`, and method cast are gone. Task 4's retained-hatch census no
longer falsely lists this file under serialized-data narrowing.

## Compiler RED / GREEN

```text
RED   ./node_modules/.bin/tsc --noEmit -p tsconfig.e2e.json --pretty false
      exit 2; 3,960 diagnostics / 46 files

GREEN pnpm typecheck:e2e
      exit 0

GREEN pnpm typecheck
      source, unit, and e2e semantic programs all exit 0
```

`tsc --showConfig` confirms `strict: true`, `allowJs: false`, and explicit `types: ["node", "@playwright/test"]`.
Root-file inspection confirms **45 specs + 1 e2e helper = 46 target roots**, with **0** other test roots.

## Exact covering tests and gates

| Command | Final result |
| --- | --- |
| `pnpm vitest run test/unit/InklingComposer.test.tsx` | 1 file, 17/17 passed |
| `pnpm typecheck:e2e` | passed; dedicated semantic e2e program exited 0 |
| `pnpm typecheck` | passed; source, unit, and e2e programs exited 0 |
| `pnpm lint` | passed (`oxlint` and test-skip checker) |
| `pnpm lint:css` | passed |
| `pnpm format` | completed on 859 files |
| `pnpm format:check` | passed; 859 files checked |
| `pnpm test:unit` | build passed; 227 files, 2,011 passed, 21 todo, 0 failed |
| `pnpm vitest run test/nodes-base test/html-renderer` | 48 files, 758 passed, 21 todo |
| `pnpm test:e2e:quiet test/e2e/cards/header-card.test.ts test/e2e/content-visibility.test.ts` | 28/28 passed |
| eight-spec focused e2e repair set described below | 87/87 passed |
| three-spec post-helper regression set described below, run twice | 50/50 + 50/50 passed |
| `pnpm test:e2e:quiet` | 591 passed, 8 skipped, 1 accepted RestrictContent STOP |
| `pnpm verify:package` | passed; 14 entries, ESM/CJS each loaded 64 exports |
| `pnpm verify:types` | passed; Bundler/NodeNext consumers and negative declaration check |

The eight-spec focused set was:

```text
pnpm test:e2e:quiet \
  test/e2e/node-transforms.test.ts \
  test/e2e/plus-button.test.ts \
  test/e2e/selection.test.ts \
  test/e2e/slash-menu.test.ts \
  test/e2e/plugins/DragDropReorderPlugin.test.ts \
  test/e2e/plugins/HtmlOutputPlugin.test.ts \
  test/e2e/plugins/TKPlugin.test.ts \
  test/e2e/text-transforms/headings.test.ts
```

After helper integration, this set overlapped another Playwright process and returned an invalid 83/87 result (missing
cards followed by closed page/browser errors). The two processes shared `reuseExistingServer`, so the process that owned
the reused dev server could tear it down while the other was still running. This was investigated rather than dismissed:
the exact affected `DragDropReorderPlugin`, `slash-menu`, and `plus-button` specs were run alone twice on the final helper,
passing **100/100 combined**, and the isolated full 600-case run had no corresponding failure.

## Accepted RestrictContent STOP

The final isolated full e2e run failed only
`test/e2e/plugins/RestrictContentPlugin.test.ts:45`, “can not add more than specified number of paragraphs by pasting plain
text”: **591 passed, 8 skipped, 1 failed**. The expectation and production paste handlers were not changed.

The established root-cause proof remains the
[Task 5 RestrictContent STOP evidence](./task-5-report.md#stop-item--pre-existing-restrictcontent-plain-text-paste-mismatch):
the earlier general same-priority paste listener consumes plain text with `allowBr: true` before the restriction listener
can apply `allowBr: false`, producing the observed `<br />`. This predates the final-review remediation and remains outside
the authorized type-gate repair.

## Minor review ledger and retained dispositions

1. **Repeated complete composer tuples — retained.** Each tuple states Lexical's real local context contract. A shared mock
   builder is optional test-architecture cleanup, not a type-integrity or correctness fix.
2. **Repeated uploader/drag factories — retained.** Small typed factories remain local to independent component harnesses;
   consolidating them would broaden this compiler repair without improving the checked contracts.
3. **`useMovable` internal type exports — retained.** `MovablePosition`, `MovablePositionWithSpacing`, and
   `UseMovableResult` describe the hook's actual return contract for direct internal consumers/tests. They are not exported
   from the package barrel, so no new public package surface was introduced.
4. **`DragDropHandler.EE` — retained.** The name is inherited from the vendored implementation. The plan's vendor-parity
   constraint requires preserving vendored names; renaming it alone would create avoidable cross-repo drift.
5. **At-link mock stabilization — retained as required infrastructure.** Commit `9682250` memoizes the mocked `searchLinks`
   dependency. Task 2's honest dependency wiring exposed the previously hidden unstable-function loop; without this
   smallest repair, the test rerendered indefinitely and exhausted memory. This is test infrastructure, not production
   behavior.
6. **Duplicated draggable geometry helper — retained for vendor sync.** `src/utils/draggable/draggable-utils.ts` remains
   mirrored with `inkling-card-gallery`, with the source-of-truth note and cross-repo decision recorded in
   `docs/tech-debt-triage.md`. A shared package requires separate cross-repo coordination.

## Retained hatches and scope audit

- Added-line inspection found **0** new `any`, `as any`, `as unknown as`, `as never`, non-null assertions, TypeScript
  suppressions, or lint suppressions.
- The two audit-sanctioned, runtime-true `window.lexicalEditor` structural doubles in
  `test/e2e/card-behaviour.test.ts` remain unchanged. No new browser bridge hatch was added.
- No deliberate typecheck fixture, production paste handler, RestrictContent expectation, production source file, or CI
  workflow was changed.

## Addendum — STOP and minor ledger resolution (later session)

The accepted RestrictContent STOP is **resolved**: `RestrictContentPlugin`'s `PASTE_COMMAND` listener now registers at
`COMMAND_PRIORITY_HIGH` so the restriction preempts `InklingBehaviourPlugin`'s general LOW-priority plain-text handler
regardless of mount order; a unit test pins the registration-order integration, and the e2e expectation
(`<p><span>Hello world Hello world</span></p>`) passes unmodified. The 6 inherited empty `test.fixme` linking toolbar
tests are now real implementations (`LinkToolbar` gained a default `dataTestId`; its rendered testids were previously
`undefined-*`). Minor ledger items 1, 3, and 4 are resolved: composer tuples now share
`test/utils/composer-context.ts` (`mockComposerContext`), the duplicated uploader/drag factories share
`test/utils/mock-file-factories.ts`, `useMovable`'s three interfaces are module-internal again (the one test consumer
derives them from the hook), and `DragDropHandler.EE` is renamed `eventEmitter` (file-private; no cross-repo consumer).

A fresh line-level JS→TS audit across all src domains followed, fixing 6 medium findings (unguarded `as CardNode` in
drag reorder, dropped Header nested-editor initial state, `ImageCard` figure-ref type lie, CalloutCard index-signature
dead props, ButtonCard `!`-asserted optional values, `prettifyHTML` options type) and 15 low findings. Final gates:
`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:unit` (2,012 passed), full `pnpm test:e2e:quiet`
(**598 passed, 2 platform-conditional skips, 0 failed**), `pnpm verify:package`, `pnpm verify:types` — all green.
