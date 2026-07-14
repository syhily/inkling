# Plan 032: Restore semantic GIF controls and scope keyboard handling to the selector

> **Executor instructions**: Port Koenig's useful semantic-button/focus behavior
> but do not copy its document-wide Enter handler unchanged. The completed
> selector must insert exactly once for native button activation and must not
> consume keys dispatched outside the open selector.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- src/components/ui/GifSelector.tsx src/components/ui/file-selectors/Gif/Gif.tsx test/unit/components/ui/GifSelector.test.tsx test/e2e/cards/image-card.test.ts`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — focus and key routing affect insertion, search, tab order, and editor shortcuts
- **Depends on**: none
- **Category**: accessibility / interaction bug
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

Each GIF result is currently a clickable `<div>`, so it has no native button
semantics, keyboard activation, or focus ring. The selector tracks a visual
highlight but does not focus the highlighted result. At the same time it
registers a `keydown` listener on `document`; `handleEnter` always calls
`preventDefault`, even when the event target is outside the selector. This can
interfere with the editor or another control while the selector is mounted.

Koenig's result component uses a real `button`, holds a ref, and focuses the
highlighted result. That is a concrete advantage to restore. Koenig still has
the document-wide key listener, so Inkling should combine the semantic control
with a selector-scoped event boundary and exactly-once activation.

## Current-state evidence

- `src/components/ui/file-selectors/Gif/Gif.tsx:24-39` renders a clickable
  `<div>` with `data-gif-index` and an image.
- `GifSelector.tsx:89-98` attaches/removes a keydown listener on `document`.
- `handleEnter` at lines 335-345 calls `preventDefault()` before checking the
  target or whether a GIF is highlighted.
- Arrow/Tab handling changes `highlightedGif`, but no result is focused.
- Existing unit tests dispatch many navigation keys on `document` and assert
  border classes; they do not assert roles, focus, default prevention outside
  the selector, or duplicate insertion.
- Koenig reference
  `koenig-lexical/src/components/ui/file-selectors/Gif/Gif.tsx` uses
  `<button type="button">`, a ref, and an effect that focuses the highlighted
  item.
- Inkling already preserves the selectors used by E2E tests through
  `data-gif-index`; semantic changes need not break those locators.

## Interaction contract

1. Search input remains initially focused.
2. ArrowDown or Tab from search highlights and focuses the first valid GIF.
3. Arrow keys move the visual highlight and DOM focus together.
4. Tab/Shift+Tab preserve the existing bounded navigation behavior unless the
   accessibility test proves normal tab flow is better; no focus trap may
   strand the user.
5. Enter/Space on a focused result uses native button activation and inserts
   exactly once.
6. Clicking a result inserts exactly once.
7. Keys from outside the selector are not prevented and do not change its
   highlight or insert a GIF.
8. Existing data attributes, image layout, lazy-load scrolling, provider
   search, and column navigation remain compatible.

## Scope

**In scope**:

- `Gif` result semantics, exact `GifData` prop typing, focus, and visual state
- Selector key-event ownership and focus synchronization
- Unit accessibility/interaction tests and targeted image-card E2E coverage

**Out of scope**:

- Replacing Tenor/KLIPY services or changing API payloads
- Virtualizing the GIF grid
- Redesigning masonry column geometry
- Changing the image-card insertion dataset
- Adding a generic focus-management library

## Commands you will need

| Purpose      | Command                                                          | Expected on success               |
| ------------ | ---------------------------------------------------------------- | --------------------------------- |
| Unit tests   | `pnpm test:unit -- test/unit/components/ui/GifSelector.test.tsx` | all pass                          |
| Targeted E2E | `pnpm test:e2e -- test/e2e/cards/image-card.test.ts`             | GIF mouse and keyboard cases pass |
| Type/lint    | `pnpm typecheck && pnpm lint`                                    | both exit 0                       |
| Full units   | `pnpm test:unit`                                                 | all pass                          |
| Format       | `pnpm format && pnpm format:check`                               | exits 0                           |

## Git workflow

- Branch: `advisor/032-gif-keyboard-accessibility`
- Commit 1: `test(gif): cover semantic and scoped keyboard behavior`
- Commit 2: `fix(gif): use focused buttons and local key routing`
- Commit 3: `test(gif): verify keyboard insertion end to end`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Replace test assumptions with behavior assertions

Extend `GifSelector.test.tsx` before implementation. Keep current provider,
loading, resize, and scrolling tests. Add failing cases for:

- every rendered result is discoverable with `getByRole('button', {name: ...})`;
- result buttons have `type="button"` so they cannot submit an ancestor form;
- ArrowDown from search focuses the first result as well as highlighting it;
- vertical/horizontal navigation focuses the new result;
- Enter on a focused GIF calls `onGifInsert` exactly once;
- Space on a focused GIF calls it exactly once through native button behavior;
- mouse click calls it exactly once;
- Enter and arrow keys on a sibling input outside the selector are not
  `defaultPrevented`, do not move highlight, and do not call `onGifInsert`;
- unmount removes/ends all selector key handling;
- a GIF without usable media returns no result button.

Use `userEvent.keyboard` for native button behavior where available; use
`fireEvent` only when inspecting `defaultPrevented` or geometric navigation.
Update old tests that fire on `document` to focus a real in-selector control
and dispatch there. This makes the tests express ownership rather than the
implementation mechanism.

### Step 2: Make `Gif` a semantic, exactly typed button

Change `GifProps.data` to the existing `GifData` type rather than duplicating a
partial object with `[key: string]: unknown`. Keep fallback from full GIF to
tiny GIF only if the service model and current behavior require it.

Render:

```tsx
<button
  type="button"
  data-gif-index={data.index}
  data-testid="gif-item"
  tabIndex={isHighlighted ? 0 : -1}
  onClick={onClick}
  onFocus={...}
  onMouseEnter={...}
>
```

Use a button ref and an effect/layout effect to call `.focus()` when the item
becomes highlighted. Do not call `.blur()` on every non-highlighted result;
focusing the new item naturally moves focus, and forced blur can drop focus
during rerenders.

Preserve the existing border/rounded/layout classes and add any browser-button
reset classes needed to keep appearance unchanged. Use a visible `focus-visible`
style at least as strong as the current green highlighted border. Derive the
accessible name from the GIF title/content description and retain meaningful
image alt text without duplicating the spoken label excessively. Verify with
role queries rather than adding an unnecessary ARIA role to the button.

Expose an `onFocus`/`onMouseEnter` callback that lets the selector synchronize
its state when the user tabs or points at a result.

### Step 3: Move keyboard handling to the selector boundary

Remove the `document.addEventListener('keydown', ...)` effect and handler ref.
Attach `onKeyDown` to the selector root (or the focused search/scroll region)
so bubbling events are processed only when focus is inside.

At the top of the handler:

- confirm `event.currentTarget.contains(event.target as Node)`;
- ignore events with `event.defaultPrevented`;
- ignore composition (`event.isComposing`) and modifier combinations not part
  of the selector contract;
- identify whether the target is the search input or a GIF result button.

Do not make the root itself an extra tab stop unless testing shows focus needs
an explicit recovery target.

Keep arrow/navigation geometry, but scope DOM queries to
`selectorRef.current.querySelector(...)` and use
`ownerDocument.elementFromPoint` so another selector on the page cannot match.
When highlight changes, the button effect synchronizes focus.

### Step 4: Avoid double activation from Enter and Space

Native buttons already translate Enter/Space into click. Therefore:

- when the event target is a GIF button, do not call `handleGifSelect` from the
  root key handler and do not suppress its native activation;
- when Enter/ArrowDown/Tab originates in the search input, retain the current
  transition to the first GIF and prevent only the default action necessary to
  keep focus/navigation stable;
- if a rare in-selector non-button target has a highlighted GIF, either move
  focus to the highlighted button and let a subsequent activation select it,
  or invoke selection once with an explicit test. Prefer focus-first behavior.

Space should not be added to a custom switch statement for button targets.
Click remains the single selection path. Use a stable callback if the focus
effect or lint rules require it, but do not resubscribe global listeners.

### Step 5: Synchronize pointer, focus, and changing result sets

When a button receives focus or mouse enter, set it as highlighted. When search
results change:

- clear `highlightedGif` if its ID is no longer present;
- do not focus a stale/unmounted button;
- keep search focus during active typing/loading;
- if the current highlighted GIF remains present, preserve it by stable ID
  even if array object identity changes.

Prefer comparing stable `gif.id` over `highlightedGif === gif`; provider/search
normalization may recreate objects. Update navigation lookup to handle missing
`index`, `columnIndex`, or `columnRowIndex` without non-null assertions. Those
fields should be guaranteed by the column-building service; if they are, type
that normalized internal model explicitly rather than casting.

Do not alter result ordering or column count in this plan.

### Step 6: Add one targeted E2E keyboard path

In `test/e2e/cards/image-card.test.ts`, retain existing click selection and add
one keyboard flow using the mock GIF provider already configured by the suite:

1. open the GIF selector;
2. assert search focus;
3. ArrowDown to the first result;
4. assert the button is focused/has visible focus state;
5. press Enter once;
6. assert exactly one image card/result is inserted and the selector closes as
   expected.

Also exercise an editor key outside the selector after closing to prove no
listener remains. Do not add an external network fixture.

### Step 7: Run accessibility and regression gates

Run:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit -- test/unit/components/ui/GifSelector.test.tsx
pnpm test:unit
pnpm test:e2e -- test/e2e/cards/image-card.test.ts
```

If the project has an existing axe/accessibility helper, run it against the
open selector. Do not add a large new accessibility dependency only for this
component.

## Test plan

| Input                              | Expected focus                   | Expected insertion  |
| ---------------------------------- | -------------------------------- | ------------------- |
| Mouse click result                 | clicked button/result            | once                |
| ArrowDown from search              | first GIF button                 | none                |
| Arrow navigation                   | newly highlighted button         | none                |
| Enter on GIF button                | stays on/native activates button | once                |
| Space on GIF button                | stays on/native activates button | once                |
| Enter outside selector             | outside target unchanged         | zero; not prevented |
| Results refresh removes active GIF | search or safe fallback          | zero                |

## Acceptance criteria

- GIF results are native buttons with visible keyboard focus.
- Visual highlight and actual DOM focus stay synchronized.
- No selector keyboard listener is attached to `document`/`window`.
- Enter/Space/click each insert exactly once.
- Outside keyboard events remain untouched.
- Existing selectors/data attributes and mouse E2E behavior remain compatible.
- All gates pass.

## STOP conditions

- The selector is rendered in a portal where bubbling to its root does not
  occur for focused controls. Prove the portal boundary and choose the nearest
  scoped owner, not `document` without an active-element guard.
- Native button reset changes layout enough to break masonry geometry; preserve
  semantic markup and adjust only CSS.
- Existing product requirements intentionally trap Tab inside the selector and
  conflict with accessible escape behavior. Request a UX decision with the
  current/new focus traces.
- Provider results lack stable IDs or normalized navigation indexes. Fix the
  normalization contract separately rather than adding non-null casts.
- E2E cannot run without an external GIF service. Add/reuse a local mock before
  unskipping; do not commit live fixture URLs.

## Rollback plan

Revert focus and event-boundary changes together; a button combined with the
old global Enter handler risks duplicate insertion. Keep the semantic-unit
tests as acceptance criteria for the next approach.
