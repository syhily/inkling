# Plan 007: Drop the semver runtime dependency and debounce HtmlOutputPlugin

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/utils/slugify.ts src/markdown/markdown-html-renderer.ts src/plugins/HtmlOutputPlugin.tsx package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Two independent bundle/hot-path wins. (1) `semver` — 46 modules of version
parsing machinery — is a declared **runtime** dependency used in exactly two
places, both to answer "is this version `< 4.x`?" for values like `'4.0'`.
A three-line major-version parse covers every observed input and removes the
package from every consumer's install. (2) `HtmlOutputPlugin` regenerates the
full document's HTML on every editor change (per keystroke) because
`exportHtml` is wired directly to `OnChangePlugin`; consumers rendering large
documents pay O(document) serialization per keystroke.

## Current state

- `src/utils/slugify.ts:1-18`:

  ```ts
  import semver from 'semver'
  …
  const version = semver.coerce(inklingVersion)

  if (typeof inputString !== 'string' || (inputString || '').trim() === '') {
    return ''
  }

  if (version && semver.satisfies(version, '<4.x')) {
  ```

- `src/markdown/markdown-html-renderer.ts:12,63-66`:

  ```ts
  const selectRenderer = function (options: RenderOptions): MarkdownIt {
    const version = semver.coerce(options.inklingVersion || '4.0')

    if (version && semver.satisfies(version, '<4.x')) {
  ```

  Both call sites: branch on `<4.x` vs everything else; unparseable versions
  (`semver.coerce` returns null) fall into the "latest" branch.

- `package.json:62` — `"semver": "7.8.5"` in `dependencies`;
  `package.json:111` — `"@types/semver": "^7.7.1"` in `devDependencies`.

- `src/plugins/HtmlOutputPlugin.tsx:11-18,61-65`:

  ```ts
  const exportHtml = React.useCallback(() => {
    editor.update(() => {
      const htmlString = $generateHtmlFromNodes(editor, null)
      const rootText = editor.getEditorState().read(() => $getRoot().getTextContent())
      const hasContent = rootText.trim().length > 0
      setHtml?.(hasContent ? htmlString : '')
    })
  }, [editor, setHtml])
  …
  const onChange = React.useCallback(() => {
    exportHtml()
  }, [exportHtml])

  return <OnChangePlugin onChange={onChange} />
  ```

Existing tests: `test/markdown/markdown-html-renderer.test.ts` covers both
renderer variants; `test/utils/` has slugify coverage (confirm with
`ls test/utils | grep -i slug`).

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Vitest globals.

## Commands you will need

| Purpose    | Command             | Expected on success |
| ---------- | ------------------- | ------------------- |
| Install    | `pnpm install`      | exit 0              |
| Typecheck  | `pnpm typecheck`    | exit 0              |
| Lint       | `pnpm lint`         | exit 0              |
| Unit tests | `pnpm test:unit`    | all pass            |
| Format     | `pnpm format:check` | exit 0              |

## Scope

**In scope**:

- `src/utils/slugify.ts`
- `src/markdown/markdown-html-renderer.ts`
- `src/plugins/HtmlOutputPlugin.tsx`
- `package.json` (remove two lines)
- A slugify test file (whichever exists under `test/utils/` or `test/unit/`
  — extend, don't create a parallel one)

**Out of scope**:

- Any change to slug output for either version branch — byte-identical output
  is the contract.
- The `inklingVersion` option shape (string in, same semantics).
- `HtmlOutputPlugin`'s initial-import path (lines 20–59) — untouched.
- Lodash removal — plan 009 (the debounce here is a local implementation; do
  not add a lodash import to make it "consistent").

## Git workflow

- Branch: `advisor/007-drop-semver-debounce-html-output`
- Commit style: e.g. `perf(markdown): replace semver with a major-version check`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace semver with a major-version helper

In `src/utils/slugify.ts`, remove the semver import and add:

```ts
// Only the `<4.x` vs `>=4.x` distinction matters (pre-4.0 slug formats).
// Versions that don't parse as `major.minor` are treated as latest, matching
// the old `semver.coerce(...) == null` fallthrough.
function isLegacyVersion(inklingVersion: string): boolean {
  const major = Number.parseInt(inklingVersion, 10)
  return !Number.isNaN(major) && major < 4
}
```

Replace `if (version && semver.satisfies(version, '<4.x'))` with
`if (isLegacyVersion(inklingVersion))`. Note: `'4.0'` parses to major 4 →
latest branch, same as before; `'3.9.1'` → legacy; garbage (`'dev'`) →
`Number.isNaN` → latest, same as the old null-coerce path.

Apply the identical helper in `markdown-html-renderer.ts`
(`isLegacyVersion(options.inklingVersion || '4.0')`). Either export the helper
from `slugify.ts` and import it in the renderer, or duplicate the 4 lines —
duplication is acceptable here per repo style (small, stable).

**Verify**: `pnpm test:unit -t "slugify"` and
`pnpm test:unit -t "markdown-html-renderer"` → all pass unchanged.

### Step 2: Remove semver from the manifest

Delete `"semver": "7.8.5"` from `dependencies` and `"@types/semver"` from
`devDependencies` in `package.json`. Run `pnpm install`.

**Verify**: `grep -rn "from 'semver'" src/` → no matches; `pnpm typecheck` →
exit 0 (proves no remaining type dependency).

### Step 3: Debounce HtmlOutputPlugin's change export

Add an optional prop and a local debounce (no new dependency):

```ts
export const HtmlOutputPlugin = ({
  html = '',
  setHtml,
  debounceMs = 0,
}: {
  html?: string
  setHtml?: (html: string) => void
  debounceMs?: number
}) => {
```

When `debounceMs > 0`, schedule `exportHtml` via `setTimeout` in `onChange`,
clearing the previous timer on each change and on unmount (a `React.useRef`
timer handle + cleanup effect). Keep the default `debounceMs = 0` =
synchronous current behavior, and keep the initial explicit `exportHtml()`
call (line 56) synchronous so first render is unaffected.

**Verify**: `pnpm test:unit -t "HtmlOutput"` (if such tests exist; otherwise
`pnpm test:unit`) → all pass. `pnpm typecheck` → exit 0.

## Test plan

- Slugify: add explicit cases if missing — `inklingVersion: '3.9.1'` produces
  the legacy slug; `'4.0'`, `'4.2.0'`, and `'dev'` produce the 4.x slug.
  Assert outputs are unchanged from the pre-change behavior (copy expected
  values from a run _before_ your edit, or from existing test expectations).
- Markdown renderer: existing variant tests must pass unmodified
  (`test/markdown/markdown-html-renderer.test.ts`).
- HtmlOutputPlugin: if a test file exists, add a `debounceMs` case with fake
  timers (Vitest `vi.useFakeTimers()`) asserting one `setHtml` call after
  rapid changes; if no test file exists, skip adding one — the prop is additive
  and the default path is unchanged (note this in the commit).

Verification: `pnpm test:unit` → all pass.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0 with no slug/markdown-renderer expectation changes
- [ ] `grep -rn "semver" src/ package.json` returns no matches
- [ ] `pnpm install` exits 0 and `pnpm-lock.yaml` no longer lists semver as a
      direct dependency
- [ ] `HtmlOutputPlugin` default behavior is synchronous (existing consumers
      unaffected)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- Any existing test expects semver-specific coercion behavior that the
  `parseInt` approach handles differently (e.g. versions like `'v3.9'` or
  `'4.0.0-beta'`) — report the input; extend the helper deliberately rather
  than re-adding semver.
- A consumer-visible type references `semver` types.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- `inklingVersion` gates two things: slug format and markdown renderer variant.
  Both now key off `major < 4`. When 5.x-era divergence is introduced, extend
  the helper — do not reintroduce a version library for a two-way branch.
- `debounceMs` is a new public prop on an exported plugin — mention it in the
  README API overview if plan 021 lands after this one.
- Reviewers: verify no dynamic import or transitive runtime use of semver
  remains (the grep in Done criteria covers source; the lockfile check covers
  the direct edge).
