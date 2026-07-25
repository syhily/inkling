import { $generateNodesFromSerializedNodes, $insertGeneratedNodes } from '@lexical/clipboard'
import { $getSelection, type LexicalEditor, type SerializedLexicalNode } from 'lexical'

import { $isInklingCard } from '@/nodes/base'
import { $ensureParagraphAfterCard } from '@/utils/$ensureParagraphAfterCard'

import { INSERT_CARD_COMMAND } from './commands'

// Snippet insertion — the headless module behind InklingSnippetPlugin. A
// snippet is a host-managed fragment of serialized editor state (the
// `{ name, value }` menu insertParams built by `@/utils/buildCardMenu`);
// inserting one parses the value, regenerates the nodes, and splices them at
// the selection. Two special cases live here: a single-card snippet goes
// through the card insert path (`INSERT_CARD_COMMAND`) so the card lands like
// any other card insert, and a snippet whose last node is a card gets a
// trailing paragraph so the caret has somewhere to go after it. The plugin
// keeps only the command registration.

/** The snippet insert payload — the `{ name, value }` pair the snippet menu
 * entry dispatches through the type-erased menu insert path
 * (`@/utils/buildCardMenu`). */
export interface SnippetDataset {
  name: string
  value: string
}

// Command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before parsing the snippet value.
export function isSnippetDataset(dataset: unknown): dataset is SnippetDataset {
  return (
    typeof dataset === 'object' &&
    dataset !== null &&
    'name' in dataset &&
    typeof dataset.name === 'string' &&
    'value' in dataset &&
    typeof dataset.value === 'string'
  )
}

// The snippet value is host-supplied data, so a malformed one no-ops silently
// instead of throwing inside the editor update.
function parseSnippetNodes(value: string): SerializedLexicalNode[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch (_e) {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as { nodes?: unknown }).nodes)) {
    return null
  }
  return (parsed as { nodes: SerializedLexicalNode[] }).nodes
}

/**
 * Inserts the snippet `dataset` at the current selection. A $-function: it
 * must run inside editor.update()/editor.read() — the INSERT_SNIPPET_COMMAND
 * handler already runs in the dispatch update, and headless callers wrap the
 * call themselves. Returns false — and leaves the editor untouched — when the
 * payload is not a snippet dataset, the value does not parse to a serialized
 * node list, or there is no selection to insert at.
 */
export function $insertSnippet(editor: LexicalEditor, dataset: unknown): boolean {
  if (!isSnippetDataset(dataset)) {
    return false
  }
  const serializedNodes = parseSnippetNodes(dataset.value)
  if (!serializedNodes) {
    return false
  }
  const nodes = $generateNodesFromSerializedNodes(serializedNodes)
  const firstNode = nodes.length === 1 && nodes[0]
  const lastNode = !!nodes.length && nodes[nodes.length - 1]

  if (firstNode && $isInklingCard(firstNode)) {
    editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode: firstNode })

    return true
  }

  const selection = $getSelection()
  if (!selection) {
    return false
  }
  $insertGeneratedNodes(editor, nodes, selection)

  if (lastNode && $isInklingCard(lastNode)) {
    $ensureParagraphAfterCard(lastNode)
  }
  return true
}
