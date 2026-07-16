import { $createLinkNode } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createTextNode, $getSelection, $isRangeSelection, $nodesOfType } from 'lexical'
import React from 'react'

import { AtLinkResultsPopup } from '@/components/ui/AtLinkResultsPopup'
import Portal from '@/components/ui/Portal'
import InklingHostIntegrationContext, { type CardConfig } from '@/context/InklingHostIntegrationContext'
import { useSearchLinks, type ListOptionItem, type ListOptionSection } from '@/hooks/useSearchLinks'
import { $isAtLinkNode, $isAtLinkSearchNode, $isZWNJNode, AtLinkNode, AtLinkSearchNode } from '@/nodes/base'
import { $createBookmarkNode } from '@/nodes/BookmarkNode'
import trackEvent from '@/utils/analytics'
import { isInternalUrl } from '@/utils/isInternalUrl'

import {
  $removeAtLink,
  registerAtLinkGuards,
  registerAtLinkInsertion,
  registerAtLinkNodeTransform,
} from './behaviour/at-link'

function noResultOptions(): ListOptionSection[] {
  return [
    {
      label: 'No results found',
      items: [],
    },
  ]
}

interface AtLinkPluginProps {
  searchLinks: NonNullable<CardConfig['searchLinks']>
  siteUrl?: CardConfig['siteUrl']
}

// Manages at-link search nodes and display of the search results panel when appropriate
export const InklingAtLinkPlugin = ({ searchLinks, siteUrl }: AtLinkPluginProps) => {
  const [editor] = useLexicalComposerContext()
  const [focusedAtLinkNode, setFocusedAtLinkNode] = React.useState<AtLinkNode | null>(null)
  // ref mirror so the update-listener closure can read the current value
  // (state updates are async and the listener is registered only once)
  const focusedAtLinkNodeRef = React.useRef<AtLinkNode | null>(null)
  const updateFocusedAtLinkNode = (node: AtLinkNode | null) => {
    focusedAtLinkNodeRef.current = node
    setFocusedAtLinkNode(node)
  }
  const [query, setQuery] = React.useState('')
  const searchOptions = React.useMemo(() => ({ noResultOptions }), [])
  const { isSearching, listOptions } = useSearchLinks(query, searchLinks, searchOptions)

  // Convert a typed '@' into an at-link node (headless lifecycle module).
  React.useEffect(() => registerAtLinkInsertion(editor), [editor])

  // register an update listener
  // - update plugin state with a focused at-link node
  // - update plugin state with search query based on at-link-search node text content
  // - remove at-link nodes when they don't have focus (i.e. using arrow keys to move out of them)
  React.useEffect(() => {
    return editor.registerUpdateListener(({ dirtyLeaves, dirtyElements }) => {
      // do nothing if we're in the middle of composing text
      if (editor.isComposing()) {
        return
      }

      // Skip the full-tree at-link scan unless an at-link is active or the
      // update touched nodes that could contain one — at-link nodes only
      // exist transiently while the search popup is open, tracked via the ref
      // (selection changes away from an at-link have empty dirty sets but a
      // focused at-link, so the ref check keeps the removal path working).
      if (!focusedAtLinkNodeRef.current && dirtyLeaves.size === 0 && dirtyElements.size === 0) {
        return
      }

      editor.update(() => {
        const atLinkNodes = $nodesOfType(AtLinkNode)
        const selection = $getSelection()

        // we don't have a normal selection so we don't have a cursor inside
        // an at-link node, remove all of them
        if (!$isRangeSelection(selection)) {
          atLinkNodes.forEach((atLinkNode) => $removeAtLink(atLinkNode))
          updateFocusedAtLinkNode(null)
          setQuery('')
          return
        }

        // we have a collapsed selection, remove any at-link nodes that don't have focus
        // handles cursor movement out of at-link nodes
        if (selection.isCollapsed()) {
          const anchorNode = selection.anchor.getNode()
          let selectedAtLinkNode: AtLinkNode | null = null

          if ($isAtLinkNode(anchorNode)) {
            selectedAtLinkNode = anchorNode
          }
          if ($isAtLinkNode(anchorNode.getParent())) {
            selectedAtLinkNode = anchorNode.getParent() as AtLinkNode
          }

          atLinkNodes.forEach((atLinkNode) => {
            if (atLinkNode !== selectedAtLinkNode) {
              $removeAtLink(atLinkNode)
            }
          })

          if (selectedAtLinkNode) {
            // search node is focused, update our search query
            updateFocusedAtLinkNode(selectedAtLinkNode)

            // at-link nodes always have a ZWNJ node followed by an at-link-search node
            const searchNode = selectedAtLinkNode.getChildAtIndex(1)
            const searchNodeText = $isAtLinkSearchNode(searchNode) ? searchNode.getTextContent() : ''

            setQuery(searchNodeText)

            // normalize selection to be inside the search node when on zwnj
            // - handles case where text is backspaced to empty
            if ($isZWNJNode(selection.focus.getNode()) && window.getSelection()?.anchorOffset === 0) {
              selectedAtLinkNode.select(1, 1)
              const rangeSelection = $getSelection()
              if ($isRangeSelection(rangeSelection) && $isAtLinkSearchNode(searchNode)) {
                rangeSelection.anchor.set(searchNode.getKey(), 0, 'text')
                rangeSelection.focus.set(searchNode.getKey(), 0, 'text')
              }
            }

            // if the search node is already empty but active, remove the at-link node on backspace
            if (searchNodeText === '' && $isZWNJNode(selection.anchor.getNode())) {
              $removeAtLink(selectedAtLinkNode, { focus: true })
            }
          } else {
            // search node isn't focused, reset plugin state
            updateFocusedAtLinkNode(null)
            setQuery('')
          }

          return
        }

        // TODO: prevent range selection spanning outside of at-link node
      })
    })
  }, [editor])

  // register some command handlers to avoid certain actions happening whilst
  // an at-link-search node is focused
  React.useEffect(() => registerAtLinkGuards(editor), [editor])

  // register transforms to ensure at-link node trees are valid
  React.useEffect(() => registerAtLinkNodeTransform(editor), [editor])

  // when a search result is selected, replace the at-link node with a link node
  const onItemSelect = React.useCallback(
    (item?: ListOptionItem) => {
      editor.update(() => {
        if (!item?.value || !focusedAtLinkNode) {
          if (focusedAtLinkNode) {
            $removeAtLink(focusedAtLinkNode, { focus: true })
          }
          return
        }

        const parent = focusedAtLinkNode.getParent()
        if (!parent) {
          return
        }
        // we have to get the children nodes
        const children = parent.getChildren()

        const isTextLink = children.length !== 1 || !$isAtLinkNode(children[0])

        if (isTextLink) {
          const linkNode = $createLinkNode(item.value)
          const textNode = $createTextNode(item.label)
          textNode.setFormat(focusedAtLinkNode.getLinkFormat() ?? 0)
          linkNode.append(textNode)

          focusedAtLinkNode.replace(linkNode)
          linkNode.selectEnd()

          setQuery('')
          updateFocusedAtLinkNode(null)
        } else {
          const bookmarkNode = $createBookmarkNode({
            url: item.value,
            title: item.label,
          })
          focusedAtLinkNode.replace(bookmarkNode)
          bookmarkNode.selectEnd()
        }

        if (item.type === 'internal' || item.type === 'default') {
          trackEvent('Link dropdown: Internal link chosen', {
            context: 'at-link',
            fromLatest: item.type === 'default',
            isBookmark: !isTextLink,
          })
        } else {
          const linkTarget = isInternalUrl(item.value, siteUrl) ? 'internal' : 'external'
          trackEvent('Link dropdown: URL entered', {
            context: 'at-link',
            target: linkTarget,
            isBookmark: !isTextLink,
          })
        }
      })
    },
    [editor, focusedAtLinkNode, siteUrl],
  )

  // render nothing when we don't have a focused at-link node
  if (!focusedAtLinkNode) {
    return null
  }

  // otherwise render search results popup
  return (
    <Portal data-testid="at-link-popup">
      <AtLinkResultsPopup
        atLinkNode={focusedAtLinkNode}
        isSearching={isSearching}
        listOptions={listOptions}
        query={query}
        onSelect={onItemSelect}
      />
    </Portal>
  )
}

// wrapping InklingAtLinkPlugin means we can ensure all dependencies are available
// before rendering the plugin, avoiding complex conditionals in the plugin itself
export const AtLinkPlugin = () => {
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const [editor] = useLexicalComposerContext()

  // do nothing if we haven't been passed a way to search internal links
  const { searchLinks, siteUrl } = cardConfig
  if (typeof searchLinks !== 'function') {
    return null
  }

  // do nothing if the required nodes aren't loaded
  if (!editor.hasNodes([AtLinkNode, AtLinkSearchNode])) {
    return null
  }

  return <InklingAtLinkPlugin searchLinks={searchLinks} siteUrl={siteUrl} />
}

export default AtLinkPlugin
