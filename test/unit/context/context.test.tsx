import { render, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingCollaborationContext from '@/context/InklingCollaborationContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import {
  SharedEditorStateContext,
  useSharedEditorStateContext,
  type SharedEditorStateContextValue,
} from '@/context/SharedEditorStateContext'
import { TKContext, useTKContext } from '@/context/TKContext'

describe('InklingHostIntegrationContext', () => {
  it('provides the default context value', () => {
    let captured: typeof InklingHostIntegrationContext extends React.Context<infer V> ? V : never

    function Consumer() {
      captured = React.useContext(InklingHostIntegrationContext)
      return null
    }

    render(<Consumer />)

    expect(captured!.fileUploader).toBeDefined()
    expect(captured!.cardConfig).toEqual({})
    expect(captured!.onError).toBeDefined()
  })
})

describe('InklingCollaborationContext', () => {
  it('provides the default context value', () => {
    let captured: typeof InklingCollaborationContext extends React.Context<infer V> ? V : never

    function Consumer() {
      captured = React.useContext(InklingCollaborationContext)
      return null
    }

    render(<Consumer />)

    expect(captured!.createWebsocketProvider).toBeDefined()
  })
})

describe('InklingUiPrefsContext', () => {
  it('provides the default context value', () => {
    let captured: typeof InklingUiPrefsContext extends React.Context<infer V> ? V : never

    function Consumer() {
      captured = React.useContext(InklingUiPrefsContext)
      return null
    }

    render(<Consumer />)

    expect(captured!.darkMode).toBe(false)
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

describe('SharedEditorStateContext', () => {
  it('isolates fallback history state between provider-less consumers', () => {
    const captured: SharedEditorStateContextValue[] = []

    function Consumer() {
      captured.push(useSharedEditorStateContext())
      return null
    }

    render(
      <>
        <Consumer />
        <Consumer />
      </>,
    )

    expect(captured).toHaveLength(2)
    expect(captured[0].historyState).not.toBe(captured[1].historyState)
    expect(captured[0].onChange).toBeUndefined()
    expect(captured[1].onChange).toBeUndefined()
  })

  it('keeps the history state stable when the onChange identity changes', () => {
    const captured: SharedEditorStateContextValue[] = []

    function Consumer() {
      captured.push(useSharedEditorStateContext())
      return null
    }

    const { rerender } = render(
      <SharedEditorStateContext onChange={() => {}}>
        <Consumer />
      </SharedEditorStateContext>,
    )
    rerender(
      <SharedEditorStateContext onChange={() => {}}>
        <Consumer />
      </SharedEditorStateContext>,
    )

    expect(captured.length).toBeGreaterThanOrEqual(2)
    const first = captured[0]
    for (const value of captured) {
      expect(value.historyState).toBe(first.historyState)
    }
    // the fresh onChange still flows through — only the undo stack is pinned
    expect(captured[captured.length - 1].onChange).not.toBe(first.onChange)
  })
})
