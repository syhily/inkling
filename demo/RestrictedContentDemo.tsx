import { ListItemNode, ListNode } from '@lexical/list'
import React from 'react'
import { useLocation } from 'react-router-dom'

import { MINIMAL_NODES, RestrictContentPlugin } from '@/core'

import { DemoEditorShell } from './components/DemoEditorShell'

// The core entry requires the host to name its node set. MINIMAL_NODES alone
// would reject pasted list JSON, so the list pair joins explicitly.
const RESTRICTED_DEMO_NODES = [...MINIMAL_NODES, ListNode, ListItemNode]

function useQuery() {
  const { search } = useLocation()

  return React.useMemo(() => new URLSearchParams(search), [search])
}

interface RestrictedContentDemoProps {
  paragraphs?: number
}

function RestrictedContentDemo({ paragraphs: propParagraphs }: RestrictedContentDemoProps) {
  const query = useQuery()
  const paragraphs = propParagraphs ?? (Number(query.get('paragraphs')) || 1)

  return (
    <DemoEditorShell nodes={RESTRICTED_DEMO_NODES}>
      <RestrictContentPlugin paragraphs={paragraphs} />
    </DemoEditorShell>
  )
}

export default RestrictedContentDemo
