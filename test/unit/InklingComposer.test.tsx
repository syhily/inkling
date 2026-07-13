import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import InklingComposer from '@/components/InklingComposer'
import InklingErrorBoundary from '@/components/InklingErrorBoundary'
import InklingComposerContext from '@/context/InklingComposerContext'

function EditorTree() {
  return (
    <RichTextPlugin contentEditable={<ContentEditable />} ErrorBoundary={InklingErrorBoundary} placeholder={null} />
  )
}

const stateWithText = JSON.stringify({
  root: {
    children: [
      {
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'hello', type: 'text', version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const emptyRootState = JSON.stringify({
  root: { children: [], direction: null, format: '', indent: 0, type: 'root', version: 1 },
})

describe('InklingComposer', function () {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders', () => {
    const { container } = render(
      <InklingComposer>
        <EditorTree />
      </InklingComposer>,
    )

    expect(container.querySelector('[contenteditable]')).toBeInTheDocument()
  })

  it('accepts initialEditorState prop', () => {
    const { container } = render(
      <InklingComposer initialEditorState={stateWithText}>
        <EditorTree />
      </InklingComposer>,
    )

    expect(container.querySelector('[contenteditable]')).toHaveTextContent('hello')
  })

  it('injects an empty paragraph when initialEditorState has no root children', () => {
    const { container } = render(
      <InklingComposer initialEditorState={emptyRootState}>
        <EditorTree />
      </InklingComposer>,
    )

    const editable = container.querySelector('[contenteditable]')
    expect(editable).toBeInTheDocument()
    expect(editable!.querySelector('p')).toBeInTheDocument()
  })

  it('logs a warning and installs a no-op uploader when fileUploader.useFileUpload is missing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    let upload: ((files: FileList | File[]) => Promise<unknown>) | undefined

    function FileUploadConsumer() {
      const { fileUploader } = React.useContext(InklingComposerContext)
      const uploader = fileUploader.useFileUpload('image')
      upload = uploader.upload
      return null
    }

    render(
      <InklingComposer>
        <FileUploadConsumer />
      </InklingComposer>,
    )

    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith(
      '<InklingComposer> requires a `fileUploader` prop object to be passed containing a `useFileUpload` custom hook',
    )
    await expect(upload!([])).resolves.toBeUndefined()
  })
})
