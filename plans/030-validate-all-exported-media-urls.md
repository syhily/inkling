# Plan 030: Apply the existing media-URL policy to every exported media attribute

> **Executor instructions**: This is a defense-in-depth consistency fix, not a
> URL-policy redesign. Reuse `isSafeMediaUrl`; do not invent a second allowlist
> or tighten currently supported `data:`, `blob:`, relative, HTTP, or HTTPS
> sources. Add regression tests before implementation and use inert sentinel
> schemes in new fixtures.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- src/nodes/base/utils/is-safe-url.ts src/nodes/base/nodes/image src/nodes/base/nodes/gallery src/nodes/base/nodes/audio src/nodes/base/nodes/bookmark src/nodes/base/nodes/video test/nodes-base`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — unsafe/unsupported media now disappears or falls back instead of being emitted; valid media markup must remain byte-compatible
- **Depends on**: none
- **Category**: security / correctness
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

Inkling already has a centralized media-source policy and the video renderer
uses it correctly. Image, gallery, frontend audio, and frontend bookmark
renderers bypass that policy for one or more `src` attributes. The same
serialized URL can therefore be rejected by one card and emitted by another.
Some paths also pass the unchecked source into image transformation and
`srcset` helpers, expanding the boundary beyond a single DOM attribute.

This plan makes rendering behavior consistent at the final output boundary.
It does not claim that scheme filtering replaces CSP, upload validation, or
server-side sanitization.

## Current-state evidence

- `src/nodes/base/utils/is-safe-url.ts:37-60` defines
  `isSafeMediaUrl`: non-empty sources may be HTTP, HTTPS, data, blob, or
  scheme-less/relative, with ASCII control/whitespace smuggling rejected.
- `src/nodes/base/nodes/video/video-renderer.ts:53-55,81-91,154-156`
  validates the primary source and both thumbnail fields before interpolation.
- `image-renderer.ts:47-64` checks only that `src` is non-empty, then sets the
  raw value. The same value reaches local-image checks, transform callbacks,
  and srcset generation.
- `gallery-renderer.ts:38-62` validates shape/dimensions but only requires a
  non-empty `src`; line 112 sets it directly and later transform/srcset logic
  receives it.
- `audio-renderer.ts:31-45,53-100` checks only a non-empty primary source and
  writes it to `<audio>`. Its email thumbnail is validated, but the frontend
  thumbnail is assigned directly. Thumbnail visibility classes are computed
  from the unvalidated raw field.
- `bookmark-renderer.ts` validates icon/thumbnail in its email template, but
  the frontend path at lines 163-198 assigns both raw image sources.
- Existing tests cover unsafe navigation URLs and video media URLs. Image and
  gallery tests cover unsafe `href`, not unsafe `src`; audio/bookmark frontend
  media lack equivalent cases.

## Required rendering policy

Use these outcomes consistently:

| Field kind                  | Invalid/unsupported media URL outcome                                                  |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Primary image `src`         | return the renderer's existing empty container                                         |
| Primary audio `src`         | return the existing empty container for every target                                   |
| Gallery item `src`          | exclude that item before row/layout calculation; empty gallery returns empty container |
| Optional audio thumbnail    | omit/hide the thumbnail and show the existing placeholder                              |
| Optional bookmark icon      | omit the icon element                                                                  |
| Optional bookmark thumbnail | omit the thumbnail wrapper/element                                                     |
| Video sources               | retain current validated behavior as the reference                                     |

All currently allowed schemes remain accepted. Do not rewrite, normalize, or
trim the emitted valid URL unless the existing renderer already does so;
validation may inspect a trimmed form while compatibility preserves the stored
string.

## Scope

**In scope**:

- Image, gallery, audio, bookmark, and video renderer tests
- Imports/use of the existing `isSafeMediaUrl` helper
- Ensuring image optimization and srcset callbacks never receive a rejected
  source
- Small local helpers needed to avoid raw/safe value divergence

**Out of scope**:

- Changing `isSafeMediaUrl`'s allowlist or data-URL MIME policy
- Upload-time URL validation or editor-card preview behavior
- Navigation URL policy (`isSafeUrl`) except preserving its existing use
- CSP headers, remote proxying, URL reputation checks, or network fetching
- Sanitizing arbitrary HTML cards (owned by the existing sanitizer boundary)

## Commands you will need

| Purpose                | Command                                                                                                                                                                                                                                                | Expected on success |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Focused renderer tests | `pnpm test:unit -- test/nodes-base/nodes/image.test.ts test/nodes-base/nodes/gallery.test.ts test/nodes-base/nodes/audio.test.ts test/nodes-base/nodes/bookmark.test.ts test/nodes-base/nodes/video.test.ts test/nodes-base/utils/is-safe-url.test.ts` | all pass            |
| Typecheck/lint         | `pnpm typecheck && pnpm lint`                                                                                                                                                                                                                          | both exit 0         |
| Full units             | `pnpm test:unit`                                                                                                                                                                                                                                       | all tests pass      |
| Format                 | `pnpm format && pnpm format:check`                                                                                                                                                                                                                     | exits 0             |

## Git workflow

- Branch: `advisor/030-validate-exported-media-urls`
- Commit 1: `test(renderers): cover unsupported media sources`
- Commit 2: `fix(renderers): enforce media url policy consistently`
- Do not include executable exploit payloads or external fixture URLs in the
  commit.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a shared behavior matrix to focused tests

Add renderer-level tests using an inert rejected value such as
`unsupported-scheme:payload`. Do not add a live remote URL or executable
payload. For each renderer, inspect the returned DOM/serialized HTML rather
than only spying on the helper.

Required red tests:

- Image with rejected primary `src` returns the same empty-container shape as
  a blank source and contains no `img`, `source`, `src`, or `srcset`.
- Gallery with one safe and one rejected image renders only the safe item;
  rejected data does not leave an empty row. An all-rejected gallery returns
  the empty container.
- Frontend audio with rejected primary source returns the empty container.
- Frontend audio with a safe primary source and rejected thumbnail emits the
  player, omits the unsafe source, hides/omits the real thumbnail, and shows
  the existing placeholder state.
- Frontend bookmark with rejected optional icon and thumbnail still renders
  title/metadata/link, but emits neither optional image nor empty thumbnail
  wrapper.
- Email variants retain their already-safe thumbnail behavior, and audio with
  a rejected primary source follows the same primary-card outcome.

Add positive parameterized cases for `https://`, `/relative/path`,
`data:image/...`, and `blob:` using small inert values. Keep existing exact HTML
snapshots for valid cards unchanged wherever possible.

Before implementation, run the focused command and record which new cases
fail. Video and helper cases should remain green.

### Step 2: Guard primary image and audio sources at entry

In `renderImageNode`, extend the initial blank check to require
`isSafeMediaUrl(node.src)`. Return `renderEmptyContainer(document)` before
creating a figure or calling any transform/srcset helper.

In `renderAudioNode`, perform the same check before calculating thumbnail
classes or branching between frontend/email templates. This means invalid
primary media does not produce a decorative email card that cannot represent
the audio. Preserve the existing explicit `postUrl` requirement for valid
email audio.

Do not add redundant checks to every subsequent use after the entry guard. A
local `const src = node.src` is acceptable if it helps TypeScript/control-flow
clarity, but do not mutate the node.

Add spies for `canTransformImage`, `canTransformImageToFormat`, or srcset
helpers through public options where feasible; assert they are never called
for a rejected image source.

### Step 3: Filter gallery sources before layout and transforms

Make `isValidImage` require `isSafeMediaUrl(candidate.src)` in addition to the
existing structural, finite-dimension, and row checks. Keep its type predicate.

Filtering must happen before:

- `buildStructure` counts images and adjusts the final rows;
- DOM elements are created;
- local-image/resize callbacks run;
- srcset and email retina-source generation run.

Test a mixed gallery whose rejected item was the only member of a row. Assert
there is no empty `.inkling-gallery-row` and that the remaining row assignment
is deterministic under the existing layout algorithm. Do not renumber the
serialized `row` fields or mutate `node.images`.

### Step 4: Normalize optional audio thumbnail once

Calculate `safeThumbnailSrc` at the renderer entry and derive both real and
placeholder class names from that value. Refactor the two class helpers to
accept a boolean or safe string rather than the whole raw node if necessary.

Pass the safe value to frontend and email templates so neither branch can
accidentally reintroduce the raw field. The frontend path should set `src` only
when a safe thumbnail exists; otherwise omit the image or retain the existing
hidden empty `src` behavior only if exact compatibility tests require the
element for player CSS. In either case, no rejected string may appear in
markup/DOM properties.

Keep the current placeholder icon, title, duration, controls, and class names.

### Step 5: Apply the same optional-media rule to bookmark frontend output

At the top of the frontend bookmark template, derive `safeIcon` and
`safeThumbnail` exactly as the email template already does. Ideally extract a
small local helper returning both values so web/email cannot drift again.

- Create the icon `<img>` only when `safeIcon` is non-empty.
- Create the thumbnail wrapper and `<img>` only when `safeThumbnail` is
  non-empty.
- Preserve safe bookmark URL handling, reversed author/publisher classes,
  caption sanitization, and the existing safe-media markup.

Do not copy raw URLs into `data-*`, styles, or error handlers as a fallback.

### Step 6: Add a renderer consistency regression

Add a parameterized test/helper that feeds the same rejected media sentinel to
every primary media renderer and proves none of the returned HTML contains it.
This is not a substitute for the card-specific outcome assertions, but it
prevents another renderer from bypassing the centralized policy later.

Search all base renderers:

```bash
rg -n "(setAttribute\(['\"]src|\.src\s*=|src=\\?['\"]?\$\{)" src/nodes/base/nodes
```

Review each match manually. Do not mechanically change known constant assets
or already validated local variables. Record any untrusted dynamic media field
not covered by this plan and either add it here or stop with evidence.

### Step 7: Run full gates

Run:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit -- test/nodes-base/nodes/image.test.ts test/nodes-base/nodes/gallery.test.ts test/nodes-base/nodes/audio.test.ts test/nodes-base/nodes/bookmark.test.ts test/nodes-base/nodes/video.test.ts test/nodes-base/utils/is-safe-url.test.ts
pnpm test:unit
```

## Test plan

| Renderer | Rejected primary                      | Rejected optional      | Allowed-scheme regression           |
| -------- | ------------------------------------- | ---------------------- | ----------------------------------- |
| Image    | empty container; no transforms/srcset | n/a                    | HTTP(S), relative, data, blob       |
| Gallery  | item filtered; all rejected empty     | n/a                    | safe items keep layout/srcset       |
| Audio    | empty in web/email                    | thumbnail falls back   | safe player/email unchanged         |
| Bookmark | existing URL policy unchanged         | icon/thumbnail omitted | safe metadata images unchanged      |
| Video    | existing empty behavior               | thumbnails blanked     | existing positive suite stays green |

## Acceptance criteria

- Every untrusted media source emitted by these renderers passes
  `isSafeMediaUrl` first.
- Rejected strings never reach `src`, `srcset`, inline styles, or transform
  callbacks.
- Mixed galleries contain only safe images and no artifact rows.
- Optional media failure preserves usable card content and established
  placeholders.
- Existing valid-card HTML remains unchanged except where an empty optional
  `src` is intentionally removed.
- Navigation URL behavior and allowed media schemes remain compatible.
- All gates pass.

## STOP conditions

- A supported consumer intentionally uses a scheme outside the existing
  allowlist. Do not broaden the allowlist without security review and a named
  use case.
- A test demonstrates that returning an empty container for invalid primary
  audio/image breaks a documented fallback contract; report and agree on a
  non-emitting fallback.
- Gallery filtering would mutate serialized rows or persist a different node
  state; rendering must remain pure.
- A dynamic `src` is already guaranteed by a stronger trusted type/constructor
  and changing it would create a false security boundary; document that proof.
- Tightening `data:` MIME types becomes necessary. Split that policy change
  into a separate reviewed plan rather than expanding this one.

## Rollback plan

Revert renderer and test changes together. Do not revert the centralized URL
helper or existing video protections. If a compatibility exception is needed,
add a narrowly named policy function and explicit fixture rather than restoring
raw assignment across all cards.
