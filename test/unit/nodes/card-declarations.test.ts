import { describe, expect, it } from 'vitest'

import { CARD_DECLARATIONS } from '@/nodes/cards'
import { CARD_DECORATE_TARGETS } from '@/nodes/cards/card-decorate'
import { CARD_INSERT_COMMANDS } from '@/nodes/cards/card-insert-commands'
import { getCardDragIcon, getCardMenu } from '@/nodes/cards/card-menus'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'

// The card declaration is the single per-card source of truth: these tests
// pin the declarations themselves and that every registry is derived from
// them, rather than pinning the derived wiring twice.
describe('card declarations as the single source of truth', () => {
  it('pairs every declaration with a wrapper node class', () => {
    expect(CARD_WRAPPER_NODES.map((card) => card.nodeType)).toEqual(CARD_DECLARATIONS.map((card) => card.nodeType))
    for (const card of CARD_WRAPPER_NODES) {
      expect(typeof card.node).toBe('function')
    }
  })

  it('pairs every declaration with a decorate render', () => {
    expect(CARD_DECORATE_TARGETS.map((target) => target.nodeType)).toEqual(
      CARD_DECLARATIONS.map((card) => card.nodeType),
    )
    for (const target of CARD_DECORATE_TARGETS) {
      expect(typeof target.render).toBe('function')
    }
  })

  it('names the insert command on the declaration insert spec', () => {
    const insertNodeTypes = CARD_DECLARATIONS.filter((card) => 'insert' in card && card.insert !== undefined).map(
      (card) => card.nodeType,
    )

    // every insert-bearing declaration's registration dispatches exactly the
    // command its spec names — menu entry order carries no command semantics
    expect(CARD_INSERT_COMMANDS.map((registration) => registration.nodeType).sort()).toEqual(insertNodeTypes.sort())
    for (const registration of CARD_INSERT_COMMANDS) {
      const declaration = CARD_DECLARATIONS.find((card) => card.nodeType === registration.nodeType)
      const insert = declaration && 'insert' in declaration ? declaration.insert : undefined
      expect(insert).toBeDefined()
      expect(registration.command).toBe(insert?.command)
    }
  })

  it('derives each card menu from the declaration menu spec', () => {
    for (const declaration of CARD_DECLARATIONS) {
      const menu = 'menu' in declaration ? declaration.menu : undefined
      const resolved = getCardMenu(declaration.nodeType)

      if (!menu) {
        // CodeBlock is the only menu-less card — inserted by its code fence
        expect(declaration.nodeType).toBe('codeblock')
        expect(resolved).toBeUndefined()
        continue
      }

      expect(resolved?.map((item) => item.label)).toEqual(menu.map((entry) => entry.label))
      // each resolved entry dispatches the command its spec entry names
      expect(resolved?.map((item) => item.insertCommand)).toEqual(menu.map((entry) => entry.command))
      // and the icon id resolved to a component
      for (const item of resolved ?? []) {
        expect(typeof item.Icon).toBe('function')
      }
    }
  })

  it('resolves a drag icon for every card', () => {
    for (const declaration of CARD_DECLARATIONS) {
      expect(typeof getCardDragIcon(declaration.nodeType)).toBe('function')
    }
  })

  it('flags exactly the surviving hand-written wrappers', () => {
    const handWritten = CARD_DECLARATIONS.filter((card) => 'handWrittenWrapper' in card && card.handWrittenWrapper).map(
      (card) => card.nodeType,
    )
    expect(handWritten).toEqual(['toggle', 'header', 'bookmark'])
  })
})
