// Card shortcuts — one seam owning the trigger regexes and the
// replace-and-select bodies for the typing shortcuts that turn a paragraph
// into a card. The call sites keep only their trigger:
//
// - **Code fence** (```lang): fired by THREE triggers — the enter key and the
//   tab key (`@/plugins/behaviour/keyboard-navigation`), and the markdown
//   shortcut/import `CODE_BLOCK` transformer (`@/markdown/transformers`).
// - **Horizontal rule** (---): fired by TWO triggers — the markdown
//   shortcut/import `HR` transformer (`@/markdown/transformers`) and the
//   per-update scan in `@/plugins/HorizontalRulePlugin`.
//
// The fence trigger regexes differ ON PURPOSE and are not flattened: the
// transformer regex ends in `\s` so it fires on the space keystroke while
// typing (and never claims a bare fence on import), while the keyboard regex
// lets enter/tab fire on the key regardless of trailing space. The keyboard
// regex is also not end-anchored, so its `(\w{1,10})` group caps nothing — a
// fence line whose language exceeds 10 word chars still transforms on
// enter/tab (pinned in test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts).
//
// Language extraction differs per trigger too and stays at the call site:
// enter/tab take the FULL rest of the line (`textContent.replace(/^```/, '')`
// — 'js extra' and all), the transformer takes the regex's `match[1]`
// capture. The replace-and-select body below is shared by all three fence
// triggers: `replace` and `insertAfter` + `remove` were pinned net-identical
// for this rewrite (same position, paragraph children dropped either way,
// same NodeSelection), so one body serves every trigger.
//
// The divider regex is single-sourced — both HR triggers already tested the
// paragraph's full text against the byte-identical expression. The HR
// replace bodies stay TWO named per-trigger variants because the step-1 pins
// showed observable divergence: at the document end the markdown trigger
// KEEPS the emptied paragraph after the rule, while the per-update scan
// creates a FRESH paragraph (different node identity, pinned in
// test/unit/plugins/HorizontalRulePlugin.test.tsx), and only the markdown
// trigger has an isImport branch (import replaces the paragraph outright).
// Converging them would move a pinned behavior, so each variant names its
// trigger.

import type { ElementNode } from 'lexical'

import { $createNodeSelection, $createParagraphNode, $setSelection } from 'lexical'

import { $createCodeBlockNode } from '@/nodes/CodeBlockNode'
import { $createHorizontalRuleNode } from '@/nodes/HorizontalRuleNode'

/** enter/tab trigger: fires on the key regardless of trailing space. NOT
 * end-anchored, so the `(\w{1,10})` group does not cap the language length
 * on this trigger (see module comment). */
export const FENCE_KEYBOARD_REGEXP = /^```(\w{1,10})?/

/** markdown transformer trigger: the trailing `\s` makes the fence fire on
 * the space keystroke after ```lang while typing — and keeps markdown import
 * from claiming bare fences. */
export const FENCE_TRANSFORMER_REGEXP = /^```(\w{1,10})?\s/

/**
 * Replace the fence paragraph with a code block card and put a NodeSelection
 * on it so the card immediately renders in edit mode. Shared by the enter,
 * tab, and markdown-transformer triggers.
 */
export function $insertCodeBlockForShortcut(topLevelElement: ElementNode, language: string | undefined): void {
  const replacementNode = topLevelElement.replace($createCodeBlockNode({ language, _openInEditMode: true }))

  // select node when replacing so it immediately renders in editing mode
  const replacementSelection = $createNodeSelection()
  replacementSelection.add(replacementNode.getKey())
  $setSelection(replacementSelection)
}

/** divider trigger, single-sourced: both the markdown transformer and the
 * HorizontalRulePlugin per-update scan test the paragraph's full text
 * against this expression. */
export const DIVIDER_REGEXP = /^(---|\*\*\*|___)\s?$/

/**
 * markdown transformer trigger (typing + import). On import, or when a next
 * sibling exists, the paragraph is replaced outright; at the document end on
 * a typing keystroke the (framework-emptied) paragraph is KEPT after the
 * rule. Branch structure preserved exactly, including the isImport flag.
 */
export function $insertHorizontalRuleForMarkdownTrigger(parentNode: ElementNode, isImport: boolean): void {
  const line = $createHorizontalRuleNode()

  // TODO: Get rid of isImport flag
  if (isImport || parentNode.getNextSibling() !== null) {
    parentNode.replace(line)
  } else {
    parentNode.insertBefore(line)
  }

  line.selectNext()
}

/**
 * per-update scan trigger (HorizontalRulePlugin). Same sibling branch as the
 * markdown trigger, but at the document end it creates a FRESH paragraph
 * after the rule (the emptied one is discarded) — the observable divergence
 * that keeps these bodies per-trigger.
 */
export function $insertHorizontalRuleForUpdateScanTrigger(parentNode: ElementNode): void {
  const line = $createHorizontalRuleNode()

  if (parentNode.getNextSibling()) {
    parentNode.replace(line)
  } else {
    parentNode.insertBefore(line)
    parentNode.replace($createParagraphNode())
  }

  line.selectNext()
}
