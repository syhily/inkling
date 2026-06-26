import React from 'react'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

import InklingComposerContext from '@/context/InklingComposerContext'

export default function InklingErrorBoundary({ children }: { children: React.ReactNode }) {
  const { onError } = React.useContext(InklingComposerContext)

  return (
    <ReactErrorBoundary fallback={<div className="border-red p-2 border">An error was thrown.</div>} onError={onError}>
      {children}
    </ReactErrorBoundary>
  )
}
