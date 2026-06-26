import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { CardVisibilityMessage } from '@/components/ui/CardVisibilityMessage'

describe('CardVisibilityMessage', () => {
  it('returns null when there is no message', () => {
    const { container } = render(<CardVisibilityMessage />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the message with a test id', () => {
    render(<CardVisibilityMessage message="Only members" dataTestId="visibility-msg" />)
    expect(screen.getByTestId('visibility-msg')).toHaveTextContent('Only members')
  })
})
