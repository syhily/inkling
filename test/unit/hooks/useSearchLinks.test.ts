import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { type SearchResult, useSearchLinks } from '@/hooks/useSearchLinks'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function resultsFor(label: string): SearchResult[] {
  return [{ label, items: [{ title: `${label} result`, url: `https://example.com/${label}` }] }]
}

async function waitForDebounce() {
  // the hook debounces searches by 100ms
  await act(async () => {
    await new Promise((r) => {
      setTimeout(r, 150)
    })
  })
}

describe('useSearchLinks', () => {
  it('ignores stale responses that resolve out of order', async () => {
    const first = deferred<SearchResult[]>()
    const second = deferred<SearchResult[]>()
    const searchLinks = vi.fn((term?: string): Promise<SearchResult[] | undefined> => {
      if (term === 'first') {
        return first.promise
      }
      if (term === 'second') {
        return second.promise
      }
      return Promise.resolve([])
    })

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))

    rerender({ query: 'first' })
    await waitForDebounce()
    rerender({ query: 'second' })
    await waitForDebounce()

    await act(async () => {
      second.resolve(resultsFor('second'))
    })
    await waitFor(() => expect(result.current.listOptions[0]?.label).toBe('second'))

    // the older query resolves after the newer one — it must not overwrite
    await act(async () => {
      first.resolve(resultsFor('first'))
      await new Promise((r) => {
        setTimeout(r, 0)
      })
    })
    expect(result.current.listOptions[0]?.label).toBe('second')
  })

  it('clears the searching state when the search resolves to undefined', async () => {
    const searchLinks = vi.fn(
      (term?: string): Promise<SearchResult[] | undefined> =>
        term === 'gone' ? Promise.resolve(undefined) : Promise.resolve([]),
    )

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))

    rerender({ query: 'gone' })

    await waitFor(() => expect(searchLinks).toHaveBeenCalledWith('gone'))
    await waitFor(() => expect(result.current.isSearching).toBe(false))
  })

  it('shows the URL option for URL queries without searching', async () => {
    const searchLinks = vi.fn((): Promise<SearchResult[] | undefined> => Promise.resolve([]))

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))
    expect(searchLinks).toHaveBeenCalledTimes(1)

    rerender({ query: 'https://example.com/page' })

    expect(result.current.listOptions[0]?.label).toBe('Link to web page')
    expect(result.current.listOptions[0]?.items[0]?.value).toBe('https://example.com/page')
    expect(searchLinks).toHaveBeenCalledTimes(1)
  })
})
