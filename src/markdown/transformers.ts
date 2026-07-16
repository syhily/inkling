import type { ElementNode, LexicalNode } from 'lexical'

import {
  HEADING,
  ORDERED_LIST,
  QUOTE,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  UNORDERED_LIST,
  type Transformer,
} from '@lexical/markdown'

import {
  $insertCodeBlockForShortcut,
  $insertHorizontalRuleForMarkdownTrigger,
  DIVIDER_REGEXP,
  FENCE_TRANSFORMER_REGEXP,
} from '@/markdown/card-shortcuts'
import { $isCodeBlockNode, CodeBlockNode } from '@/nodes/CodeBlockNode'
import { $isHorizontalRuleNode, HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'

export const HR = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '---' : null
  },
  // trigger only: the regex and replace-and-select live in the card-shortcut
  // seam (@/markdown/card-shortcuts)
  regExp: DIVIDER_REGEXP,
  replace: (parentNode: ElementNode, _children: LexicalNode[], _match: string[], isImport: boolean) => {
    $insertHorizontalRuleForMarkdownTrigger(parentNode, isImport)
  },
  type: 'element' as const,
}

export const CODE_BLOCK = {
  dependencies: [CodeBlockNode],
  export: (node: LexicalNode) => {
    if (!$isCodeBlockNode(node)) {
      return null
    }
    const textContent = node.getTextContent()
    return '```' + (node.language || '') + (textContent ? '\n' + textContent : '') + '\n' + '```'
  },
  // trigger only: the regex lives in the card-shortcut seam, and the trailing
  // `\s` there is what makes the fence fire on the space keystroke
  regExp: FENCE_TRANSFORMER_REGEXP,
  replace: (parentNode: ElementNode, _children: LexicalNode[], match: string[]) => {
    $insertCodeBlockForShortcut(parentNode, match[1])
  },
  type: 'element' as const,
}

// custom text format transformers
export const SUBSCRIPT = {
  format: ['subscript'] as const,
  tag: '~',
  type: 'text-format' as const,
}

export const SUPERSCRIPT = {
  format: ['superscript'] as const,
  tag: '^',
  type: 'text-format' as const,
}

export const ELEMENT_TRANSFORMERS: Transformer[] = [HEADING, QUOTE, UNORDERED_LIST, ORDERED_LIST, HR, CODE_BLOCK]

export const CUSTOM_TEXT_FORMAT_TRANSFORMERS = [SUBSCRIPT, SUPERSCRIPT]

export const DEFAULT_TRANSFORMERS: Transformer[] = [
  ...ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
]

export const MINIMAL_TRANSFORMERS: Transformer[] = [
  ...TEXT_FORMAT_TRANSFORMERS,
  ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
]

export const BASIC_TRANSFORMERS: Transformer[] = [
  UNORDERED_LIST,
  ORDERED_LIST,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
]

export const EMAIL_TRANSFORMERS: Transformer[] = [
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  HR,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
]
