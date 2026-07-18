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

`package.json` makes `pnpm typecheck` the canonical composition of `typecheck:source` and `typecheck:unit`. The existing
CI static job already runs `pnpm typecheck`, so no workflow edit was required. The existing e2e job continues to run
`pnpm test:e2e`, which is Playwright's compile-and-execute gate.

README documents the separation explicitly: Playwright specs and their browser-only helper stay with the Playwright
runner so its fixtures and browser scaffolding do not leak into the production/Vitest TypeScript programs. This is a
separate visible gate, not a silent production-config exclusion. The deliberate negative fixtures continue to be
exercised positively by `pnpm verify:types`.

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
