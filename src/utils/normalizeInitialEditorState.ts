import type { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import type { SerializedEditorState } from 'lexical'

/**
 * The initial editor state accepted by `<InklingComposer>`. In addition to the
 * shapes Lexical itself supports, a plain serialized editor-state object may be
 * passed for convenience — it is normalized to a JSON string before reaching
 * Lexical.
 */
export type InklingInitialEditorState = InitialEditorStateType | SerializedEditorState

// SerializedParagraphNode declares textFormat/textStyle as required, but
// ParagraphNode.importJSON treats them as optional — keep the historical payload
const EMPTY_PARAGRAPH = {
  children: [],
  direction: null,
  format: '',
  indent: 0,
  type: 'paragraph',
  version: 1,
}

/**
 * Normalize the public `initialEditorState` prop into the `InitialEditorStateType`
 * Lexical accepts, so the single-editor and collaboration paths share one value:
 *
 * - `null`/`undefined`, `EditorState` instances, and initializer functions pass
 *   through unchanged;
 * - JSON strings are parsed only to detect and repair an empty root (the editor
 *   needs at least one paragraph node), then returned as strings;
 * - serialized objects are cloned — never mutated — repaired the same way, and
 *   returned as JSON strings.
 *
 * Malformed JSON strings throw from `JSON.parse`, as they did before.
 */
export function normalizeInitialEditorState(
  initialEditorState: InklingInitialEditorState | undefined,
): InitialEditorStateType | undefined {
  if (initialEditorState === null || initialEditorState === undefined || typeof initialEditorState === 'function') {
    return initialEditorState
  }

  if (typeof initialEditorState === 'string') {
    const parsed = JSON.parse(initialEditorState) as SerializedEditorState

    if (parsed.root?.children?.length === 0) {
      parsed.root.children.push({ ...EMPTY_PARAGRAPH })
      return JSON.stringify(parsed)
    }

    return initialEditorState
  }

  // an `EditorState` instance has no `root` property — hand it to Lexical as-is
  if (!('root' in initialEditorState)) {
    return initialEditorState
  }

  // clone so the caller's serialized object is never mutated
  const cloned = JSON.parse(JSON.stringify(initialEditorState)) as SerializedEditorState

  if (cloned.root?.children?.length === 0) {
    cloned.root.children.push({ ...EMPTY_PARAGRAPH })
  }

  return JSON.stringify(cloned)
}
