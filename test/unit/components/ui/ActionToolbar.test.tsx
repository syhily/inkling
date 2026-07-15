import { render } from '@testing-library/react'

import { ActionToolbar } from '@/components/ui/ActionToolbar'

vi.mock('@/context/InklingSelectedCardContext', () => ({
  useInklingSelectedCardContext: () => ({ isDragging: false }),
}))

describe('ActionToolbar', () => {
  it('does not disable pointer events on the toolbar container', () => {
    const { container } = render(
      <ActionToolbar isVisible>
        <button type="button">child</button>
      </ActionToolbar>,
    )
    expect(container.firstChild).not.toHaveClass('pointer-events-none')
  })
})
