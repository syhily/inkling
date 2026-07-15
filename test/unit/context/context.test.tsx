import { render, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { InklingSelectedCardContext, useInklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import { TKContext, useTKContext } from '@/context/TKContext'

describe('InklingComposerContext', () => {
  it('provides the default context value', () => {
    let captured: typeof InklingComposerContext extends React.Context<infer V> ? V : never

    function Consumer() {
      captured = React.useContext(InklingComposerContext)
      return null
    }

    render(<Consumer />)

    expect(captured!.fileUploader).toBeDefined()
    expect(captured!.cardConfig).toEqual({})
    expect(captured!.darkMode).toBe(false)
    expect(captured!.dragDropHandler).toBeUndefined()
  })
})

describe('CardContext', () => {
  it('provides the default context value', () => {
    let captured: typeof CardContext extends React.Context<infer V> ? V : never

    function Consumer() {
      captured = React.useContext(CardContext)
      return null
    }

    render(<Consumer />)

    expect(captured!.isSelected).toBe(false)
    expect(captured!.cardWidth).toBe('regular')
    expect(typeof captured!.setEditing).toBe('function')
  })
})

describe('InklingSelectedCardContext', () => {
  it('initializes state and exposes setters', async () => {
    const { result } = renderHook(() => useInklingSelectedCardContext(), {
      wrapper: InklingSelectedCardContext,
    })

    expect(result.current.isDragging).toBe(false)
    expect(result.current.showVisibilitySettings).toBe(false)

    result.current.setIsDragging(true)
    await waitFor(() => {
      expect(result.current.isDragging).toBe(true)
    })
  })
})

describe('TKContext', () => {
  it('tracks tk nodes per editor', async () => {
    const { result } = renderHook(() => useTKContext(), {
      wrapper: TKContext,
    })

    expect(result.current.tkCount).toBe(0)
    expect(result.current.tkNodeMap).toEqual({})

    result.current.addEditorTkNode('editor-1', 'top-1', 'tk-1')
    await waitFor(() => {
      expect(result.current.tkCount).toBe(1)
      expect(result.current.tkNodeMap['top-1']).toContain('tk-1')
    })

    result.current.removeEditorTkNode('editor-1', 'tk-1')
    await waitFor(() => {
      expect(result.current.tkCount).toBe(0)
    })

    result.current.addEditorTkNode('editor-1', 'top-1', 'tk-2')
    result.current.removeEditor('editor-1')
    await waitFor(() => {
      expect(result.current.tkCount).toBe(0)
    })
  })
})
