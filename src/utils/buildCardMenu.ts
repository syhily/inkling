import type { CardConfig } from '@/context/InklingHostIntegrationContext'
import type { CardMenuNodeClass } from '@/utils/inkling-node-class'

import SnippetCardIcon from '@/assets/icons/inkling-card-type-snippet.svg?react'
import { INSERT_SNIPPET_COMMAND } from '@/plugins/InklingSnippetPlugin'

export interface MenuItem {
  nodeType?: string
  label: string
  desc?: string
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  insertCommand?: unknown
  insertParams?: unknown
  matches?: ((query: string, label: string) => boolean) | string[]
  priority?: number
  shortcut?: string
  isHidden?: (args: { config: CardConfig | undefined }) => boolean
  postType?: string
  section?: string
  type?: string
  onRemove?: () => void
  [key: string]: unknown
}

export interface BuildCardMenuConfig {
  config?: CardConfig
}

export interface BuildCardMenuResult {
  menu: Map<string, MenuItem[]>
  maxItemIndex: number
}

export function buildCardMenu(
  nodes: Map<string, CardMenuNodeClass> | Iterable<[string, CardMenuNodeClass]>,
  { query, config }: { query?: string; config?: CardConfig } = {},
): BuildCardMenuResult {
  let menu = new Map<string, MenuItem[]>()

  const lowerQuery = query?.toLowerCase()

  let maxItemIndex = -1

  function addMenuItem(item: MenuItem): void {
    // items hidden based on missing config (e.g. GIF provider API key)
    if (!!item.isHidden && item.isHidden?.({ config })) {
      return
    }

    // items restricted for posts vs. pages (e.g. email CTA card)
    const cfg = config as Record<string, unknown> | undefined
    const postDisplayName = (cfg?.post as { displayName?: string } | undefined)?.displayName
    if (item.postType && postDisplayName && item.postType !== postDisplayName) {
      return
    }

    const matches =
      typeof item?.matches === 'function'
        ? item?.matches?.(lowerQuery ?? '', item.label)
        : item?.matches?.find?.((m) => m.startsWith(lowerQuery ?? ''))

    if (lowerQuery && !matches) {
      return
    }

    if (typeof item.insertParams === 'function') {
      ;(item as Record<string, unknown>).insertParams = (
        item.insertParams as (args: { config: CardConfig | undefined }) => unknown
      )({ config })
    }

    const section = item.section || 'Primary'

    if (!menu.has(section)) {
      menu.set(section, [item])
    } else {
      menu.get(section)?.push(item)
    }

    maxItemIndex = maxItemIndex + 1
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
            return (a.priority ?? 0) - (b.priority ?? 0)
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

  return { menu, maxItemIndex }
}

interface SnippetData {
  name: string
  value?: string
}

function buildSnippetMenuItem(data: SnippetData, config: CardConfig | undefined): MenuItem {
  const name = data.name.toLowerCase()
  const snippet: MenuItem = {
    type: 'snippet',
    label: data.name,
    Icon: SnippetCardIcon,
    section: 'Snippets',
    matches: (query: string) => name.indexOf(query) > -1 || 'snippets'.indexOf(query) > -1,
    insertCommand: INSERT_SNIPPET_COMMAND,
    insertParams: data,
    ...(config?.deleteSnippet && { onRemove: () => config.deleteSnippet?.(data as { name: string; value: string }) }),
  }

  return snippet
}
