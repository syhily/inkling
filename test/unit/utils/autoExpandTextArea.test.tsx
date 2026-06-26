import { render } from '@testing-library/react'
import React, { useRef } from 'react'
import { describe, expect, it } from 'vitest'

import useAutoExpandTextArea from '@/utils/autoExpandTextArea'

describe('useAutoExpandTextArea', () => {
  it('sets the textarea height to its scrollHeight', () => {
    function TestComponent({ value }: { value: string }) {
      const ref = useRef<HTMLTextAreaElement>(null)
      useAutoExpandTextArea({ el: ref, value })
      return <textarea ref={ref} data-testid="textarea" />
    }

    const { rerender, getByTestId } = render(<TestComponent value="" />)
    const textarea = getByTestId('textarea') as HTMLTextAreaElement

    Object.defineProperty(textarea, 'scrollHeight', { value: 120, configurable: true })
    rerender(<TestComponent value="hello" />)

    expect(textarea.style.height).toBe('120px')
  })
})
