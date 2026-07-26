import type { LexicalEditor } from 'lexical'

import type { CardUploadType } from '@/nodes/cards/card-declaration'
import type { CardMenuSource, MenuItem } from '@/utils/buildCardMenu'

import { CARD_DECLARATIONS } from '@/nodes/cards'
import { getCardMenu } from '@/nodes/cards/card-menus'
import { getHostCards } from '@/nodes/cards/host-card-registry'
import { getRegisteredNodeMap } from '@/utils/lexical-internals'

/**
 * One registered card as declaration-backed data: the menu entries (resolved
 * through the same `getCardMenu` derived view the assembled class's static
 * `cardMenu` carries) and the upload-claiming key, keyed by node type.
 * Consumers take what they need — `buildCardMenu` skips menu-less entries
 * (CodeBlock), `DragDropPastePlugin` reads `uploadType`.
 */
export interface EditorCardNode extends CardMenuSource {
  /** the declaration's menu entries resolved through `getCardMenu` — always
   * normalized to an array; undefined for menu-less cards (CodeBlock) */
  cardMenu: MenuItem[] | undefined
  uploadType?: CardUploadType
}

/**
 * The editor's registered cards (CONTEXT.md: "card declaration"). The
 * declarations are the single per-card source of truth, so the only genuinely
 * editor-specific fact left is WHICH node types are registered — read as the
 * keys of the editor's registered-node map (the `lexical-internals`
 * accessor) and intersected with `CARD_DECLARATIONS`. This replaces the
 * historical recovery that walked the registered-node map and cast each
 * class's static side (`inkling-node-class`); the declaration's assembled
 * node class is deliberately not recovered here because importing the wrapper
 * registry would close an import cycle (wrapper layer → decorate tree →
 * `InklingComposableEditor` → `DragDropPastePlugin` → here).
 */
export function getEditorCardNodes(editor: LexicalEditor): [string, EditorCardNode][] {
  return getRegisteredCardNodes(new Set(getRegisteredNodeMap(editor).keys()))
}

/**
 * The pure core of `getEditorCardNodes`: the card declarations filtered to a
 * set of registered node types, preserving declaration order (which
 * reproduces the editor's card registration order — see `@/nodes/cards`),
 * with host cards (CONTEXT.md: "host card") following in their registration
 * order. Testable directly with a fake registered-type set, no editor mock
 * needed.
 */
export function getRegisteredCardNodes(registeredNodeTypes: ReadonlySet<string>): [string, EditorCardNode][] {
  const cardNodes: [string, EditorCardNode][] = []

  for (const declaration of CARD_DECLARATIONS) {
    if (!registeredNodeTypes.has(declaration.nodeType)) {
      continue
    }

    cardNodes.push([
      declaration.nodeType,
      {
        cardMenu: getCardMenu(declaration.nodeType),
        // `in` narrows the union to the declarations carrying the optional upload entry
        uploadType: 'uploadType' in declaration ? declaration.uploadType : undefined,
      },
    ])
  }

  // host cards carry their resolved menu entries and upload key on the
  // registry record — the same facts the declarations provide above
  for (const host of getHostCards()) {
    if (!registeredNodeTypes.has(host.nodeType)) {
      continue
    }

    cardNodes.push([host.nodeType, { cardMenu: host.cardMenu, uploadType: host.uploadType }])
  }

  return cardNodes
}
