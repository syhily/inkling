# Task 3 report — Batch 11 demo

## Status and commits

Status: **DONE WITH VERIFIED ENVIRONMENTAL GATE CONCERNS**

- `0bbf8e8` — `fix(demo): validate host-provided data`
- `9c2e794` — `refactor(demo): consume public host contracts`

The work was performed directly on local `main`; nothing was pushed and no branch or PR was created.

## Finding disposition (26/26)

1. **Fixed.** All five `EditorAPI` double casts now use `ExternalControlAPI` directly.
2. **Fixed.** Deleted the three local `EditorInstance`/`EditorAPI` pairs.
3. **Fixed.** `TitleTextBox` receives `ExternalControlAPI | null` and calls its methods without casts.
4. **Fixed.** `URLSearchParams` is supplied directly to router setters.
5. **Fixed.** Deleted unreachable file-extension compatibility branches and their double assertion.
6. **Fixed.** `isFileTypeKey` proves a runtime file-type key before indexing the config.
7. **Fixed.** Declared the three demo Vite environment values explicitly.
8. **Fixed.** Stored snippets are JSON-parsed as `unknown`, array-checked, item-validated, and malformed input falls back to `[]`.
9. **Fixed.** Local search-link result copies were replaced with exported `SearchResult`.
10. **Fixed.** The toggle consumes react-router's exported `SetURLSearchParams`.
11. **Fixed.** Demo upload results honestly include optional `fileName`.
12. **Fixed.** The collapsed `keyof FileTypes | string` input is simply `string` and guarded at runtime.
13. **Fixed.** Removed all three redundant `FileUploader` assertions; the main host declares a `FileUploader` value.
14. **Fixed.** Removed dead embed no-op/falsy-URL scaffolding while retaining URL validation.
15. **Fixed.** All editor click handlers narrow `event.target` with `instanceof Element`.
16. **Fixed.** Title keyboard handling uses React's typed `currentTarget`.
17. **Fixed.** Removed unwired title refs and no-op focus callbacks from the HTML/restricted demos.
18. **Fixed.** Removed never-set `defaultContent` state and omitted the equivalent undefined prop.
19. **Fixed.** Removed TreeView's unused `isOpen` prop and call-site plumbing.
20. **Fixed.** Removed unused `introContent` prop and router arguments.
21. **Fixed.** Sidebar view is the closed `'json' | 'tree'` union.
22. **Fixed.** DesignSandbox components have closed props; dead rest spreads/index-signature bags are gone and toolbar labels are exposed as `aria-label`s.
23. **Fixed.** Removed optional chaining on required Watermark values.
24. **Fixed.** The Playwright navigation escape hatch is correctly optional on `Window`.
25. **Fixed.** Added a typed React CSS custom-property augmentation and removed the CSS assertion.
26. **Fixed.** Removed optional chaining from non-null `File.name`.

## RED/GREEN evidence

- **Malformed snippets runtime RED:** `pnpm vitest run test/unit/demo/useSnippets.test.tsx` failed because localStorage value `{}` was returned instead of `[]`.
- **Malformed snippets GREEN:** the same test passes (1/1) after shape validation.
- **Nullable root compiler RED:** temporary, uncommitted `test/typecheck/demo-root-access.ts` called `api.editorInstance.getRootElement().getBoundingClientRect()`; `pnpm typecheck` correctly failed with `TS2531: Object is possibly 'null'`.
- **Nullable root GREEN:** demo hosts retrieve the public root through `getRootElement()` and use it only after a runtime null guard; the temporary negative probe was removed and `pnpm typecheck` passes.

## Verification

Passing gates at final source HEAD:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm lint:css`
- `pnpm format:check`
- `pnpm build:demo` (751 transformed modules)
- `pnpm vitest run test/nodes-base test/html-renderer` — 48 files passed; 758 passed, 21 todo
- focused snippets test — 1/1 passed
- `pnpm test:e2e:quiet test/e2e/title-behaviour.test.ts test/e2e/plugins/HtmlOutputPlugin.test.ts test/e2e/cards/file-card.test.ts` — 34/34 passed
- `pnpm build`
- `pnpm verify:package` — packed ESM/CJS both load; 64 exports
- `pnpm verify:types` — Bundler and NodeNext consumer checks pass; negative declaration check passes

Known non-scope gate evidence:

- Adding the RestrictContent spec to the relevant e2e run produced 43/44 passing. Its only failure is `can not add more than specified number of paragraphs by pasting plain text`; it reproduces alone as 9/10 and expects a space where the actual restricted paragraph has a `<br>`. This batch did not alter the RestrictContent plugin.
- Full `pnpm test:unit` was attempted repeatedly and could not finish because a Vitest worker exhausted Node's heap: first near 4 GiB, then again near 8 GiB with `NODE_OPTIONS=--max-old-space-size=8192`. The captured partial JSON reported 775 suites (772 passed, 3 pending), 2,032 tests (1,991 passed, 21 todo) before worker termination; the failures/unhandled errors are worker-loss artifacts. The demo-focused and required node/html slices above pass. No production or test workaround was added because this is outside the Batch 11 domain.

## Changed files

- `demo/DemoApp.tsx`, `demo/HtmlOutputDemo.tsx`, `demo/RestrictedContentDemo.tsx`, `demo/demo.tsx`
- `demo/components/{DesignSandbox,InitialContentToggle,Navigator,Sidebar,TitleTextBox,TreeView,Watermark}.tsx`
- `demo/types/vite-env.d.ts`
- `demo/utils/{fetchEmbed,useFileUpload,useSnippets}.ts`
- `test/unit/demo/useSnippets.test.tsx`

## Self-review and concerns

`rg` confirms no remaining demo-local `EditorAPI`/`EditorInstance`, public-contract casts, dead `introContent`, TreeView prop, or conversion double assertion. The code uses only exported host contracts and runtime narrowing for browser inputs. The only concerns are the reproducible non-scope RestrictContent e2e assertion mismatch and the full-unit Vitest worker OOM described above.
