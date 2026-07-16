import React from 'react'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'

export default function InklingErrorBoundary({ children }: { children: React.ReactNode }) {
  const { onError } = React.useContext(InklingHostIntegrationContext)

  return (
    <ReactErrorBoundary fallback={<div className="border border-red p-2">An error was thrown.</div>} onError={onError}>
      {children}
    </ReactErrorBoundary>
  )
}
