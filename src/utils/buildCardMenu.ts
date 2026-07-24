import type { CardConfig, SnippetItem } from '@/context/InklingHostIntegrationContext'
import type { CardMenuNodeClass } from '@/utils/inkling-node-class'

import SnippetCardIcon from '@/assets/icons/inkling-card-type-snippet.svg?react'
import { INSERT_SNIPPET_COMMAND } from '@/nodes/cards/card-commands'

interface MenuItemBase {
  nodeType?: string
  label: string
  desc?: string
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  insertCommand?: unknown
  matches?: ((query: string, label: string) => boolean) | string[]
  priority?: number
  shortcut?: string
  isHidden?: (args: { config: CardConfig | undefined }) => boolean
  section?: string
  type?: string
  onRemove?: () => void
  queryParams?: string[]
  dataTestId?: string
  name?: string
  icon?: string
  customContent?: React.ReactNode
  hidden?: boolean
  disabled?: boolean
}

export interface MenuItem extends MenuItemBase {
  insertParams?: Record<string, unknown> | (() => Record<string, unknown>)
}

/** A `MenuItem` after `buildCardMenu` has resolved function-valued `insertParams`
 * against the host config — consumers always see plain data. */
export interface ResolvedMenuItem extends MenuItemBase {
  insertParams?: Record<string, unknown>
}

export interface BuildCardMenuConfig {
  config?: CardConfig
}

/** One ordered menu section — the menu's primary view: CardMenu renders
 * sections directly, and `BuildCardMenuResult.items` is derived from them. */
export interface MenuSection {
  label: string
  items: ResolvedMenuItem[]
}

export interface BuildCardMenuResult {
  /** Sections in render order (Primary first), each sorted by priority. */
  sections: MenuSection[]
  /** Every resolved item in render order — `items[i]` is exactly what CardMenu
   * renders with `data-inkling-cardmenu-idx="i"`, so keyboard selection reads
   * the list instead of scraping the DOM. Derived from the final sorted
   * `sections` and sharing item identity with them, so the two views can't
   * drift. */
  items: ResolvedMenuItem[]
  maxItemIndex: number
}

export function buildCardMenu(
  nodes: Map<string, CardMenuNodeClass> | Iterable<[string, CardMenuNodeClass]>,
  { query, config }: { query?: string; config?: CardConfig } = {},
): BuildCardMenuResult {
  let menu = new Map<string, ResolvedMenuItem[]>()

  const lowerQuery = query?.toLowerCase()

  function addMenuItem(item: MenuItem): void {
    // items hidden based on missing config (e.g. GIF provider API key)
    if (item.isHidden?.({ config })) {
      return
    }

    const matches =
      typeof item.matches === 'function'
        ? item.matches(lowerQuery ?? '', item.label)
        : item.matches?.find((match) => match.startsWith(lowerQuery ?? ''))

    if (lowerQuery && !matches) {
      return
    }

    // resolve function-valued insertParams against the host config (e.g.
    // Header's version stamp) so the menu always carries plain data
    const resolvedItem: ResolvedMenuItem = {
      ...item,
      insertParams: typeof item.insertParams === 'function' ? item.insertParams() : item.insertParams,
    }
    if (resolvedItem.insertParams === undefined) {
      // the spread above always writes the key; the pre-resolution shape only
      // carries insertParams when the declaration set it (item deep-equality
      // in test/unit/buildCardMenu.test.ts pins key absence)
      delete resolvedItem.insertParams
    }

    const section = resolvedItem.section || 'Primary'

    if (!menu.has(section)) {
      menu.set(section, [resolvedItem])
    } else {
      menu.get(section)?.push(resolvedItem)
    }
  }

  for (const [nodeType, nodeClass] of nodes) {
    // The card declarations normalize menus to arrays; a bare object is still
    // tolerated as a single entry — the shape is part of the public
    // buildCardMenu contract (pinned by test/unit/buildCardMenu.test.ts).
    const cardMenuItems = Array.isArray(nodeClass.cardMenu) ? nodeClass.cardMenu : [nodeClass.cardMenu]
    cardMenuItems.forEach((item) => addMenuItem({ nodeType, ...item }))
  }

  config?.snippets?.forEach((item) => {
    const snippetMenuItem = buildSnippetMenuItem(item, config)
    addMenuItem(snippetMenuItem)
  })

  // sort each menu section by priority
  menu = new Map(
    [...menu.entries()].map(([section, items]) => {
      return [
        section,
        items.sort((a, b) => {
          if (a.priority === b.priority) {
            return 0
          } else if (a.priority === undefined) {
            return 1
          } else if (b.priority === undefined) {
            return -1
          } else {
            return a.priority - b.priority
          }
        }),
      ]
    }),
  )

  // sort primary section to always display first
  menu = new Map(
    [...menu.entries()].sort((a, b) => {
      if (a[0] === 'Primary') {
        return -1
      } else {
        return 1
      }
    }),
  )

  const sections: MenuSection[] = [...menu.entries()].map(([label, sectionItems]) => ({ label, items: sectionItems }))
  const items = sections.flatMap((section) => section.items)

  return { sections, items, maxItemIndex: items.length - 1 }
}

function buildSnippetMenuItem(data: SnippetItem, config: CardConfig | undefined): MenuItem {
  const name = data.name.toLowerCase()
  const snippet: MenuItem = {
    type: 'snippet',
    label: data.name,
    Icon: SnippetCardIcon,
    section: 'Snippets',
    matches: (query: string) => name.indexOf(query) > -1 || 'snippets'.indexOf(query) > -1,
    insertCommand: INSERT_SNIPPET_COMMAND,
    insertParams: { name: data.name, value: data.value },
    ...(config?.deleteSnippet && { onRemove: () => config.deleteSnippet?.(data) }),
  }

  return snippet
}
