import React from 'react'

// Factory for the composer handle pattern (plans 038/047): a per-top-level-
// composer, editor-side channel in the shape getState / setState(partial) /
// subscribe. Non-React code (Lexical command handlers, plugins) reads state
// synchronously instead of closing over a stale React mirror, so behaviour
// listeners register once per mount instead of re-registering per render —
// see InklingBehaviourPlugin for the wiring rationale. React subscribes
// render-only via useSyncExternalStore. Each top-level composer creates one
// instance per channel in a provider — never a module singleton, so multiple
// composers on one page cannot clobber each other.

export type ComposerHandleListener<T> = (state: T) => void

export interface ComposerHandle<T> {
  getState: () => T
  setState: (partial: Partial<T>) => void
  subscribe: (listener: ComposerHandleListener<T>) => () => void
}

export function createComposerHandle<T extends object>(initialState: T): ComposerHandle<T> {
  let state = initialState
  const listeners = new Set<ComposerHandleListener<T>>()

  return {
    getState: () => state,

    setState: (partial) => {
      const next = { ...state, ...partial }
      // reference-equality change guard: swallow updates that keep every
      // value identical, so subscribers are not notified (and React does not
      // re-render) for no-op writes
      const changed = (Object.keys(next) as (keyof T)[]).some((key) => next[key] !== state[key])
      if (!changed) {
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

export interface ComposerHandleBinding<T> {
  Context: React.Context<ComposerHandle<T>>
  useHandle: () => ComposerHandle<T>
  useHandleState: <S>(selector: (state: T) => S) => S
}

// React binding for one composer handle channel: a context whose default is a
// module-scope fallback instance (for consumers rendered outside any
// provider, e.g. isolated tests — real editors always get the provider's
// per-composer instance, so composers never share state through the default),
// a useHandle accessor for non-rendering consumers, and a render-only
// useHandleState subscription hook. useSyncExternalStore compares snapshots
// with Object.is, so a subscriber re-renders only when its selected slice
// changes — keep selectors returning primitives or stable references, not
// fresh objects.
export function createComposerHandleBinding<T extends object>(
  createHandle: () => ComposerHandle<T>,
): ComposerHandleBinding<T> {
  const Context = React.createContext<ComposerHandle<T>>(createHandle())

  function useHandle(): ComposerHandle<T> {
    return React.useContext(Context)
  }

  function useHandleState<S>(selector: (state: T) => S): S {
    const handle = React.useContext(Context)
    const getSnapshot = () => selector(handle.getState())
    return React.useSyncExternalStore(handle.subscribe, getSnapshot, getSnapshot)
  }

  return { Context, useHandle, useHandleState }
}
