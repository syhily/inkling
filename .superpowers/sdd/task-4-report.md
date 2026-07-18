# Task 4 report — Batch 12A test escape-hatch cleanup

## Scope and baseline

- Requirements: `.superpowers/sdd/task-4-brief.md`
- Audit/base commit: `9c6bca0`
- Batch 12A commits: `caa5f69`, `4e77518`, `4a6faef`, `eaac8de`, `bbadc56`
- Interleaved controller-owned infrastructure fix: `9682250` (`at-link` stable search dependency). It is not included in the Batch 12A finding dispositions below.
- No deliberate negative fixture under `test/typecheck/**` or `test/typecheck-consumer/**` was changed.

## Hatch census

The census searches in-scope `test/**/*.ts(x)` for `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `as any`, `as never`, `as unknown as`, and TypeScript-rule oxlint suppressions, excluding the two deliberate typecheck-fixture trees.

- Base `9c6bca0`: **153** matches.
- Final HEAD: **86** matches.
- Removed: **67** matches, including every concrete Batch 12A finding.
- Final `as any`, `as never`, and TypeScript-rule oxlint suppressions outside the deliberate fixture trees: **0**.

The remaining 86 double assertions are the audit-confirmed runtime-true harness seams:

- Invalid-input/runtime-guard probes: `html-to-lexical.test.ts`; `nodes-base/utils/is-safe-url.test.ts`; `nodes-base/nodes/{gallery,header,markdown}.test.ts`; `nodes-base/utils/{render-context,visibility}.test.ts`. These intentionally pass legacy/null/wrong-shape values that public types reject, and assert the runtime fallback, migration, or thrown error.
- Serialized-data narrowing: `markdown/{round-trip,round-trip-cards}.test.ts` and `nodes-base/import-spec.test.ts`. The asserted runtime JSON discriminants/fields are produced immediately before the cast; no mock API is fabricated.
- Browser/jsdom bridges: `test/setup.ts`, `nodes-base/nodes/{at-link,at-link-search}.test.ts`, `unit/components/ui/{ColorPicker,GifSelector}.test.tsx`, `unit/hooks/useSettingsPanelReposition.test.tsx`, `unit/nodes/ButtonNodeComponent.test.tsx`, `unit/plugins/{HorizontalRulePlugin,MarkdownPastePlugin,PlusCardMenuPlugin,SlashCardMenuPlugin}.test.tsx`, and `unit/utils/{$isAtTopOfNode,analytics,extractVideoMetadata,getAccentColor,getAudioMetadata,getDOMRangeRect,getImageDimensions,getSelectedNode}.test.ts`. Each supplies a runtime member actually consumed by the test while jsdom cannot construct the full browser interface.
- Lexical/internal integration probes: `nodes-base/import-spec-classification.test.ts`, `unit/plugins/behaviour/{card-adjacency-default-geometry,key-down,registerKeyboardNavigation}.test.ts`, and `e2e/card-behaviour.test.ts`. The casts expose real generated statics, Lexical `_commands`, event/selection members, or the test-installed `window.lexicalEditor` bridge.

No remaining cast belongs to the erased node lists, composer tuples, generated-node facsimiles, mock access, draggable handlers, wrapper internals, movable result, or gallery assertion named by this task.

## Finding dispositions

1. Transform registration: changed `defaultNodes` to `LexicalNodeConfig[]`, spread `DEFAULT_NODES` directly, and removed the `as any`/lint suppression.
2. Import-spec and denest: passed property descriptors directly, typed the editor helper as `LexicalNodeConfig[]`, and registered `ImageNode` without a double cast.
3. Nested composers/plugins: removed all seven `NESTED_NODES as never` sites.
4. TK plugin: typed its node parameter as `LexicalNodeConfig[]`; replaced hand-written mock shapes with `vi.mocked`; typed `CardContextValue`; and used a real `$createTextNode` rather than an erased structural node.
5. Slash/Plus plugins: supplied the complete `[editor, { getTheme }]` Lexical composer tuple.
6. Upload intent: changed the factory contract to `() => LexicalNode` and appended/read the real node directly.
7. Word count: made `TestDecoratorNode` extend `DecoratorNode<null>`, accepted `LexicalNodeConfig[]`, supplied a complete composer tuple, and registered the node class directly.
8. Wrapper node tests: read the declared `__triggerFileDialog`, `__openInEditMode`, `__createdWithUrl`, and `__initialFile` fields directly.
9. Generated decorator nodes: removed the duplicate instance interface and all five instance double casts; tests now use `GeneratedDecoratorNodeClass`/`InstanceType` plus inferred generated classes.
10. Movable hook: removed the result double cast and updated Vitest mock generics to their real function signatures.
11. Draggable tests: replaced every erased handler double with a real `DragDropHandler`; hook tests spy on `registerContainer`, and all real handlers are destroyed during cleanup.
12. Image plugin: replaced ad-hoc composer mock access with `vi.mocked` and a complete tuple.
13. Gallery renderer: replaced `sizes!.length` with `toHaveLength(1)`, so no match yields a useful assertion failure.

## Minimal production type-contract changes

- `src/hooks/useMovable.ts`: exports `MovablePosition`, `MovablePositionWithSpacing`, and `UseMovableResult` (with the existing default element type) because the settings-panel test and consumers describe the hook's actual return contract. This changes declarations only, not runtime behavior.
- `src/nodes/base/generate-decorator-node.ts`: orders the generated instance's `exportDOM(...): TOutput` member before the base-class intersection. The compiler RED showed that the former order resolved calls to the base `DOMExportOutput`, losing the generated `TOutput` and its required `type` field. This is a type-only correction; runtime generation is unchanged.

## RED / GREEN evidence

- RED: after removing `DEFAULT_NODES as any` while retaining `Array<Klass<LexicalNode>>`, the focused compiler probe produced TS2322 because node replacements are not constructors. GREEN: `LexicalNodeConfig[]` compiled and the transform/import suites passed.
- RED: consuming a generated renderer through the exported class type produced TS2339/TS2345 (`type` missing from `DOMExportOutput`). GREEN: the corrected generated-instance intersection retained `TOutput`; `pnpm typecheck` and generated-node tests passed.
- The focused probe also exposed the malformed `DecoratorNode` generic, incomplete composer tuples, stale Vitest mock signatures, and erased draggable option calls. After the cleanup, none of the target files reports a hatch-caused diagnostic. Remaining probe diagnostics belong to Batch 12B's broader unit-test gate work.
- Runtime behavior was pinned throughout with focused suites after each coherent group.

## Commits

- `caa5f69 test(types): register lexical node configs honestly`
- `4e77518 test(types): model plugin harnesses with real contracts`
- `4a6faef test(types): use generated decorator node contracts`
- `eaac8de test(types): assert node and movable contracts directly`
- `bbadc56 test(draggable): use real handler contracts`

## Final verification

- `pnpm vitest run <22 affected files>`: **22 files passed, 194 tests passed**.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed (`oxlint` + skip checker).
- `pnpm lint:css`: passed.
- `pnpm format:check`: passed (857 files checked).
- `pnpm test:unit`: passed, including its build prerequisite: **227 files passed; 2011 tests passed; 21 todo; 0 failed**.

## Concerns

None for Batch 12A. The temporary focused compiler probe remains only in ignored `.superpowers/sdd/tsconfig-task4-probe.json`; it is not part of the committed product or test configuration. Batch 12B still owns adding the permanent unit/utils TypeScript gate and resolving its broader latent diagnostics.
