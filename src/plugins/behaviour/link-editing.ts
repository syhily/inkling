import { $isLinkNode, TOGGLE_LINK_COMMAND, type LinkNode } from '@lexical/link'
import {
  $createRangeSelection,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type LexicalEditor,
} from 'lexical'

import { createComposerHandle, type ComposerHandle } from '@/plugins/behaviour/composer-handle'
import { getSelectedNode } from '@/utils/getSelectedNode'

// Link-editing flow — the headless module owning the link apply/read surgery
// and the floating-toolbar session, so the plugin and the toolbar components
// are render/event adapters over it. $applyLinkToSelection is the single
// implementation of apply-link-then-collapse-selection (previously copy-pasted
// across FloatingFormatToolbar, LinkActionToolbarWithSearch, and — a variant —
// FloatingLinkToolbar). The toolbar session is the state machine behind the
// plugin's threaded toolbarItemType/href props: hidden | text | link |
// snippet, built on the composer-handle factory rather than a copied store.
//
// The $-functions must run inside editor.read()/editor.update().

/**
 * Applies `url` to the current selection (empty removes the link), then
 * collapses the selection to the end of the focus node so the format toolbar
 * does not pop back up over the freshly linked text.
 */
export function $applyLinkToSelection(editor: LexicalEditor, url: string): void {
  editor.dispatchCommand(TOGGLE_LINK_COMMAND, url || null)

  const selection = $getSelection()
  if (!$isRangeSelection(selection)) {
    return
  }
  const focusNode = selection.focus.getNode()
  if (!$isTextNode(focusNode)) {
    return
  }
  const collapsed = $createRangeSelection()
  collapsed.setTextNodeRange(focusNode, focusNode.getTextContentSize(), focusNode, focusNode.getTextContentSize())
  $setSelection(collapsed)
}

/** The href of the link at the selection — the selected node or its parent — or '' when not on a link. */
export function $getLinkHrefAtSelection(): string {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) {
    return ''
  }
  const anchorNode = getSelectedNode(selection)
  const parent = anchorNode.getParent()
  if ($isLinkNode(parent)) {
    return parent.getURL()
  }
  if ($isLinkNode(anchorNode)) {
    return anchorNode.getURL()
  }
  return ''
}

/**
 * Selects the link's full text so a subsequent edit applies to the whole link.
 * (createRectsFromDOMRange misbehaves on a bare link-node selection, so the
 * range spans the link's text children instead.) Returns false when the link
 * has no text children to select.
 */
export function $selectLinkText(linkNode: LinkNode): boolean {
  const firstChild = linkNode.getFirstChild()
  const lastChild = linkNode.getLastChild()
  if (!firstChild || !lastChild || !$isTextNode(firstChild) || !$isTextNode(lastChild)) {
    return false
  }
  const selection = $createRangeSelection()
  selection.setTextNodeRange(firstChild, 0, lastChild, lastChild.getTextContentSize())
  $setSelection(selection)
  return true
}

export type ToolbarSessionType = 'hidden' | 'text' | 'link' | 'snippet'

export interface ToolbarSessionState {
  type: ToolbarSessionType
  href: string
}

export interface ToolbarSelectionSnapshot {
  /** True for a valid in-editor range selection over non-empty text. */
  textSelected: boolean
  href: string
}

/**
 * The floating-toolbar session state machine. States: hidden | text | link |
 * snippet. Transition policy:
 * - selection sync only acts while hidden/text — a link or snippet toolbar
 *   stays open across selection changes (its input steals the selection) and
 *   closes only through close() or an explicit open.
 * - a lost/invalid selection (syncSelection(null)) hides the text toolbar.
 * - explicit opens (cmd-K, format-toolbar buttons, edit-link) work from any state.
 * The handle is exposed for the React adapter's useSyncExternalStore binding;
 * non-React drivers (command handlers, DOM listeners) go through the methods.
 */
export function createToolbarSession(
  handle: ComposerHandle<ToolbarSessionState> = createComposerHandle<ToolbarSessionState>({ type: 'hidden', href: '' }),
) {
  return {
    handle,

    syncSelection(snapshot: ToolbarSelectionSnapshot | null) {
      const { type } = handle.getState()
      if (type === 'link' || type === 'snippet') {
        return
      }
      if (!snapshot) {
        handle.setState({ type: 'hidden' })
        return
      }
      handle.setState(
        snapshot.textSelected ? { type: 'text', href: snapshot.href } : { type: 'hidden', href: snapshot.href },
      )
    },

    openLink(href?: string) {
      handle.setState(href === undefined ? { type: 'link' } : { type: 'link', href })
    },

    openSnippet() {
      handle.setState({ type: 'snippet' })
    },

    close() {
      handle.setState({ type: 'hidden' })
    },
  }
}

export type ToolbarSession = ReturnType<typeof createToolbarSession>
