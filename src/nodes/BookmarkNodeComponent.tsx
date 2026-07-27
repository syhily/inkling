import { $createLinkNode } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $isParagraphNode,
  type EditorState,
  type LexicalEditor,
  type NodeKey,
} from 'lexical'
import React, { useCallback } from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { BookmarkCard } from '@/components/ui/cards/BookmarkCard'
import { useCardSelectionState } from '@/context/CardSelectionStoreContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useBookmarkMetadata } from '@/hooks/useBookmarkMetadata'
import { useInklingLabels } from '@/hooks/useInklingLabels'
import trackEvent from '@/utils/analytics'
import { isInternalUrl } from '@/utils/isInternalUrl'

interface BookmarkNodeComponentProps {
  author?: string
  nodeKey: NodeKey
  url: string
  icon?: string
  title?: string
  description?: string
  publisher?: string
  thumbnail?: string
  captionEditor: LexicalEditor | null
  captionEditorInitialState: EditorState | undefined
  createdWithUrl?: boolean
}

export function BookmarkNodeComponent({
  author,
  nodeKey,
  url,
  icon,
  title,
  description,
  publisher,
  thumbnail,
  captionEditor,
  captionEditorInitialState,
  createdWithUrl,
}: BookmarkNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const labels = useInklingLabels()

  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const isSelected = useCardSelectionState((state) => state.selectedCardKey === nodeKey)
  const [urlInputValue, setUrlInputValue] = React.useState<string>(url)
  const { loading, urlError, clearUrlError, submitUrl, fetchInitialMetadata } = useBookmarkMetadata({
    editor,
    nodeKey,
    fetchEmbed: cardConfig.fetchEmbed,
  })

  const handleUrlChange = (value: string): void => {
    setUrlInputValue(value)
  }

  const handleUrlSubmit = (href: string, type?: string): void => {
    if (type === 'internal' || type === 'default') {
      trackEvent('Link dropdown: Internal link chosen', {
        context: 'bookmark',
        fromLatest: type === 'default',
      })
    }
    if (type === 'url') {
      const target = isInternalUrl(href, cardConfig.siteUrl ?? '') ? 'internal' : 'external'
      trackEvent('Link dropdown: URL entered', { context: 'bookmark', target })
    }

    void submitUrl(href)
  }

  const handleRetry = (): void => {
    clearUrlError()
  }

  const handlePasteAsLink = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (!node) {
        return
      }
      const paragraph = $createParagraphNode().append(
        $createLinkNode(urlInputValue).append($createTextNode(urlInputValue)),
      )
      node.replace(paragraph)
      paragraph.selectEnd()
    })
  }, [editor, nodeKey, urlInputValue])

  const handleClose = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (!node) {
        return
      }
      const nextSibling = node.getNextSibling()
      if (nextSibling && $isParagraphNode(nextSibling) && nextSibling.getTextContentSize() === 0) {
        node.remove()
        nextSibling.selectEnd()
      } else {
        const paragraph = $createParagraphNode()
        node.replace(paragraph)
        paragraph.selectEnd()
      }
    })
  }, [editor, nodeKey])

  // if we create the node with a url
  //  fetch the metadata
  //  if it fails, paste as a link
  React.useEffect(() => {
    // only run this once
    if (createdWithUrl) {
      setUrlInputValue(url)
      fetchInitialMetadata(url).catch(() => {
        handlePasteAsLink()
      })
    }
    // We only do this for init
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const searchEnabled = typeof cardConfig.searchLinks === 'function'

  return (
    <>
      <BookmarkCard
        author={author}
        captionEditor={captionEditor}
        captionEditorInitialState={captionEditorInitialState}
        description={description}
        handleClose={handleClose}
        handlePasteAsLink={handlePasteAsLink}
        handleRetry={handleRetry}
        handleUrlChange={handleUrlChange}
        handleUrlSubmit={handleUrlSubmit}
        icon={icon}
        isLoading={loading}
        isSelected={isSelected}
        publisher={publisher}
        searchLinks={cardConfig.searchLinks}
        thumbnail={thumbnail}
        title={title}
        url={url}
        urlError={urlError}
        urlInputValue={urlInputValue}
        urlPlaceholder={searchEnabled ? labels['bookmark.url.placeholder.search'] : labels['bookmark.url.placeholder']}
      />

      <CardActionToolbar
        hideWhileEditing={false}
        items={[{ kind: 'snippet' }]}
        nodeKey={nodeKey}
        visibleWhen={!!title && !!cardConfig.createSnippet}
      />
    </>
  )
}
