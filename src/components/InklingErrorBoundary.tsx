import React from 'react'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useInklingLabels } from '@/hooks/useInklingLabels'

export default function InklingErrorBoundary({ children }: { children: React.ReactNode }) {
  const { onError } = React.useContext(InklingHostIntegrationContext)
  const labels = useInklingLabels()

  return (
    <ReactErrorBoundary
      fallback={<div className="border border-red p-2">{labels['error.boundary']}</div>}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  )
}
