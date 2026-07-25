import { createCommand } from 'lexical'

import type { AudioNodeDataset } from '@/nodes/AudioNode'
import type { BookmarkNodeDataset } from '@/nodes/BookmarkNode'
import type { ButtonNodeDataset } from '@/nodes/ButtonNode'
import type { CalloutNodeDataset } from '@/nodes/CalloutNode'
import type { CodeBlockNodeDataset } from '@/nodes/CodeBlockNode'
import type { FileNodeDataset } from '@/nodes/FileNode'
import type { GalleryNodeDataset } from '@/nodes/GalleryNode'
import type { HeaderNodeDataset } from '@/nodes/HeaderNode'
import type { HtmlNodeDataset } from '@/nodes/HtmlNode'
import type { ImageNodeDataset } from '@/nodes/ImageNode'
import type { ToggleNodeDataset } from '@/nodes/ToggleNode'
import type { VideoNodeDataset } from '@/nodes/VideoNode'
import type { SnippetDataset } from '@/plugins/behaviour/snippet-insertion'

/**
 * The card insert commands — one React-free home every card declaration can
 * reference (the dataset types above are type-only, so nothing here pulls in
 * the wrapper layer). Re-exported from the wrapper node modules, which are
 * the public import paths (`@/index` reaches them there). Declarations name
 * these on their insert spec and menu entries, so no registry resolves a
 * command from menu entry order. `INSERT_CODE_BLOCK_COMMAND` lives here even
 * though CodeBlock has no menu entry (it is inserted by its markdown code
 * fence), so all card commands share one home.
 * `OPEN_GIF_SELECTOR_COMMAND` is likewise kept here for the Image card's GIF
 * menu entry; `@/plugins/InklingSelectorPlugin` re-exports it.
 * `INSERT_SNIPPET_COMMAND` shares the home: the snippet menu entry built by
 * `@/utils/buildCardMenu` dispatches it through the same type-erased menu
 * insert path, while `@/plugins/InklingSnippetPlugin` keeps only the
 * registration and `@/plugins/behaviour/snippet-insertion` owns the
 * `SnippetDataset` payload type and the insertion surgery.
 */
export const INSERT_AUDIO_COMMAND = createCommand<AudioNodeDataset>()
export const INSERT_BOOKMARK_COMMAND = createCommand<BookmarkNodeDataset>()
export const INSERT_BUTTON_COMMAND = createCommand<ButtonNodeDataset>('INSERT_BUTTON_COMMAND')
export const INSERT_CALLOUT_COMMAND = createCommand<CalloutNodeDataset>()
export const INSERT_CODE_BLOCK_COMMAND = createCommand<CodeBlockNodeDataset>()
export const INSERT_FILE_COMMAND = createCommand<FileNodeDataset>()
export const INSERT_GALLERY_COMMAND = createCommand<GalleryNodeDataset>()
export const INSERT_HEADER_COMMAND = createCommand<HeaderNodeDataset>()
export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand<void>()
export const INSERT_HTML_COMMAND = createCommand<HtmlNodeDataset>()
export const INSERT_IMAGE_COMMAND = createCommand<ImageNodeDataset>()
export const INSERT_SNIPPET_COMMAND = createCommand<SnippetDataset>('INSERT_SNIPPET_COMMAND')
export const INSERT_TOGGLE_COMMAND = createCommand<ToggleNodeDataset>('INSERT_TOGGLE_COMMAND')
export const INSERT_VIDEO_COMMAND = createCommand<VideoNodeDataset>()
export const OPEN_GIF_SELECTOR_COMMAND = createCommand<ImageNodeDataset>()
