import { createCommand } from 'lexical'

import type { CardSpecNestedEditorDataset, CardSpecTransientDataset } from '@/nodes/base/generate-decorator-node'
import type { AudioData } from '@/nodes/base/nodes/audio/AudioNode'
import type { BookmarkData } from '@/nodes/base/nodes/bookmark/BookmarkNode'
import type { ButtonData } from '@/nodes/base/nodes/button/ButtonNode'
import type { CalloutData } from '@/nodes/base/nodes/callout/CalloutNode'
import type { CodeBlockData } from '@/nodes/base/nodes/codeblock/CodeBlockNode'
import type { FileData } from '@/nodes/base/nodes/file/FileNode'
import type { GalleryData } from '@/nodes/base/nodes/gallery/GalleryNode'
import type { HeaderData } from '@/nodes/base/nodes/header/HeaderNode'
import type { HtmlData } from '@/nodes/base/nodes/html/HtmlNode'
import type { ImageData } from '@/nodes/base/nodes/image/ImageNode'
import type { MathData } from '@/nodes/base/nodes/math/MathNode'
import type { ToggleData } from '@/nodes/base/nodes/toggle/ToggleNode'
import type { VideoData } from '@/nodes/base/nodes/video/VideoNode'
import type { SnippetDataset } from '@/plugins/behaviour/snippet-insertion'

import type { transientProps as audioTransientProps } from './audio.declaration'
import type {
  nestedEditors as bookmarkNestedEditors,
  transientProps as bookmarkTransientProps,
} from './bookmark.declaration'
import type { nestedEditors as calloutNestedEditors } from './callout.declaration'
import type {
  nestedEditors as codeBlockNestedEditors,
  transientProps as codeBlockTransientProps,
} from './codeblock.declaration'
import type { transientProps as fileTransientProps } from './file.declaration'
import type { nestedEditors as galleryNestedEditors } from './gallery.declaration'
import type { nestedEditors as headerNestedEditors } from './header.declaration'
import type { nestedEditors as imageNestedEditors, transientProps as imageTransientProps } from './image.declaration'
import type { nestedEditors as toggleNestedEditors } from './toggle.declaration'
import type { nestedEditors as videoNestedEditors, transientProps as videoTransientProps } from './video.declaration'

/**
 * The card insert commands — one React-free home every card declaration can
 * reference. Each command's payload is the card's public `*NodeDataset`
 * type, DERIVED here from two registry-layer sources: the base node
 * module's `*Data` (the generated property vocabulary) intersected with the
 * declaration's exported spec arrays through `CardSpecTransientDataset` /
 * `CardSpecNestedEditorDataset` (the transient/nested-editor vocabulary).
 * The shims re-export these types — no dataset vocabulary is hand-restated
 * in the wrapper layer, and this module never imports from there. The
 * derivation reads the spec ARRAYS (not `typeof declaration`) on purpose:
 * a declaration's menu entries carry these commands, so a whole-declaration
 * derivation would close a type-inference cycle; the spec arrays never
 * reference the commands, and the imports above are type-only, so the
 * runtime module graph is untouched. `INSERT_CODE_BLOCK_COMMAND` lives here
 * even though CodeBlock has no menu entry (it is inserted by its markdown
 * code fence), so all card commands share one home.
 * `OPEN_GIF_SELECTOR_COMMAND` is likewise kept here for the Image card's
 * GIF menu entry; `@/plugins/InklingSelectorPlugin` re-exports it.
 * `OPEN_IMAGE_LIBRARY_COMMAND` shares the home for the Image card's media
 * library menu entry (docs/kobato-fit-plan.md C8).
 * `INSERT_SNIPPET_COMMAND` shares the home: the snippet menu entry built by
 * `@/utils/buildCardMenu` dispatches it through the same type-erased menu
 * insert path, while `@/plugins/InklingSnippetPlugin` keeps only the
 * registration and `@/plugins/behaviour/snippet-insertion` owns the
 * `SnippetDataset` payload type and the insertion surgery.
 */

export type AudioNodeDataset = AudioData & CardSpecTransientDataset<typeof audioTransientProps>
export const INSERT_AUDIO_COMMAND = createCommand<AudioNodeDataset>()

export type BookmarkNodeDataset = BookmarkData &
  CardSpecNestedEditorDataset<typeof bookmarkNestedEditors> &
  CardSpecTransientDataset<typeof bookmarkTransientProps> & {
    // AtLinkPlugin passes a top-level `title` alongside `url`; the base node
    // constructor only reads `metadata.title`, so this is a tolerated no-op field.
    title?: string
  }
export const INSERT_BOOKMARK_COMMAND = createCommand<BookmarkNodeDataset>()

export type ButtonNodeDataset = ButtonData
export const INSERT_BUTTON_COMMAND = createCommand<ButtonNodeDataset>('INSERT_BUTTON_COMMAND')

export type CalloutNodeDataset = CalloutData & CardSpecNestedEditorDataset<typeof calloutNestedEditors>
export const INSERT_CALLOUT_COMMAND = createCommand<CalloutNodeDataset>()

export type CodeBlockNodeDataset = CodeBlockData &
  CardSpecNestedEditorDataset<typeof codeBlockNestedEditors> &
  CardSpecTransientDataset<typeof codeBlockTransientProps>
export const INSERT_CODE_BLOCK_COMMAND = createCommand<CodeBlockNodeDataset>()

export type FileNodeDataset = FileData & CardSpecTransientDataset<typeof fileTransientProps>
export const INSERT_FILE_COMMAND = createCommand<FileNodeDataset>()

export type GalleryNodeDataset = GalleryData & CardSpecNestedEditorDataset<typeof galleryNestedEditors>
export const INSERT_GALLERY_COMMAND = createCommand<GalleryNodeDataset>()

export type HeaderNodeDataset = HeaderData & CardSpecNestedEditorDataset<typeof headerNestedEditors>
export const INSERT_HEADER_COMMAND = createCommand<HeaderNodeDataset>()

export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand<void>()

export type HtmlNodeDataset = HtmlData
export const INSERT_HTML_COMMAND = createCommand<HtmlNodeDataset>()

export type ImageNodeDataset = ImageData &
  CardSpecNestedEditorDataset<typeof imageNestedEditors> &
  CardSpecTransientDataset<typeof imageTransientProps> &
  // image datasets also flow through drag-and-drop payloads that carry
  // extra keys; keep the record open for those transient fields
  Record<string, unknown>
export const INSERT_IMAGE_COMMAND = createCommand<ImageNodeDataset>()

export type MathNodeDataset = MathData
export const INSERT_MATH_COMMAND = createCommand<MathNodeDataset>()

export const INSERT_SNIPPET_COMMAND = createCommand<SnippetDataset>('INSERT_SNIPPET_COMMAND')

export type ToggleNodeDataset = ToggleData & CardSpecNestedEditorDataset<typeof toggleNestedEditors>
export const INSERT_TOGGLE_COMMAND = createCommand<ToggleNodeDataset>('INSERT_TOGGLE_COMMAND')

export type VideoNodeDataset = VideoData &
  CardSpecNestedEditorDataset<typeof videoNestedEditors> &
  CardSpecTransientDataset<typeof videoTransientProps>
export const INSERT_VIDEO_COMMAND = createCommand<VideoNodeDataset>()

export const OPEN_GIF_SELECTOR_COMMAND = createCommand<ImageNodeDataset>()
export const OPEN_IMAGE_LIBRARY_COMMAND = createCommand<ImageNodeDataset>()
