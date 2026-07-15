import type { Transformer } from '@lexical/markdown'

import { describe, expect, it } from 'vitest'

// Import the public barrel first: it is the package/demo entry point, so the
// module graph evaluates in the same order as in the app. Defensive: registry
// modules imported before it could observe wrapper classes mid-cycle as
// `undefined` if a wrapper→barrel edge is ever reintroduced.
import '@/index'
import { DEFAULT_HTML_NODES } from '@/html/default-html-nodes'
import { CARD_TRANSFORMERS, MARKDOWN_NODES } from '@/markdown/round-trip'
import { DEFAULT_NODES as BASE_DEFAULT_NODES } from '@/nodes/base'
import DEFAULT_NODES from '@/nodes/DefaultNodes'
import EMAIL_EDITOR_NODES from '@/nodes/EmailEditorNodes'
import EMAIL_NODES from '@/nodes/EmailNodes'

interface NodeClassLike {
  getType: () => string
}

interface NodeReplacementLike {
  replace: NodeClassLike
}

// Node-set entries are either node classes or Lexical replacement descriptors
// ({ replace, with }). Pin both, marking replacements so the two forms can
// never be confused for each other.
function nodeSetSnapshot(nodes: readonly unknown[]): string[] {
  return nodes.map((entry) => {
    if (typeof entry === 'function') {
      return (entry as NodeClassLike).getType()
    }
    if (entry && typeof entry === 'object' && 'replace' in entry) {
      return `replace:${(entry as NodeReplacementLike).replace.getType()}`
    }
    return 'undefined'
  })
}

// A card transformer is pinned by the node types it depends on (exactly one
// card node class per transformer today).
function transformerSnapshot(transformers: readonly Transformer[]): string[] {
  return transformers.map((transformer) => transformer.dependencies.map((nodeClass) => nodeClass.getType()).join(','))
}

// Plan 039 node-set diff guard. These literals capture the pre-refactor
// registries (commit 1cad78b lineage, evaluated in `@/index`-first order) and
// are the acceptance gate for Batches 1-5: every registry becomes a derived
// view over the card declarations, and each derived array must stay identical
// to its literal — order included. NEVER edit these to match drift; fix the
// derivation instead.
describe('derived node sets match the pre-refactor registries', () => {
  it('@/nodes/DefaultNodes (web editor node set)', () => {
    expect(nodeSetSnapshot(DEFAULT_NODES)).toEqual([
      'extended-text',
      'replace:text',
      'heading',
      'extended-heading',
      'replace:heading',
      'quote',
      'extended-quote',
      'replace:quote',
      'list',
      'listitem',
      'aside',
      'link',
      'codeblock',
      'horizontalrule',
      'image',
      'audio',
      'video',
      'callout',
      'html',
      'file',
      'button',
      'toggle',
      'header',
      'bookmark',
      'gallery',
      'tk',
      'at-link',
      'at-link-search',
      'zwnj',
    ])
  })

  it('@/nodes/base DEFAULT_NODES (base node set)', () => {
    expect(nodeSetSnapshot(BASE_DEFAULT_NODES)).toEqual([
      'extended-text',
      'replace:text',
      'extended-heading',
      'replace:heading',
      'extended-quote',
      'replace:quote',
      'codeblock',
      'image',
      'markdown',
      'video',
      'audio',
      'callout',
      'aside',
      'horizontalrule',
      'html',
      'file',
      'toggle',
      'button',
      'header',
      'bookmark',
      'gallery',
      'tk',
      'at-link',
      'at-link-search',
      'zwnj',
    ])
  })

  it('@/html/default-html-nodes DEFAULT_HTML_NODES', () => {
    expect(nodeSetSnapshot(DEFAULT_HTML_NODES)).toEqual([
      'heading',
      'link',
      'listitem',
      'list',
      'quote',
      'extended-text',
      'replace:text',
      'extended-heading',
      'replace:heading',
      'extended-quote',
      'replace:quote',
      'codeblock',
      'image',
      'markdown',
      'video',
      'audio',
      'callout',
      'aside',
      'horizontalrule',
      'html',
      'file',
      'toggle',
      'button',
      'header',
      'bookmark',
      'gallery',
      'tk',
      'at-link',
      'at-link-search',
      'zwnj',
    ])
  })

  it('@/nodes/EmailNodes (email renderer node set)', () => {
    expect(nodeSetSnapshot(EMAIL_NODES)).toEqual([
      'extended-text',
      'replace:text',
      'heading',
      'extended-heading',
      'replace:heading',
      'quote',
      'list',
      'listitem',
      'link',
      'horizontalrule',
    ])
  })

  it('@/nodes/EmailEditorNodes (email editor node set)', () => {
    expect(nodeSetSnapshot(EMAIL_EDITOR_NODES)).toEqual([
      'extended-text',
      'replace:text',
      'heading',
      'extended-heading',
      'replace:heading',
      'quote',
      'extended-quote',
      'replace:quote',
      'list',
      'listitem',
      'aside',
      'link',
      'horizontalrule',
      'image',
      'callout',
      'html',
      'button',
      'bookmark',
    ])
  })

  it('@/markdown/round-trip MARKDOWN_NODES', () => {
    expect(nodeSetSnapshot(MARKDOWN_NODES)).toEqual([
      'heading',
      'quote',
      'list',
      'listitem',
      'link',
      'codeblock',
      'horizontalrule',
      'image',
      'html',
      'file',
      'button',
      'audio',
      'video',
      'gallery',
      'bookmark',
      'toggle',
      'callout',
      'markdown',
    ])
  })

  it('@/markdown/round-trip CARD_TRANSFORMERS (by card node type)', () => {
    expect(transformerSnapshot(CARD_TRANSFORMERS)).toEqual([
      'image',
      'html',
      'file',
      'button',
      'audio',
      'video',
      'gallery',
      'bookmark',
      'toggle',
      'callout',
      'markdown',
    ])
  })
})
