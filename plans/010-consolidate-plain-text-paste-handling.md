# Plan 010: Consolidate the duplicated plain-text paste handling

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/plugins/behaviour/registerPasteHandler.ts src/plugins/RestrictContentPlugin.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (the two copies have already drifted; consolidation changes the RestrictContentPlugin path to match — see Step 2 for the exact deltas and their justification)
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Two plugins implement near-identical plain-text paste logic — URL detection
followed by `PASTE_LINK_COMMAND` dispatch with a `PASTE_MARKDOWN_COMMAND`
fallback — and they have already drifted: only `registerPasteHandler` guards
against pasting onto a card shortcut (`getTextContent().startsWith('/')`) and
calls `preventDefault()` on the markdown path; the `allowBr` defaults differ
(`true` vs `allowBr ?? false`). Fixing a paste bug in one copy silently leaves
the other broken. One shared helper parameterized by the two intentional
differences eliminates the drift class.

## Current state

- `src/plugins/behaviour/registerPasteHandler.ts:45-70` (inside a
  `PASTE_COMMAND` registration):

  ```ts
  const text = clipboardData.getData(MIME_TEXT_PLAIN)

  // Use shared URL validator so mailto:, ftp:, tel: etc. are handled consistently.
  const linkMatch = text && isValidUrl(text) ? ([text, text] as RegExpMatchArray) : null
  if (linkMatch) {
    // avoid any conversion if we're pasting onto a card shortcut
    const selection = $getSelection()
    const node = $isRangeSelection(selection) ? selection.anchor.getNode() : null
    if (node && node.getTextContent().startsWith('/')) {
      return false
    }

    // we're pasting a URL, convert it to an embed/bookmark/link
    clipboardEvent.preventDefault()
    editor.dispatchCommand(PASTE_LINK_COMMAND, { linkMatch })

    return true
  }

  const html = clipboardData.getData(MIME_TEXT_HTML)
  if (text && !html) {
    clipboardEvent?.preventDefault()
    editor.dispatchCommand(PASTE_MARKDOWN_COMMAND, { text, allowBr: true })

    return true
  }
  ```

- `src/plugins/RestrictContentPlugin.tsx:72-97` — same structure, minus the
  card-shortcut guard, minus `preventDefault()` on the markdown branch, and
  `allowBr: allowBr ?? false`.

Intentional differences to preserve via parameters:

1. `allowBr` value: `true` in the behaviour plugin; the prop (default `false`)
   in RestrictContentPlugin.
2. The card-shortcut guard: meaningful only where the slash card menu exists
   (the main editor). RestrictContentPlugin is used for constrained inputs —
   keep it guard-free **unless** the executor finds RestrictContentPlugin
   mounted alongside the slash menu (it is not; see
   `demo/RestrictedContentDemo.tsx`).

Behavioral delta this plan accepts (and why): adding `preventDefault()` to the
RestrictContentPlugin markdown branch matches the other copy and Lexical's
expected "handled" contract for a command returning `true` — the missing call
is drift, not intent.

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Shared plugin helpers live in
`src/plugins/behaviour/` (e.g. `registerLinkMatching.ts`); a new
`plainTextPaste.ts` helper fits there. Paste E2E coverage:
`test/e2e/paste-behaviour.test.ts` (confirm name with `ls test/e2e | grep -i paste`).

## Commands you will need

| Purpose    | Command                       | Expected on success |
| ---------- | ----------------------------- | ------------------- |
| Install    | `pnpm install`                | exit 0              |
| Typecheck  | `pnpm typecheck`              | exit 0              |
| Lint       | `pnpm lint`                   | exit 0              |
| Unit tests | `pnpm test:unit`              | all pass            |
| E2E        | `pnpm test:e2e -- -g "paste"` | pass                |
| Format     | `pnpm format:check`           | exit 0              |

## Scope

**In scope**:

- `src/plugins/behaviour/plainTextPaste.ts` (create)
- `src/plugins/behaviour/registerPasteHandler.ts`
- `src/plugins/RestrictContentPlugin.tsx`

**Out of scope**:

- The image/file paste branch in `registerPasteHandler.ts:72-89` — stays put.
- `PASTE_LINK_COMMAND` / `PASTE_MARKDOWN_COMMAND` implementations.
- Any change to `isValidUrl` semantics.
- The `editor._updating` usage in RestrictContentPlugin — plan 011.

## Git workflow

- Branch: `advisor/010-consolidate-paste-handling`
- Commit style: e.g. `refactor(plugins): share plain-text paste handling between plugins`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract the shared helper

Create `src/plugins/behaviour/plainTextPaste.ts`:

```ts
import { $getSelection, $isRangeSelection, type LexicalEditor } from 'lexical'

import { MIME_TEXT_HTML, MIME_TEXT_PLAIN } from '@/utils/clipboard' // confirm actual import source in registerPasteHandler.ts

import { PASTE_LINK_COMMAND, PASTE_MARKDOWN_COMMAND } from './commands' // confirm actual import source
import { isValidUrl } from '…' // confirm actual import source

interface PlainTextPasteOptions {
  allowBr: boolean
  skipCardShortcutGuard?: boolean
}

export function handlePlainTextPaste(
  editor: LexicalEditor,
  clipboardData: DataTransfer,
  event: ClipboardEvent,
  { allowBr, skipCardShortcutGuard = false }: PlainTextPasteOptions,
): boolean {
  const text = clipboardData.getData(MIME_TEXT_PLAIN)

  const linkMatch = text && isValidUrl(text) ? ([text, text] as RegExpMatchArray) : null
  if (linkMatch) {
    if (!skipCardShortcutGuard) {
      const selection = $getSelection()
      const node = $isRangeSelection(selection) ? selection.anchor.getNode() : null
      if (node && node.getTextContent().startsWith('/')) {
        return false
      }
    }

    event.preventDefault()
    editor.dispatchCommand(PASTE_LINK_COMMAND, { linkMatch })

    return true
  }

  const html = clipboardData.getData(MIME_TEXT_HTML)
  if (text && !html) {
    event.preventDefault()
    editor.dispatchCommand(PASTE_MARKDOWN_COMMAND, { text, allowBr })

    return true
  }

  return false
}
```

Confirm the real import paths for `MIME_TEXT_PLAIN`, `PASTE_LINK_COMMAND`,
`PASTE_MARKDOWN_COMMAND`, and `isValidUrl` by reading the two current files'
import blocks, and copy them exactly.

### Step 2: Rewire both plugins

- `registerPasteHandler.ts`: replace lines 45–70 with
  `handlePlainTextPaste(editor, clipboardData, clipboardEvent, { allowBr: true })`
  — note the guard defaults to on.
- `RestrictContentPlugin.tsx`: replace lines 75–92 with
  `handlePlainTextPaste(editor, clipboard.clipboardData, clipboard, { allowBr: allowBr ?? false, skipCardShortcutGuard: true })`.
  Add the null guard on `clipboard.clipboardData` that the current code has
  (`clipboard?.clipboardData?.getData(...)`) — keep it before calling the
  helper.

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.

### Step 3: Verify behavior

`pnpm test:unit` → all pass. `pnpm test:e2e -- -g "paste"` → paste-behavior
tests pass (or report as not-run if Playwright browsers are unavailable and do
a manual `pnpm dev` smoke: paste a URL, paste plain text, paste text while
typing a `/` card shortcut).

## Test plan

- No new test files required; the paste e2e suite is the characterization net
  for both plugins.
- If a straightforward unit mount exists in `test/unit/plugins/` for paste
  commands, add one case asserting `preventDefault` is called on the
  RestrictContentPlugin markdown path (the intentional delta); otherwise cover
  it via the e2e smoke and note in the commit.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0
- [ ] Paste e2e tests pass, or a documented manual smoke covers: URL paste,
      plain-text paste, paste onto `/` shortcut in the main editor
- [ ] The duplicated block exists once (`grep -rn "PASTE_LINK_COMMAND, { linkMatch }" src/` → one call site in the helper)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- You find a third copy of this logic — report it; extend the helper to it
  only if it is a drop-in match.
- The `preventDefault` addition to RestrictContentPlugin breaks a paste e2e
  test — that indicates the missing call was load-bearing; report the failing
  case instead of reverting silently.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Future paste behavior (e.g. new URL schemes, markdown options) now has one
  home: `plainTextPaste.ts`. Add options there rather than forking the helper.
- `RestrictContentPlugin` still has the `editor._updating` private-API usage in
  its node transform — plan 011 addresses that separately; do not entangle.
- Reviewers: the one intentional behavioral change is `preventDefault()` on
  the RestrictContentPlugin markdown branch — call it out in review.
