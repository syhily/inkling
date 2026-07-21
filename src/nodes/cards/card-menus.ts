import type { CardIconId } from '@/nodes/cards/card-declaration'
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
import { CARD_DECLARATIONS } from '@/nodes/cards'

/**
 * The menu/drag icons the declarations name by `CardIconId`. This is the one
 * React-bearing attachment point for card menu data: every icon is an SVGR
 * component (`*.svg?react`), so the map cannot live in the React-free
 * declaration modules.
 */
const CARD_ICONS = {
  audio: AudioCardIcon,
  bookmark: BookmarkCardIcon,
  button: ButtonCardIcon,
  callout: CalloutCardIcon,
  codeblock: CodeBlockIcon,
  divider: DividerCardIcon,
  file: FileCardIcon,
  gallery: GalleryCardIcon,
  gif: GIFIcon,
  header: HeaderCardIcon,
  html: HtmlCardIcon,
  image: ImageCardIcon,
  toggle: ToggleIcon,
  video: VideoCardIcon,
} satisfies Record<CardIconId, NonNullable<MenuItem['Icon']>>

/**
 * Wrapper-layer derived view over the card declarations: each declaration's
 * React-free `menu` spec resolved to `MenuItem[]` — the `icon` id becomes the
 * SVGR component and the entry's named `command` becomes its `insertCommand`.
 * CodeBlock declares no menu and drops out here.
 */
const CARD_MENUS: Partial<Record<string, MenuItem[]>> = Object.fromEntries(
  CARD_DECLARATIONS.flatMap((declaration) => {
    // `in` narrows the union to the declarations carrying the optional menu entry
    const menu = 'menu' in declaration ? declaration.menu : undefined
    if (!menu) {
      return []
    }
    return [
      [
        declaration.nodeType,
        menu.map(({ icon, command, ...item }) => ({
          ...item,
          Icon: CARD_ICONS[icon],
          insertCommand: command,
        })),
      ],
    ]
  }),
)

/**
 * Resolves a card's slash/plus menu entries — what the hand-written
 * `CARD_MENUS` map keyed by node type used to hold, now derived from the
 * declarations. Consumed by `assembleCardNode` (the assembled class's static
 * `cardMenu`) and the surviving hand-written wrappers.
 */
export function getCardMenu(nodeType: string): MenuItem[] | undefined {
  return CARD_MENUS[nodeType]
}

/**
 * Resolves a card's drag-preview icon — what the thirteen `getIcon()` copies
 * returned. Menu-bearing cards use their first menu entry's icon (Image's
 * two-entry menu keeps the Image icon, not the GIF one); menu-less cards name
 * theirs explicitly as the declaration's `dragIcon` (CodeBlock is the only
 * one).
 */
export function getCardDragIcon(nodeType: string): MenuItem['Icon'] {
  const declaration = CARD_DECLARATIONS.find((entry) => entry.nodeType === nodeType)
  if (!declaration) {
    return undefined
  }
  const dragIcon = 'dragIcon' in declaration ? declaration.dragIcon : undefined
  const menuIcon = 'menu' in declaration ? declaration.menu?.[0]?.icon : undefined
  const icon = dragIcon ?? menuIcon
  return icon ? CARD_ICONS[icon] : undefined
}
