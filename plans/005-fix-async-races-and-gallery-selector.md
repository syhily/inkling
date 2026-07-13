# Plan 005: Fix async races in link search and header color extraction, and the gallery drop selector

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/hooks/useSearchLinks.ts src/hooks/useGalleryReorder.ts src/components/ui/cards/HeaderCard/v2/HeaderCard.tsx test/unit/hooks`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (debounce/search timing changes can affect e2e expectations around the link popup)
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Three independent correctness bugs, all small:

1. `useSearchLinks` writes search results to state with no freshness guard —
   a slow older response overwrites newer results, so the user can insert a
   link to the wrong post. It also leaves `isSearching` stuck `true` when the
   final request resolves to `undefined` (the cancellation contract).
2. `HeaderCard`'s average-color effect applies the previous image's color when
   the background image changes again before `getColorAsync` resolves —
   persisting a mismatched/low-contrast text color to node data.
3. The gallery drop handler builds a `querySelector` from an unescaped `src` —
   image URLs containing `"`, `]`, or `\` (common in signed/data URLs) throw a
   `SyntaxError` mid-drag, an uncaught exception that breaks the drop.

## Current state

- `src/hooks/useSearchLinks.ts:117-142`:

  ```ts
  const search = React.useMemo(() => {
    return async function _search(term: string): Promise<void> {
      if (URL_QUERY_REGEX.test(term)) {
        setListOptions(urlQueryOptions(term))
        return
      }

      setIsSearching(true)
      const results = await searchLinks(term)

      // can return undefined if the search was cancelled …
      if (results === undefined) {
        return
      }

      setListOptions(convertSearchResultsToListOptions(results, { noResultOptions }))
      setIsSearching(false)
    }
  }, [searchLinks, noResultOptions])

  const debouncedSearch = React.useMemo(() => {
    return debounce(search, DEBOUNCE_MS)
  }, [search])
  ```

  Note: the file imports `debounce` from `lodash/debounce` (line 1) — plan 009
  replaces lodash repo-wide; if 009 lands first, use the in-repo debounce with
  identical semantics.

- `src/components/ui/cards/HeaderCard/v2/HeaderCard.tsx:144-165`:

  ```ts
  useEffect(() => {
    if (backgroundImageSrc && layout !== 'split') {
      new FastAverageColor()
        .getColorAsync(backgroundImageSrc, { defaultColor: [255, 255, 255, 255] })
        .then((color) => {
          …
          handleTextColor(matchingTextColor(correctedHex))
        })
        .catch(() => {
          // Failed to load/average the image — keep the current text color
        })
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundImageSrc, layout === 'split'])
  ```

- `src/hooks/useGalleryReorder.ts:82-87`:

  ```ts
  const { dataset } = draggableInfo
  const img = draggableInfo.element?.querySelector(`img[src="${dataset.src}"]`)

  // image card datasets may not have all of the details we need but we can fill them in
  dataset.width = dataset.width || (img as HTMLImageElement)?.naturalWidth
  dataset.height = dataset.height || (img as HTMLImageElement)?.naturalHeight
  ```

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Vitest globals. Existing hook tests in
`test/unit/hooks/` (e.g. `useGalleryReorder.test.ts`) use
`@testing-library/react`'s `renderHook` — read one first and match the pattern.

## Commands you will need

| Purpose    | Command                      | Expected on success   |
| ---------- | ---------------------------- | --------------------- |
| Install    | `pnpm install`               | exit 0                |
| Typecheck  | `pnpm typecheck`             | exit 0                |
| Lint       | `pnpm lint`                  | exit 0                |
| Unit tests | `pnpm test:unit`             | all pass              |
| E2E (spot) | `pnpm test:e2e -- -g "link"` | link-popup tests pass |
| Format     | `pnpm format:check`          | exit 0                |

## Scope

**In scope**:

- `src/hooks/useSearchLinks.ts`
- `src/components/ui/cards/HeaderCard/v2/HeaderCard.tsx` (only the effect at
  lines 144–165)
- `src/hooks/useGalleryReorder.ts` (only line 83)
- `test/unit/hooks/useSearchLinks.test.ts` (create)
- `test/unit/hooks/useGalleryReorder.test.ts` (extend)

**Out of scope**:

- `SettingsPanel.tsx:209-224` (`InputUrlSetting` autocomplete) has a similar
  setState-after-unmount pattern — noted for the TODO triage (plan 023), not
  fixed here.
- The `searchLinks` function contract itself (integrator-supplied prop).
- Replacing lodash debounce — plan 009.
- HeaderCard logic outside the average-color effect.

## Git workflow

- Branch: `advisor/005-fix-async-races`
- Commit style: e.g. `fix(hooks): guard link search against stale responses`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Guard `useSearchLinks` against stale responses and stuck state

In `useSearchLinks.ts`:

- Add `const latestTermRef = React.useRef<string | null>(null)`.
- In `_search`, set `latestTermRef.current = term` before awaiting. After the
  await, bail when `latestTermRef.current !== term` (a newer query superseded
  this one) — do not touch state in that case.
- Clear the searching flag on the undefined path when this is still the latest
  query:

  ```ts
  if (results === undefined) {
    if (latestTermRef.current === term) {
      setIsSearching(false)
    }
    return
  }
  ```

- Cancel the previous debounced instance when it is recreated:
  `React.useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch])`.

**Verify**: `pnpm test:unit -t "useSearchLinks"` → new tests pass.

### Step 2: Add a staleness check to the HeaderCard color effect

Capture the source locally and bail if it changed:

```ts
useEffect(() => {
  if (backgroundImageSrc && layout !== 'split') {
    const src = backgroundImageSrc
    let cancelled = false
    new FastAverageColor()
      .getColorAsync(src, { defaultColor: [255, 255, 255, 255] })
      .then((color) => {
        if (cancelled) {
          return
        }
        …existing body…
      })
      .catch(() => { /* keep current text color */ })
    return () => {
      cancelled = true
    }
  }
  // oxlint-disable-next-line react-hooks/exhaustive-deps
}, [backgroundImageSrc, layout === 'split'])
```

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.

### Step 3: Escape the gallery drop selector

In `useGalleryReorder.ts:83`, replace the template-literal selector with:

```ts
const img = draggableInfo.element?.querySelector(`img[src="${CSS.escape(String(dataset.src))}"]`)
```

`CSS.escape` is available in jsdom (used by the test env) and all supported
browsers. If lint flags the `String()` cast as unnecessary, drop it.

**Verify**: add the regression test below; `pnpm test:unit -t "useGalleryReorder"`
→ all pass.

## Test plan

- `test/unit/hooks/useSearchLinks.test.ts` (new; model on
  `test/unit/hooks/useGalleryReorder.test.ts` structure):
  - **out-of-order**: `searchLinks` returns deferred promises; resolve the
    first (older) query _after_ the second — assert `listOptions` reflect the
    newer query only.
  - **stuck spinner**: `searchLinks` resolves `undefined` for the final query —
    assert `isSearching` becomes `false`.
  - **URL query**: query matching `URL_QUERY_REGEX` shows the
    "Link to web page" option without calling `searchLinks`.
- `test/unit/hooks/useGalleryReorder.test.ts` (extend): dataset `src`
  containing `"]` and a quote — assert the drop handler completes without
  throwing and the image is inserted at the expected index.
- HeaderCard effect: if a practical unit test exists in
  `test/unit/components/ui/` for HeaderCard, add a rapid-src-change case
  (mock `fast-average-color` with deferred promises); if mounting the full card
  is impractical, note it in the commit and rely on the e2e header suite —
  do not add a brittle test.

Verification: `pnpm test:unit` → all pass; `pnpm test:e2e -- -g "link"` →
link-popup tests pass (run if Playwright browsers are installed; otherwise
report as not-run).

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0; new `useSearchLinks` tests and the gallery regression test exist and pass
- [ ] `grep -n 'querySelector(`img\[src="\${dataset.src}"\]`' src/hooks/useGalleryReorder.ts` returns no matches
- [ ] HeaderCard effect has a cancellation guard (verified by reading the diff)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- Plan 009 (lodash replacement) has landed and the debounce API differs from
  `.cancel()` semantics — reconcile before changing this hook; do not implement
  a third debounce flavor.
- The freshness guard breaks existing behavior where an integrator's
  `searchLinks` intentionally returns out of order (no evidence of this;
  report if a test reveals it).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- `latestTermRef` is the standard pattern for async-in-effect races in this
  codebase going forward — the same fix shape applies to `SettingsPanel.tsx`
  (tracked in plan 023's TODO triage).
- `CSS.escape` support: evergreen browsers and jsdom; no polyfill needed for
  this project's targets.
- Reviewers: confirm the debounce cancel-on-recreate doesn't drop a pending
  search when `searchLinks` identity changes every render (it shouldn't —
  `useMemo` deps keep identity stable unless the prop changes).
