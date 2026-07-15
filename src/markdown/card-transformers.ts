import type { MultilineElementTransformer } from '@lexical/markdown'

import { $createMarkdownNode, $isMarkdownNode, MarkdownNode } from '@/nodes/base/nodes/markdown/MarkdownNode'

/**
 * Transition shim (plan 039, Batch 2): the card transformers moved to the
 * wrapper-layer projection `@/nodes/cards/card-markdown-transformers`; this
 * module re-exports them so existing importers keep working. MarkdownNode is
 * a base-only node, not a card — `MARKDOWN_CARD_TRANSFORMER` stays manual
 * here.
 */
export {
  AUDIO_CARD_TRANSFORMER,
  BOOKMARK_CARD_TRANSFORMER,
  BUTTON_CARD_TRANSFORMER,
  CALLOUT_CARD_TRANSFORMER,
  FILE_CARD_TRANSFORMER,
  GALLERY_CARD_TRANSFORMER,
  HTML_CARD_TRANSFORMER,
  IMAGE_CARD_TRANSFORMER,
  TOGGLE_CARD_TRANSFORMER,
  VIDEO_CARD_TRANSFORMER,
} from '@/nodes/cards/card-markdown-transformers'

export const MARKDOWN_CARD_TRANSFORMER: MultilineElementTransformer = {
  dependencies: [MarkdownNode],
  export: (node) => {
    if (!$isMarkdownNode(node)) {
      return null
    }
    return '```inkling:markdown\n' + node.markdown + '\n```'
  },
  regExpEnd: /^```\s*$/,
  regExpStart: /^```inkling:markdown\s*$/,
  replace: (rootNode, _children, _startMatch, _endMatch, linesInBetween, _isImport) => {
    // `linesInBetween` includes the (always empty) remainder of the opening
    // fence line and the (always empty) prefix of the closing fence line —
    // strip both, like the built-in CODE transformer does.
    const markdown = linesInBetween?.slice(1, -1).join('\n') ?? ''
    rootNode.append($createMarkdownNode({ markdown }))
  },
  type: 'multiline-element',
}
