import type { LexicalEditor, NodeKey } from 'lexical'

import React from 'react'

import type { BookmarkEmbedResponse, LinkingSettings } from '@/context/InklingHostIntegrationContext'

import { $isBookmarkNode, $updateCardNode } from '@/nodes/base'

// Keep the runtime boundary defensive for untyped JavaScript hosts even though
// TypeScript hosts now receive the closed bookmark response contract.
function isEmbedResponse(value: unknown): value is BookmarkEmbedResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (!('url' in value) || typeof value.url !== 'string') {
    return false
  }
  if (!('metadata' in value)) {
    return false
  }
  const { metadata } = value
  if (typeof metadata !== 'object' || metadata === null) {
    return false
  }
  return (
    'author' in metadata &&
    typeof metadata.author === 'string' &&
    'icon' in metadata &&
    typeof metadata.icon === 'string' &&
    'title' in metadata &&
    typeof metadata.title === 'string' &&
    'description' in metadata &&
    typeof metadata.description === 'string' &&
    'publisher' in metadata &&
    typeof metadata.publisher === 'string' &&
    'thumbnail' in metadata &&
    typeof metadata.thumbnail === 'string'
  )
}

interface UseBookmarkMetadataOptions {
  editor: LexicalEditor
  nodeKey: NodeKey
  fetchEmbed: LinkingSettings['fetchEmbed'] | undefined
}

export interface UseBookmarkMetadataResult {
  loading: boolean
  urlError: boolean
  clearUrlError: () => void
  // the submit path: focuses the editor before the input dismounts, applies
  // the submitted href, and folds fetch failures into the urlError state
  submitUrl: (href: string) => Promise<void>
  // the init path (a card constructed with a bare url): applies the
  // response's canonical url and rejects on fetch failure so the caller can
  // paste-as-link
  fetchInitialMetadata: (href: string) => Promise<void>
}

export function useBookmarkMetadata({
  editor,
  nodeKey,
  fetchEmbed,
}: UseBookmarkMetadataOptions): UseBookmarkMetadataResult {
  const [loading, setLoading] = React.useState<boolean>(false)
  const [urlError, setUrlError] = React.useState<boolean>(false)

  const fetchAndApply = React.useCallback(
    async (href: string, init: boolean): Promise<void> => {
      if (!init) {
        editor.getRootElement()?.focus({ preventScroll: true }) // focus editor before causing the input element to dismount
      }
      setLoading(true)
      // set the test data return values in fetchEmbed.js — a rejected embed
      // resolves to undefined (unless init rethrows) and falls through the
      // same not-an-embed-response exit below
      const response = await Promise.resolve(fetchEmbed?.(href, { type: 'bookmark' })).catch((e: unknown) => {
        setLoading(false)
        setUrlError(true)
        if (init) {
          throw e
        }
        return undefined
      })
      if (!isEmbedResponse(response)) {
        setLoading(false)
        setUrlError(true)
        return
      }
      editor.update(() => {
        $updateCardNode(nodeKey, $isBookmarkNode, (node) => {
          node.url = init ? response.url : href
          node.author = response.metadata.author
          node.icon = response.metadata.icon
          node.title = response.metadata.title
          node.description = response.metadata.description
          node.publisher = response.metadata.publisher
          node.thumbnail = response.metadata.thumbnail

          if (init) {
            node.selectNext()
          }
        })
      })
      setLoading(false)
    },
    [editor, nodeKey, fetchEmbed],
  )

  const submitUrl = React.useCallback((href: string) => fetchAndApply(href, false), [fetchAndApply])
  const fetchInitialMetadata = React.useCallback((href: string) => fetchAndApply(href, true), [fetchAndApply])
  const clearUrlError = React.useCallback(() => setUrlError(false), [])

  return { loading, urlError, clearUrlError, submitUrl, fetchInitialMetadata }
}
