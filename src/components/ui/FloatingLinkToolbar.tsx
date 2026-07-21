import { $isLinkNode, type LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNearestNodeFromDOMNode } from 'lexical'
import React from 'react'

import FloatingToolbar from '@/components/ui/FloatingToolbar'
import { LinkToolbar } from '@/components/ui/LinkToolbar'
import { $selectLinkText } from '@/plugins/behaviour/link-editing'
import { debounce } from '@/utils'

interface FloatingLinkToolbarProps {
  anchorElem: HTMLElement
  onEditLink: (data: { href: string }) => void
  disabled?: boolean
}

export function FloatingLinkToolbar({ anchorElem, onEditLink, disabled }: FloatingLinkToolbarProps) {
  const [editor] = useLexicalComposerContext()
  const [linkNode, setLinkNode] = React.useState<LinkNode | null>(null)
  const [href, setHref] = React.useState('')
  const toolbarRef = React.useRef<HTMLDivElement | null>(null)
  const [targetElem, setTargetElem] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (disabled) {
      if (linkNode) {
        setLinkNode(null)
        setHref('')
      }
      return
    }

    const onMouseEnter = (event: MouseEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) {
        return
      }

      editor.update(() => {
        const target = event.target
        if (!(target instanceof HTMLElement)) {
          return
        }
        const node = $getNearestNodeFromDOMNode(target)
        setTargetElem(target)
        const parentNode = node?.getParent()
        const link = $isLinkNode(node) ? node : $isLinkNode(parentNode) ? parentNode : null

        if (!link) {
          if (linkNode) {
            setLinkNode(null)
          }

          return
        }

        setLinkNode(link)
        setHref(link.getURL())
      })
    }

    const onMouseEnterDebounced = debounce(onMouseEnter, 50)

    const handler = (e: MouseEvent) => onMouseEnterDebounced(e)
    document.addEventListener('mousemove', handler)

    return () => {
      onMouseEnterDebounced.cancel()
      document.removeEventListener('mousemove', handler)
    }
  }, [disabled, editor, linkNode])

  const onEdit = () => {
    if (!linkNode) {
      return
    }
    editor.update(() => {
      if ($selectLinkText(linkNode)) {
        onEditLink({ href })
      }
    })
  }

  const onRemove = () => {
    if (!linkNode) {
      return
    }
    editor.update(() => {
      linkNode.select()
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
      setLinkNode(null)
    })
  }

  if (!linkNode) {
    return null
  }
  return (
    <FloatingToolbar
      anchorElem={anchorElem}
      controlOpacity={true}
      editor={editor}
      isVisible={true}
      targetElem={targetElem}
      toolbarRef={toolbarRef}
    >
      <LinkToolbar href={href} onEdit={onEdit} onRemove={onRemove} />
    </FloatingToolbar>
  )
}
