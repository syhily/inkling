import { createCommand } from 'lexical'

import type { CardConfig } from '@/context/InklingComposerContext'
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
import type { MenuItem } from '@/utils/buildCardMenu'

import AudioCardIcon from '@/assets/icons/inkling-card-type-audio.svg?react'
import BookmarkCardIcon from '@/assets/icons/inkling-card-type-bookmark.svg?react'
import ButtonCardIcon from '@/assets/icons/inkling-card-type-button.svg?react'
import CalloutCardIcon from '@/assets/icons/inkling-card-type-callout.svg?react'
import DividerCardIcon from '@/assets/icons/inkling-card-type-divider.svg?react'
import FileCardIcon from '@/assets/icons/inkling-card-type-file.svg?react'
import GalleryCardIcon from '@/assets/icons/inkling-card-type-gallery.svg?react'
import CodeBlockIcon from '@/assets/icons/inkling-card-type-gen-embed.svg?react'
import GIFIcon from '@/assets/icons/inkling-card-type-gif.svg?react'
import HeaderCardIcon from '@/assets/icons/inkling-card-type-header.svg?react'
import HtmlCardIcon from '@/assets/icons/inkling-card-type-html.svg?react'
import ImageCardIcon from '@/assets/icons/inkling-card-type-image.svg?react'
import ToggleIcon from '@/assets/icons/inkling-card-type-toggle.svg?react'
import VideoCardIcon from '@/assets/icons/inkling-card-type-video.svg?react'

/**
 * The card insert commands. Defined here — next to the menus that reference
 * them — and re-exported from the wrapper node modules, so this projection
 * never imports the wrappers it feeds (that would close an import cycle at
 * module evaluation). `INSERT_CODE_BLOCK_COMMAND` lives here too even though
 * CodeBlock has no menu entry (it is inserted by its markdown code fence), so
 * all card commands share one home. `OPEN_GIF_SELECTOR_COMMAND` likewise moved
 * here from `@/plugins/InklingSelectorPlugin` (which re-exports it) for the
 * same reason: the plugin imports the Image wrapper.
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
export const INSERT_TOGGLE_COMMAND = createCommand<ToggleNodeDataset>('INSERT_TOGGLE_COMMAND')
export const INSERT_VIDEO_COMMAND = createCommand<VideoNodeDataset>()
export const OPEN_GIF_SELECTOR_COMMAND = createCommand<ImageNodeDataset>()

/**
 * Wrapper-layer projection of the card declarations: each card's slash/plus
 * menu entries (CONTEXT.md: "card declaration" names the card menu as part of
 * the declaration's knowledge). Kept out of the declaration modules because
 * every entry's `Icon` is a React component (`*.svg?react` SVGR imports) and
 * the declarations must stay React-free.
 *
 * The shape is normalized to arrays everywhere — HorizontalRule and Html
 * historically declared bare objects, tolerated by the branch in
 * `buildCardMenu` (plan 039 Batch 5 simplifies that branch away). CodeBlock
 * has no menu entry: it is inserted by its markdown code fence.
 */
export const CARD_MENUS = {
  audio: [
    {
      label: 'Audio',
      desc: 'Upload and play an audio file',
      Icon: AudioCardIcon,
      insertCommand: INSERT_AUDIO_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['audio'],
      priority: 14,
      shortcut: '/audio',
    },
  ],
  bookmark: [
    {
      label: 'Bookmark',
      desc: 'Embed a link as a visual bookmark',
      Icon: BookmarkCardIcon,
      insertCommand: INSERT_BOOKMARK_COMMAND,
      matches: ['bookmark'],
      queryParams: ['url'],
      priority: 4,
      shortcut: '/bookmark [url]',
    },
  ],
  button: [
    {
      label: 'Button',
      desc: 'Call-to-action button',
      Icon: ButtonCardIcon,
      insertCommand: INSERT_BUTTON_COMMAND,
      insertParams: {},
      matches: ['button', 'btn'],
      priority: 16,
      shortcut: '/button',
    },
  ],
  callout: [
    {
      label: 'Callout',
      desc: 'Info boxes that stand out',
      Icon: CalloutCardIcon,
      insertCommand: INSERT_CALLOUT_COMMAND,
      matches: ['callout'],
      priority: 9,
      shortcut: '/callout',
    },
  ],
  file: [
    {
      label: 'File',
      desc: 'Upload a downloadable file',
      Icon: FileCardIcon,
      insertCommand: INSERT_FILE_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['file'],
      priority: 15,
      shortcut: '/file',
    },
  ],
  gallery: [
    {
      label: 'Gallery',
      desc: 'Create an image gallery',
      Icon: GalleryCardIcon,
      insertCommand: INSERT_GALLERY_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['gallery'],
      priority: 5,
      shortcut: '/gallery',
    },
  ],
  header: [
    {
      label: 'Header',
      desc: 'Add a header',
      Icon: HeaderCardIcon,
      insertCommand: INSERT_HEADER_COMMAND,
      matches: ['header', 'heading'],
      priority: 11,
      insertParams: () => ({
        version: 2,
      }),
      shortcut: '/header',
    },
  ],
  horizontalrule: [
    {
      label: 'Divider',
      desc: 'Insert a dividing line',
      Icon: DividerCardIcon,
      insertCommand: INSERT_HORIZONTAL_RULE_COMMAND,
      matches: ['divider', 'horizontal-rule', 'hr'],
      priority: 2,
      shortcut: '/hr',
    },
  ],
  html: [
    {
      label: 'HTML',
      desc: 'Insert a HTML editor card',
      Icon: HtmlCardIcon,
      insertCommand: INSERT_HTML_COMMAND,
      matches: ['html'],
      priority: 18,
      shortcut: '/html',
    },
  ],
  image: [
    {
      label: 'Image',
      desc: 'Upload, or embed with /image [url]',
      Icon: ImageCardIcon,
      insertCommand: INSERT_IMAGE_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['image', 'img'],
      queryParams: ['src'],
      priority: 1,
      shortcut: '/image',
    },
    {
      label: 'GIF',
      desc: 'Search and embed gifs',
      Icon: GIFIcon,
      insertCommand: OPEN_GIF_SELECTOR_COMMAND,
      insertParams: {
        triggerFileDialog: false,
      },
      matches: ['gif', 'giphy', 'tenor', 'klipy'],
      priority: 17,
      queryParams: ['src'],
      isHidden: ({ config }: { config: CardConfig | undefined }) => !config?.tenor && !config?.klipy,
      shortcut: '/gif',
    },
  ],
  toggle: [
    {
      label: 'Toggle',
      desc: 'Collapsible content block',
      Icon: ToggleIcon,
      insertCommand: INSERT_TOGGLE_COMMAND,
      insertParams: {},
      matches: ['toggle', 'collapsible', 'accordion'],
      priority: 16,
      shortcut: '/toggle',
    },
  ],
  video: [
    {
      label: 'Video',
      desc: 'Upload and play a video file',
      Icon: VideoCardIcon,
      insertCommand: INSERT_VIDEO_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['video'],
      priority: 13,
      shortcut: '/video',
    },
  ],
} satisfies Record<string, MenuItem[]>

/**
 * Cards with no menu entry still had a `getIcon()` for the drag preview.
 * CodeBlock is the only such card; pin its drag icon explicitly.
 */
const DRAG_ICON_FALLBACKS: Record<string, NonNullable<MenuItem['Icon']>> = {
  codeblock: CodeBlockIcon,
}

/**
 * Resolves a card's drag-preview icon — what the thirteen `getIcon()` copies
 * returned. That was always the SVG already named in the card's menu, so the
 * icon now comes from the first `cardMenu` entry (Image's two-entry menu
 * keeps the Image icon, not the GIF one), falling back to the explicit map
 * for menu-less cards.
 */
export function getCardDragIcon(nodeType: string): MenuItem['Icon'] {
  return (CARD_MENUS as Record<string, MenuItem[]>)[nodeType]?.[0]?.Icon ?? DRAG_ICON_FALLBACKS[nodeType]
}
