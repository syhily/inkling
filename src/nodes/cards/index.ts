import { audioDeclaration } from './audio.declaration'
import { bookmarkDeclaration } from './bookmark.declaration'
import { buttonDeclaration } from './button.declaration'
import { calloutDeclaration } from './callout.declaration'
import { codeBlockDeclaration } from './codeblock.declaration'
import { fileDeclaration } from './file.declaration'
import { galleryDeclaration } from './gallery.declaration'
import { headerDeclaration } from './header.declaration'
import { horizontalRuleDeclaration } from './horizontalrule.declaration'
import { htmlDeclaration } from './html.declaration'
import { imageDeclaration } from './image.declaration'
import { toggleDeclaration } from './toggle.declaration'
import { videoDeclaration } from './video.declaration'

export type { CardDeclaration } from './card-declaration'

/**
 * The card declarations — the single per-card source of truth (CONTEXT.md:
 * "card declaration"). Every node-set registry is a derived view over this
 * list (`deriveCardNodes`).
 *
 * The declaration order reproduces the pre-refactor card run of
 * `@/nodes/DefaultNodes`; the base `DEFAULT_NODES` in `@/nodes/base` had a
 * different historical order and pins it explicitly at the derivation site.
 */
export const CARD_DECLARATIONS = [
  codeBlockDeclaration,
  horizontalRuleDeclaration,
  imageDeclaration,
  audioDeclaration,
  videoDeclaration,
  calloutDeclaration,
  htmlDeclaration,
  fileDeclaration,
  buttonDeclaration,
  toggleDeclaration,
  headerDeclaration,
  bookmarkDeclaration,
  galleryDeclaration,
]

export type CardNodeType = (typeof CARD_DECLARATIONS)[number]['nodeType']
