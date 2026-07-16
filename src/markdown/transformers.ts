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
import { $createNodeSelection, $setSelection } from 'lexical'

import { $createCodeBlockNode, $isCodeBlockNode, CodeBlockNode } from '@/nodes/CodeBlockNode'
import { $createHorizontalRuleNode, $isHorizontalRuleNode, HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'

export const HR = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '---' : null
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode: ElementNode, _children: LexicalNode[], _match: string[], isImport: boolean) => {
    const line = $createHorizontalRuleNode()

    // TODO: Get rid of isImport flag
    if (isImport || parentNode.getNextSibling() !== null) {
      parentNode.replace(line)
    } else {
      parentNode.insertBefore(line)
    }

    line.selectNext()
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
  regExp: /^```(\w{1,10})?\s/,
  replace: (parentNode: ElementNode, _children: LexicalNode[], match: string[]) => {
    const language = match[1]
    const codeBlockNode = $createCodeBlockNode({ language, _openInEditMode: true })
    const replacementNode = parentNode.replace(codeBlockNode)

    // select node when replacing so it immediately renders in editing mode
    const replacementSelection = $createNodeSelection()
    replacementSelection.add(replacementNode.getKey())
    $setSelection(replacementSelection)
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
