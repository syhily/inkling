import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Dropdown } from '@/components/ui/Dropdown'

const menu = [
  { label: 'Free members', name: 'status:free' },
  { label: 'Paid members', name: 'status:-free' },
]

describe('Dropdown', () => {
  it('opens on trigger click and closes on trigger blur', async () => {
    render(<Dropdown dataTestId="visibility" menu={menu} value="status:free" onChange={() => {}} />)

    await userEvent.click(screen.getByTestId('visibility-value'))
    expect(screen.getByText('Paid members')).toBeInTheDocument()

    fireEvent.blur(screen.getByTestId('visibility-value'))
    expect(screen.queryByText('Paid members')).toBeNull()
  })

  it('selects an option on mouse down without losing it to the blur', async () => {
    const onChange = vi.fn()
    render(<Dropdown dataTestId="visibility" menu={menu} value="status:free" onChange={onChange} />)

    await userEvent.click(screen.getByTestId('visibility-value'))
    fireEvent.mouseDown(screen.getByText('Paid members'))

    expect(onChange).toHaveBeenCalledWith('status:-free')
    expect(screen.queryByText('Paid members')).toBeNull()
  })

  it('uses a focusable button trigger', () => {
    render(<Dropdown dataTestId="visibility" menu={menu} value="status:free" onChange={() => {}} />)
    expect(screen.getByTestId('visibility-value').tagName).toBe('BUTTON')
  })

  it('preselects the current value in the keyboard list', async () => {
    render(<Dropdown dataTestId="visibility" menu={menu} value="status:-free" onChange={() => {}} />)

    await userEvent.click(screen.getByTestId('visibility-value'))
    const selected = screen.getByTestId('visibility-option-status:-free')

    expect(selected.className).toContain('bg-grey-100')
  })
})
