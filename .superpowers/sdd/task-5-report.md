# Task 5 report — Batch 12B strict unit/utils TypeScript gate

## Scope and baseline

- Requirements: `.superpowers/sdd/task-5-brief.md` and Task 5 of
  `docs/superpowers/plans/2026-07-17-typescript-conversion-repair.md`.
- Audit/base commit: `ee97adb`.
- Task 5 commits before this report: `5a59373`, `930173a`, `a7cf966`, `96e8c52`, `7ee902a`, `b26e5a5`.
- Changed product surface: the gate configuration, package scripts, README test-path rationale, and unit tests only. No
  production source, Playwright spec/helper, deliberate typecheck fixture, or CI workflow was changed.

## Architecture and gate choice

Task 5 uses a dedicated `tsconfig.unit.json` rather than adding browser-test globals to the production TypeScript program.
It extends `tsconfig.json`, so the production strictness and path settings remain canonical, and adds only the Vitest,
Node, and Testing Library matcher ambient types required by unit harnesses. Its roots are `test/unit/**/*` and
`test/utils/**/*`, plus the source/demo declaration roots needed by the tests. Imported production modules are checked
transitively.

Fresh `tsc --showConfig`/`--listFilesOnly` inspection established:

- `strict: true`; no strict option was disabled or overridden;
- **164** `test/unit/**` TypeScript files and **5** non-e2e `test/utils/**` files are included;
- comparison against the filesystem found **0 missing** eligible files and **0 unexpected** test files;
- **0** `test/e2e/**` files and no `test/utils/e2e.ts` are included.

`package.json` made `pnpm typecheck` the canonical composition of `typecheck:source` and `typecheck:unit`. The existing CI
static job already ran `pnpm typecheck`, so no workflow edit was required at Task 5 HEAD. The e2e job continued to run
`pnpm test:e2e`, which transformed and executed the browser suite but did not perform semantic TypeScript analysis.

README originally documented Playwright transformation/execution as the separate e2e path. Final review established that
this was not a semantic TypeScript gate; the final-review remediation below supersedes that incomplete architecture. The
deliberate negative fixtures continue to be exercised positively by `pnpm verify:types`.

## Exact RED evidence

The initial gate was reconstructed independently from commit `5a59373` in a detached archive, using the repository's
current installed compiler:

```text
./node_modules/.bin/tsc --noEmit -p tsconfig.unit.json --pretty false
exit 2; 608 diagnostics across 102 files
```

Diagnostics by TypeScript code (exact counts):

| Code | Count | Category |
| --- | ---: | --- |
| TS2339 | 290 | property missing on the inferred/mock contract |
| TS2322 | 128 | assignment not compatible with the real contract |
| TS7005 | 77 | variable implicitly has `any` |
| TS2345 | 31 | argument not compatible with the callee contract |
| TS18048 | 20 | value possibly `undefined` |
| TS7006 | 14 | parameter implicitly has `any` |
| TS7034 | 11 | variable implicitly has `any` in some locations |
| TS2739 | 6 | object missing required properties |
| TS2554 | 6 | wrong argument count |
| TS4104 | 4 | readonly value assigned to mutable contract |
| TS2531 | 4 | object possibly `null` |
| TS18047 | 4 | value possibly `null` |
| TS7031 | 2 | destructured binding implicitly has `any` |
| TS2741 | 2 | required property missing |
| TS2353 | 2 | unknown property in object literal |
| TS2352 | 2 | unprovable conversion |
| TS2783 | 1 | property overwritten by spread |
| TS2722 | 1 | possibly undefined function invoked |
| TS2698 | 1 | spread applied to a non-object type |
| TS2454 | 1 | variable used before assignment |
| TS18046 | 1 | value is `unknown` |

Diagnostics/files by test domain were: components **264/35**, nodes **96/26**, plugins **80/23**, hooks **66/4**,
unit-root tests **62/5**, and utils **40/9**. Totals reconcile to **608 diagnostics / 102 files**.

## Error and finding dispositions

1. **Gate wiring — fixed (`5a59373`).** Added the inheriting strict config, named source/unit commands, canonical command
   composition, and README e2e separation rationale. CI already consumed the canonical command.
2. **Component harnesses — fixed (`930173a`).** Replaced inferred open props and incomplete callbacks with exported prop
   contracts, real card/editor values, closed mock return types, runtime guards, and type-safe matcher inputs. Added the
   required Vitest/Node/matcher ambient types to the dedicated config rather than production globals.
3. **Node harnesses — fixed (`a7cf966`).** Used canonical node classes and serialized types, real constructor/clone/export
   contracts, concrete renderer props, and runtime node guards instead of inferred structural facsimiles.
4. **Utilities and root unit tests — fixed (`96e8c52`).** Typed card-menu tuples as their real iterable contract, made
   editor/node fixtures concrete, used closed GIF/upload/visibility shapes, and handled nullable/unknown results through
   guards and honest factory types.
5. **Hooks and plugins — fixed (`7ee902a`).** Completed Lexical composer tuples, used real selection/node predicates,
   corrected mock function signatures and command payloads, and modeled hook configuration/results with their public
   contracts.
6. **Escape-hatch/strictness audit — fixed.** Added-line inspection over `ee97adb..HEAD` found **0** new `any`, `as any`,
   `as unknown as`, `as never`, non-null assertions, `@ts-ignore`, `@ts-expect-error`, or lint suppressions. It also found
   no new type assertions in executable test code; the only added `as` tokens are three type-only import aliases. The
   config inherits `strict: true`, and no production or public type was weakened.
7. **Playwright compilation path — fixed with one unrelated runtime STOP item below.** The full Playwright runner compiled
   all specs and executed all 600 cases. Its one failure is deterministic, predates Task 5, and is isolated below rather
   than being hidden by the unit config.
8. **Integration-review hard findings — fixed (`b26e5a5`).** Aside/Image DOM tests now pass explicit public
   `EditorConfig` fixtures instead of reaching into `editor._config`. Word-count mutations now throw when fixture nodes
   have an unexpected shape, preventing the tests from silently passing without exercising the intended update.

## Commits

- `5a59373 test(types): add strict unit gate`
- `930173a test(types): repair component harness contracts`
- `a7cf966 test(types): repair node test contracts`
- `96e8c52 test(types): repair utility test contracts`
- `7ee902a test(types): repair hook and plugin contracts`
- `b26e5a5 test(types): keep repaired fixtures strict`

## Fresh verification

All commands below were run at Task 5 HEAD during integration verification:

| Command | Result |
| --- | --- |
| `pnpm typecheck` | passed; source and unit configs both exited 0 |
| `pnpm lint` | passed (`oxlint` and test-skip checker) |
| `pnpm lint:css` | passed |
| `pnpm format:check` | passed; 858 files checked |
| `pnpm test:unit` | passed; 227 files, 2011 passed, 21 todo, 0 failed (build prerequisite also passed) |
| `pnpm vitest run test/nodes-base test/html-renderer` | passed; 48 files, 758 passed, 21 todo |
| `pnpm vitest run test/unit/components` | passed; 37 files, 228 tests |
| `pnpm vitest run test/unit/nodes` | passed; 29 files, 211 tests |
| `pnpm vitest run test/unit/utils test/unit/*.test.ts test/unit/*.test.tsx` | passed; 50 files, 304 tests |
| `pnpm vitest run test/unit/hooks test/unit/plugins` | passed; 46 files, 367 tests |
| `pnpm vitest run test/unit/plugins/RestrictContentPlugin.test.ts test/unit/plugins/MarkdownPastePlugin.test.tsx` | passed; 2 files, 10 tests |
| focused Aside/Image/WordCount remediation suite | passed; 3 files, 21 tests |
| `pnpm test:e2e:quiet` | **failed**; 600 total: 591 passed, 8 skipped, 1 failed (STOP item below) |
| focused RestrictContent Playwright spec | **failed deterministically**; 9 passed, 1 failed (same case) |
| `pnpm build` | passed; ESM/UMD bundles and 190.1 KiB declaration bundle emitted |
| `pnpm verify:package` | passed; 14 expected tar entries; ESM and CJS consumers each loaded 64 exports |
| `pnpm verify:types` | passed; Bundler/NodeNext consumers and deliberate missing-declaration negative check |

## STOP item — pre-existing RestrictContent plain-text paste mismatch

The full e2e run and an isolated rerun both fail only
`test/e2e/plugins/RestrictContentPlugin.test.ts:46`, "can not add more than specified number of paragraphs by pasting
plain text". Expected and actual are:

```text
expected: <p><span>Hello world Hello world</span></p>
actual:   <p><span>Hello world</span><br /><span>Hello world</span></p>
```

The evidence separates this from Task 5:

- `git diff ee97adb..HEAD` changes neither the Playwright spec/helper nor production paste code. Its only
  RestrictContent change completes the composer-context tuple in the unit mock.
- The behavior-producing shared paste refactor is commit `16ff3a3`, which is an ancestor of the Task 5 base
  `ee97adb`.
- `InklingBehaviourPlugin` registers the general `PASTE_COMMAND` listener at low priority before the restriction can
  handle it. That listener calls `handlePlainTextPaste(..., { allowBr: true })`, returns `true`, and prevents the
  same-priority `RestrictContentPlugin` listener from applying `allowBr: false`. The resulting markdown hard break is the
  observed `<br />`.
- The two focused unit suites pass because they test the handlers separately, not their registration-order integration.

Fixing command ownership/priority is a production behavior change outside Batch 12B's strict unit/utils type-gating
scope. No expectation was weakened and no unrelated production fix was folded into this batch. This item remains for a
separate behavior-fix batch with an integration regression test.

## Self-review

- Re-read all five Task 5 checklist items and the Global Constraints against the final diff.
- Inspected every Task 5 commit and the complete `ee97adb..HEAD` added-line hatch delta.
- Confirmed CI reaches the new unit gate through the unchanged canonical `pnpm typecheck` call.
- Confirmed the Playwright separation is documented and executed, not hidden.
- Reconstructed RED independently and did not rely on the prior implementer's reported GREEN counts.
- Ran independent Standards and Spec review axes. The Standards review's three hard findings were remediated in
  `b26e5a5`; the Spec review's RED-record and non-green-e2e findings are the explicit RED and STOP sections above.
- No in-scope correctness, standards, or scope finding remains. The only concern is the proven pre-existing e2e STOP item
  above.

## Review ledger — judgement calls retained

- Several component tests repeat small typed uploader/drag-handler factories. Consolidating them is optional test-helper
  cleanup, not a correctness or type-integrity defect; it would broaden this compiler-repair batch across otherwise
  independent harnesses.
- Complete Lexical composer tuples are repeated across plugin/component tests. Each literal directly states the real
  context contract at its use site. A shared composer-mock helper may reduce repetition later, but introducing one is not
  required to make the strict gate honest and would be a separate test-architecture change.

## Final-review remediation — strict semantic e2e gate

Final review correctly found that Playwright's transform-and-execute path was insufficient: it did not run TypeScript's
semantic analysis over `test/e2e/**` or `test/utils/e2e.ts`. Commit `a7dd99f` closes that architecture gap.

### Gate architecture

- Added `tsconfig.e2e.json`, extending the canonical `tsconfig.json` without disabling or overriding `strict`.
- Its explicit root boundary is `test/e2e/**/*` plus `test/utils/e2e.ts`; source/demo declaration roots supply the same
  browser/module declarations as the other programs. The unit, deliberate typecheck, and consumer-fixture trees are
  explicitly excluded.
- `compilerOptions.types` is exactly `node` and `@playwright/test`, so Playwright ambient types do not leak into the source
  or Vitest programs.
- `tsc --showConfig` and `--listFilesOnly` establish `strict: true`, **45** Playwright spec roots, **1** e2e-helper root,
  and **0** other test roots. The existing `test/utils/color-select-helper.ts` is additionally checked as a normal
  transitive import from two specs; it remains a root of the unit/utils gate.
- Added `pnpm typecheck:e2e` and composed it into canonical `pnpm typecheck` after source and unit checks. The unchanged CI
  static job therefore reaches all three semantic programs. `pnpm test:e2e` remains the separate browser execution gate.
- README now distinguishes semantic `tsc` analysis from Playwright transformation and execution.

### Exact compiler RED

After adding only the config and script wiring, the first command was:

```text
./node_modules/.bin/tsc --noEmit -p tsconfig.e2e.json --pretty false
exit 2; 3,960 diagnostics across all 46 target files
```

| Code | Count | Root category |
| --- | ---: | --- |
| TS7005 | 3,687 | untyped shared Playwright `page` variables at use sites |
| TS7006 | 61 | implicit-any callback/helper parameters |
| TS2353 | 59 | object literals outside the declared helper/domain contract |
| TS7034 | 48 | implicitly typed shared variables |
| TS2339 | 40 | missing properties on inferred DOM/serialized/browser values |
| TS2345 | 22 | arguments outside the callee's real contract |
| TS18047 | 14 | nullable DOM/Playwright results |
| TS2531 | 10 | possibly-null object access |
| TS7031 | 4 | implicit-any destructured bindings |
| TS7053 | 4 | untyped dynamic property access |
| TS2551 | 3 | misspelled/missing browser bridge property |
| TS2554 | 3 | wrong argument count |
| TS7016 | 2 | missing declaration for an imported JavaScript package/module |
| TS2349 | 1 | non-callable value invoked |
| TS2774 | 1 | always-true function condition |
| TS2794 | 1 | unresolved Promise value type |

The totals reconcile to **3,960 diagnostics / 46 files**. Grouped broadly, they were **3,800** implicit-any diagnostics,
**102** property/shape diagnostics, **25** argument/arity diagnostics, **24** nullability diagnostics, **4** dynamic-index
diagnostics, **2** missing-declaration diagnostics, and **3** call/control-flow diagnostics.

### Root-cause GREEN repair

- Typed every shared browser fixture and helper parameter with Playwright's actual `Page`, `Locator`, and `Route`
  contracts. This removed the 3,735 shared-variable cascade at its declarations rather than annotating use sites.
- Closed `test/utils/e2e.ts` around its real APIs: `force` navigation, partial position assertions, bounding boxes,
  selection paths, callback execution, path-backed file payloads, data-transfer serialization, and the already-runtime-true
  `window.lexicalEditor` bridge. Nullable browser and DOM results now fail with descriptive guards.
- Narrowed serialized card data by discriminants/runtime checks, guarded nullable element/bounding-box/selection results,
  replaced the undeclared `fs-extra` import with Node's typed `readFileSync`, and corrected HTML paste callers to use the
  existing `pasteHtml` API.
- Added no `any`, `as any`, `as unknown as`, `as never`, non-null assertion, TypeScript suppression, or lint suppression.
  The two pre-existing, audit-sanctioned `window.lexicalEditor` structural doubles in `card-behaviour.test.ts` are unchanged.
- Removed the unrelated final-review provider casts in `InklingComposer.test.tsx`: the factory is explicitly guarded, its
  provider remains typed, and `provider.disconnect()` is invoked directly.

Fresh GREEN evidence is recorded in `task-6-report.md`. The accepted RestrictContent mismatch remains exactly the same
pre-existing behavior and expectation described in the STOP section above; no production paste handler or expectation was
changed.
