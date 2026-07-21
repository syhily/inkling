import { createComposerHandle, type ComposerHandle } from './composer-handle'

// Editor-side handle for the per-top-level-composer word-count channel
// (plan 047), built on the composer handle factory. Owns the onChange
// callback handed to the top-level WordCountPlugin so nested composers can
// mount their own WordCountPlugin with the same callback — replacing the
// shared context ref that InklingNestedComposer read once at render time.
// Fed at mount by the top-level WordCountPlugin; React subscribes render-only
// via useWordCountCallback. One instance per top-level composer (created in
// InklingComposer) — nested composers share the top-level handle, exactly as
// the shared ref worked before.

export interface WordCountHandleState {
  onChange: ((count: number) => void) | null
}

export type WordCountHandle = ComposerHandle<WordCountHandleState>

export function createWordCountHandle(): WordCountHandle {
  return createComposerHandle<WordCountHandleState>({ onChange: null })
}
