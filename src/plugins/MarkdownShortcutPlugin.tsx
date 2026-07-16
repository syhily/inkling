import { type Transformer } from '@lexical/markdown'
import { MarkdownShortcutPlugin as LexicalMarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'

import { DEFAULT_TRANSFORMERS } from '@/markdown/transformers'

export default function MarkdownShortcutPlugin({
  transformers = DEFAULT_TRANSFORMERS,
}: { transformers?: readonly Transformer[] } = {}) {
  // Lexical's plugin takes a mutable array; copy so readonly caller arrays are accepted
  return LexicalMarkdownShortcutPlugin({ transformers: [...transformers] })
}
