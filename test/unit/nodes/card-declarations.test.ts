import { createCommand } from 'lexical'
import { describe, expect, it } from 'vitest'

import { DEFAULT_LABELS } from '@/labels/inkling-labels'
import { AudioNode } from '@/nodes/AudioNode'
import { generateDecoratorNode } from '@/nodes/base/generate-decorator-node'
import { BookmarkNode } from '@/nodes/BookmarkNode'
import { ButtonNode } from '@/nodes/ButtonNode'
import { CalloutNode } from '@/nodes/CalloutNode'
import { CARD_DECLARATIONS, type CardNodeType } from '@/nodes/cards'
import { CARD_DECORATE_TARGETS, getCardDecorateTarget } from '@/nodes/cards/card-decorate'
import { CARD_INSERT_COMMANDS, getCardInsertRegistrations } from '@/nodes/cards/card-insert-commands'
import { getCardDragIcon, getCardMenu } from '@/nodes/cards/card-menus'
import { getCardToolbarLabel } from '@/nodes/cards/card-toolbar-labels'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { defineCard } from '@/nodes/cards/host-cards'
import { CodeBlockNode } from '@/nodes/CodeBlockNode'
import { FileNode } from '@/nodes/FileNode'
import { FootnoteDefinitionNode } from '@/nodes/FootnoteDefinitionNode'
import { GalleryNode } from '@/nodes/GalleryNode'
import { HeaderNode } from '@/nodes/HeaderNode'
import { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import { HtmlNode } from '@/nodes/HtmlNode'
import { ImageNode } from '@/nodes/ImageNode'
import { MathNode } from '@/nodes/MathNode'
import { TABLE_MENU_SOURCE } from '@/nodes/table/table-menu'
import { ToggleNode } from '@/nodes/ToggleNode'
import { VideoNode } from '@/nodes/VideoNode'

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
        // CodeBlock is inserted by its code fence; the footnote definition is
        // created/ordered by the footnote behaviour module — neither has a menu
        expect(['codeblock', 'footnotedefinition']).toContain(declaration.nodeType)
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

  it('resolves every menu entry labelKey against the labels table (C7)', () => {
    // the declaration carries the English default; the labels table carries
    // the same text as the overridable default — a labelKey without a table
    // entry (or a stale table entry) fails here, not at render time
    for (const declaration of CARD_DECLARATIONS) {
      const menu = 'menu' in declaration ? declaration.menu : undefined
      for (const entry of menu ?? []) {
        expect(DEFAULT_LABELS[`menu.${entry.labelKey}.label` as keyof typeof DEFAULT_LABELS]).toBe(entry.label)
        if (entry.desc !== undefined) {
          expect(DEFAULT_LABELS[`menu.${entry.labelKey}.desc` as keyof typeof DEFAULT_LABELS]).toBe(entry.desc)
        }
      }
    }
    // the table pseudo-source is not a declaration but resolves the same way
    const tableMenu = TABLE_MENU_SOURCE[1].cardMenu
    const tableEntry = Array.isArray(tableMenu) ? tableMenu[0] : tableMenu
    expect(DEFAULT_LABELS[`menu.${tableEntry?.labelKey}.label` as keyof typeof DEFAULT_LABELS]).toBe(tableEntry?.label)
    expect(DEFAULT_LABELS[`menu.${tableEntry?.labelKey}.desc` as keyof typeof DEFAULT_LABELS]).toBe(tableEntry?.desc)
  })

  it('resolves a drag icon for every draggable card', () => {
    for (const declaration of CARD_DECLARATIONS) {
      // the footnote definition is menu-less and names no dragIcon — it lives
      // in the doc-end run and the run-invariant transform re-parks it anyway
      if (declaration.nodeType === 'footnotedefinition') {
        expect(getCardDragIcon(declaration.nodeType)).toBeUndefined()
        continue
      }
      expect(typeof getCardDragIcon(declaration.nodeType)).toBe('function')
    }
  })

  it('registers the same assembled class each shim exports', () => {
    // one class object per card: every shim re-exports the memoized
    // `assembleCardNodeOnce` product, so the registry entries and the
    // shim-exported classes are identical and importDOM/clone identity is
    // coherent across every consumer
    const SHIM_CLASSES = {
      audio: AudioNode,
      bookmark: BookmarkNode,
      button: ButtonNode,
      callout: CalloutNode,
      codeblock: CodeBlockNode,
      file: FileNode,
      footnotedefinition: FootnoteDefinitionNode,
      gallery: GalleryNode,
      header: HeaderNode,
      horizontalrule: HorizontalRuleNode,
      html: HtmlNode,
      image: ImageNode,
      math: MathNode,
      toggle: ToggleNode,
      video: VideoNode,
    } satisfies Record<CardNodeType, unknown>
    for (const card of CARD_WRAPPER_NODES) {
      expect(card.node).toBe(SHIM_CLASSES[card.nodeType])
    }
  })
})

// Regression: with a host card registered (CONTEXT.md: "host card"), every
// built-in derived view keeps answering from the built-in declarations — the
// host registry is a fallback, never an override.
describe('built-in derived views with a host card present', () => {
  const REGRESSION_PROBE_COMMAND = createCommand('REGRESSION_PROBE_COMMAND')

  defineCard({
    nodeType: 'regressionProbe',
    baseNode: generateDecoratorNode({ nodeType: 'regressionProbe' }),
    menu: [{ label: 'Probe', labelKey: 'probe', icon: 'audio', command: REGRESSION_PROBE_COMMAND, matches: ['probe'] }],
    toolbarLabel: 'regression-probe',
    render: () => null,
  })

  it('keeps the built-in registry projections untouched', () => {
    expect(CARD_WRAPPER_NODES.map((card) => card.nodeType)).toEqual(CARD_DECLARATIONS.map((card) => card.nodeType))
    expect(CARD_DECORATE_TARGETS.map((target) => target.nodeType)).toEqual(
      CARD_DECLARATIONS.map((card) => card.nodeType),
    )
    expect(CARD_INSERT_COMMANDS.map((registration) => registration.nodeType).sort()).toEqual(
      CARD_DECLARATIONS.filter((card) => 'insert' in card && card.insert !== undefined)
        .map((card) => card.nodeType)
        .sort(),
    )
  })

  it('keeps resolving built-in facts from the declarations', () => {
    expect(getCardMenu('audio')?.[0]?.label).toBe('Audio')
    expect(typeof getCardDragIcon('audio')).toBe('function')
    expect(getCardDecorateTarget('audio')?.nodeType).toBe('audio')
    expect(getCardToolbarLabel('audio')).toBe('audio')
    // the host card's facts land only in the opened fallback views
    expect(getCardMenu('regressionProbe')?.[0]?.label).toBe('Probe')
    expect(getCardToolbarLabel('regressionProbe')).toBe('regression-probe')
    expect(getCardInsertRegistrations().some((registration) => registration.nodeType === 'audio')).toBe(true)
  })
})
