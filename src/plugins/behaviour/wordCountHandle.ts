// Editor-side handle for the per-top-level-composer word-count channel
// (plan 047). Owns the onChange callback handed to the top-level
// WordCountPlugin so nested composers can mount their own WordCountPlugin
// with the same callback — replacing the shared context ref that
// InklingNestedComposer read once at render time. Fed at mount by the
// top-level WordCountPlugin; React subscribes render-only via
// useWordCountCallback. One instance per top-level composer (created in
// InklingComposer) — nested composers share the top-level handle, exactly
// as the shared ref worked before.

export interface WordCountHandleState {
  onChange: ((count: number) => void) | null
}

export type WordCountHandleListener = (state: WordCountHandleState) => void

export interface WordCountHandle {
  getState: () => WordCountHandleState
  setState: (partial: Partial<WordCountHandleState>) => void
  subscribe: (listener: WordCountHandleListener) => () => void
}

export function createWordCountHandle(): WordCountHandle {
  let state: WordCountHandleState = { onChange: null }
  const listeners = new Set<WordCountHandleListener>()

  return {
    getState: () => state,

    setState: (partial) => {
      const next = { ...state, ...partial }
      if (next.onChange === state.onChange) {
        return
      }
      state = next
      for (const listener of listeners) {
        listener(state)
      }
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
