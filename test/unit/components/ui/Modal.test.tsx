import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Modal onClose={() => {}}>content</Modal>)
    expect(container.firstChild).toBeNull()
  })

  it('renders content when open', () => {
    render(
      <Modal isOpen onClose={() => {}}>
        Modal content
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toHaveTextContent('Modal content')
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose}>
        content
      </Modal>,
    )

    fireEvent.click(screen.getByRole('dialog').firstChild as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close icon is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose}>
        content
      </Modal>,
    )

    const closeIcon = screen.getByLabelText('Close dialog').querySelector('svg')
    expect(closeIcon).toBeTruthy()
    fireEvent.click(closeIcon!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose}>
        content
      </Modal>,
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
