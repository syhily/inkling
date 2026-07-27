import type { LexicalEditor, LexicalNode } from 'lexical'
import type { ComponentType, SVGProps } from 'react'

import { createHeadlessEditor } from '@lexical/headless'
import { renderHook } from '@testing-library/react'
import { $createParagraphNode, $getRoot, createCommand, DecoratorNode } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockComposerContext } from '#/utils/composer-context'
import { generateDecoratorNode } from '@/nodes/base/generate-decorator-node'
import { $isInklingCard, InklingDecoratorNode } from '@/nodes/base/InklingDecoratorNode'
import { getCardDecorateTarget } from '@/nodes/cards/card-decorate'
import { getCardToolbarLabel } from '@/nodes/cards/card-facts'
import { getCardInsertRegistrations } from '@/nodes/cards/card-insert-commands'
import { getCardDragIcon, getCardMenu, resolveCardIcon } from '@/nodes/cards/card-menus'
import { getHostCard, getHostCards } from '@/nodes/cards/host-card-registry'
import { defineCard } from '@/nodes/cards/host-cards'
import { createCardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'
import { registerCardCommands } from '@/plugins/behaviour/registerCardCommands'
import { CardInsertPlugin } from '@/plugins/CardInsertPlugin'
import { getRegisteredCardNodes } from '@/utils/getEditorCardNodes'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

const INSERT_MUSIC_PLAYER_COMMAND = createCommand('INSERT_MUSIC_PLAYER_COMMAND')

const CustomMenuIcon: ComponentType<SVGProps<SVGSVGElement>> = () => null
const CustomDragIcon: ComponentType<SVGProps<SVGSVGElement>> = () => null
const CustomIndicatorIcon: ComponentType<SVGProps<SVGSVGElement>> = () => null

// The rich host card: menu (both icon paths), insert spec, decorate target
// with an indicator icon, explicit drag icon. Registered at module top level,
// mirroring the host idiom (defineCard before any composer mounts).
const musicPlayer = defineCard({
  nodeType: 'musicPlayer',
  baseNode: generateDecoratorNode({
    nodeType: 'musicPlayer',
    properties: [{ name: 'src', default: '' }] as const,
  }),
  decorateTarget: { hasIndicatorIcon: true },
  IndicatorIcon: CustomIndicatorIcon,
  insert: { command: INSERT_MUSIC_PLAYER_COMMAND },
  menu: [
    { label: 'Music', labelKey: 'music', icon: 'audio', command: INSERT_MUSIC_PLAYER_COMMAND, matches: ['music'] },
    {
      label: 'Music (legacy)',
      labelKey: 'musicLegacy',
      icon: CustomMenuIcon,
      command: INSERT_MUSIC_PLAYER_COMMAND,
      matches: ['music legacy'],
    },
  ],
  dragIcon: CustomDragIcon,
  toolbarLabel: 'music-player',
  render: () => null,
})

// The minimal host card: required fields only — no menu, insert, decorate
// target, or drag icon. `uploadType` reuses a media key (the only shape the
// closed upload-claiming seam allows a host card).
const hostWidget = defineCard({
  nodeType: 'hostWidget',
  baseNode: generateDecoratorNode({ nodeType: 'hostWidget' }),
  toolbarLabel: 'host-widget',
  uploadType: 'image',
  render: () => null,
})

describe('defineCard', () => {
  it('registers the card in the host registry, in registration order, with the raw spec stored verbatim', () => {
    expect(getHostCards().map((host) => host.nodeType)).toEqual(['musicPlayer', 'hostWidget'])
    // the registry is a neutral fact store: the raw spec, complete at
    // registration — the views derive every projection (including the
    // assembled class, see the insert-registration test below)
    expect(getHostCard('musicPlayer')?.spec.nodeType).toBe('musicPlayer')
    expect(getHostCard('musicPlayer')?.spec.toolbarLabel).toBe('music-player')
  })

  it('throws when the nodeType collides with a built-in card', () => {
    expect(() =>
      defineCard({
        nodeType: 'audio',
        baseNode: generateDecoratorNode({ nodeType: 'collidingBuiltin' }),
        toolbarLabel: 'audio-clone',
        render: () => null,
      }),
    ).toThrow(/already declared/)
  })

  it('throws when the nodeType collides with an already-registered host card', () => {
    expect(() =>
      defineCard({
        nodeType: 'musicPlayer',
        baseNode: generateDecoratorNode({ nodeType: 'collidingHost' }),
        toolbarLabel: 'music-clone',
        render: () => null,
      }),
    ).toThrow(/already declared/)
  })

  it('throws when the base node does not extend InklingDecoratorNode', () => {
    class NotACardNode extends DecoratorNode<null> {
      static getType() {
        return 'not-a-card'
      }

      static clone() {
        return new NotACardNode()
      }

      createDOM() {
        return document.createElement('div')
      }

      updateDOM() {
        return false
      }

      decorate() {
        return null
      }
    }

    expect(() =>
      defineCard({ nodeType: 'notACard', baseNode: NotACardNode, toolbarLabel: 'not-a-card', render: () => null }),
    ).toThrow(/InklingDecoratorNode/)
  })

  it('assembles a class whose instances pass $isInklingCard with no host-side ceremony', () => {
    const editor = createHeadlessEditor({ nodes: [musicPlayer.node], onError: () => {} })

    // node construction needs an active editor (the constructor assigns the key)
    editor.update(() => {
      const node = new musicPlayer.node({ src: 'https://example.com/song.mp3' })
      expect(node).toBeInstanceOf(InklingDecoratorNode)
      expect($isInklingCard(node)).toBe(true)
    })
  })

  it('resolves the card menu from the host registry', () => {
    expect(getCardMenu('musicPlayer')?.map((item) => item.label)).toEqual(
      getHostCard('musicPlayer')?.spec.menu?.map((item) => item.label),
    )
    expect(getCardMenu(hostWidget.nodeType)).toBeUndefined()
  })
})

describe('host cards in the derived views', () => {
  it('resolves menu entries through both icon paths and binds each entry command', () => {
    const menu = getCardMenu('musicPlayer')

    expect(menu?.map((item) => item.label)).toEqual(['Music', 'Music (legacy)'])
    // the id path resolves through the built-in icon table; a component passes through
    expect(menu?.[0]?.Icon).toBe(resolveCardIcon('audio'))
    expect(menu?.[1]?.Icon).toBe(CustomMenuIcon)
    // each resolved entry dispatches the command its spec entry names
    expect(menu?.map((item) => item.insertCommand)).toEqual([INSERT_MUSIC_PLAYER_COMMAND, INSERT_MUSIC_PLAYER_COMMAND])

    expect(getCardMenu('hostWidget')).toBeUndefined()
  })

  it('resolves the drag icon from the spec and falls back to the first menu icon', () => {
    expect(getCardDragIcon('musicPlayer')).toBe(CustomDragIcon)
    expect(getCardDragIcon('hostWidget')).toBeUndefined()
  })

  it('resolves the decorate target from the host registry, indicator icon gated by hasIndicatorIcon', () => {
    const target = getCardDecorateTarget('musicPlayer')
    expect(target?.nodeType).toBe('musicPlayer')
    expect(target?.decorateTarget).toEqual({ hasIndicatorIcon: true })
    expect(target?.IndicatorIcon).toBe(CustomIndicatorIcon)

    const minimal = getCardDecorateTarget('hostWidget')
    expect(minimal?.decorateTarget).toBeUndefined()
    expect(minimal?.IndicatorIcon).toBeUndefined()
  })

  it('projects host insert registrations after the built-in ones', () => {
    const registrations = getCardInsertRegistrations()
    const hostRegistration = registrations.find((registration) => registration.nodeType === 'musicPlayer')

    expect(hostRegistration?.node).toBe(musicPlayer.node)
    expect(hostRegistration?.command).toBe(INSERT_MUSIC_PLAYER_COMMAND)
    // the minimal card carries no insert spec and drops out
    expect(registrations.some((registration) => registration.nodeType === 'hostWidget')).toBe(false)
  })

  it('joins getRegisteredCardNodes behind the built-in declarations, with resolved menu and upload key', () => {
    const cardNodes = getRegisteredCardNodes(new Set(['musicPlayer', 'hostWidget', 'image']))

    expect(cardNodes.map(([nodeType]) => nodeType)).toEqual(['image', 'musicPlayer', 'hostWidget'])
    const cards = new Map(cardNodes)
    expect(cards.get('musicPlayer')?.cardMenu?.[0]?.label).toBe('Music')
    expect(cards.get('musicPlayer')?.uploadType).toBeUndefined()
    expect(cards.get('hostWidget')?.cardMenu).toBeUndefined()
    expect(cards.get('hostWidget')?.uploadType).toBe('image')
  })

  it('omits host cards whose node type is not registered', () => {
    expect(getRegisteredCardNodes(new Set()).map(([nodeType]) => nodeType)).toEqual([])
    expect(getRegisteredCardNodes(new Set(['image'])).map(([nodeType]) => nodeType)).toEqual(['image'])
  })

  it('falls back to the host record for the toolbar label', () => {
    expect(getCardToolbarLabel('musicPlayer')).toBe('music-player')
    expect(getCardToolbarLabel('hostWidget')).toBe('host-widget')
    // built-in labels resolve from the declarations first
    expect(getCardToolbarLabel('audio')).toBe('audio')
  })
})

describe('host card insert integration', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createHostEditor(nodes: Array<typeof musicPlayer.node>) {
    return createHeadlessEditor({ namespace: 'test', nodes, onError: () => {} })
  }

  async function mountRegistrar(target: LexicalEditor) {
    mockComposerContext(target)
    renderHook(() => CardInsertPlugin())
    // allow React effects to register commands
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }

  // Lexical 0.46 commits updates on a microtask — a macrotask wait drains the
  // queue so assertions see the settled state (same idiom as
  // test/unit/plugins/behaviour/at-link.test.ts).
  function flushUpdates() {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }

  it('dispatches the host insert command and lands the node in the document', async () => {
    editor = createHostEditor([musicPlayer.node])
    registerCardCommands(editor, { store: createCardSelectionStore() })
    await mountRegistrar(editor)

    editor.update(() => {
      const paragraph = $createParagraphNode()
      $getRoot().append(paragraph)
      paragraph.select()
    })
    await flushUpdates()

    expect(editor.dispatchCommand(INSERT_MUSIC_PLAYER_COMMAND, { src: 'https://example.com/song.mp3' })).toBe(true)
    await flushUpdates()

    editor.getEditorState().read(() => {
      const inserted = $getRoot()
        .getChildren()
        .find((child: LexicalNode) => child.getType() === 'musicPlayer')
      expect(inserted).toBeDefined()
      expect($isInklingCard(inserted)).toBe(true)
    })
  })

  it('does not register the host insert command on an editor without the host node', async () => {
    editor = createHostEditor([])
    await mountRegistrar(editor)

    expect(editor.dispatchCommand(INSERT_MUSIC_PLAYER_COMMAND, { src: 'https://example.com/song.mp3' })).toBe(false)
  })
})
