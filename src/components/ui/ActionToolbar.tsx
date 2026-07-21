import type React from 'react'

import { useDragDropState } from '@/hooks/useDragDropState'

export function ActionToolbar({
  isVisible,
  children,
  'data-inkling-card-toolbar': dataInklingCardToolbar,
}: {
  isVisible?: boolean
  children?: React.ReactNode
  'data-inkling-card-toolbar'?: string
}) {
  const isDragging = useDragDropState((state) => state.isDragging)

  if (isVisible && !isDragging) {
    return (
      <div
        className="not-inkling-prose absolute top-[-46px] left-1/2 z-[1000] -translate-x-1/2"
        data-inkling-card-toolbar={dataInklingCardToolbar}
      >
        {children}
      </div>
    )
  }
}
