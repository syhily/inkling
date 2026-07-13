import 'highlight.js/styles/atom-one-dark.css'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import React from 'react'
import ReactHighlight from 'react-highlight'

interface SerializedStateTextareaProps {
  isOpen: boolean
}

const Highlight = (ReactHighlight.default || ReactHighlight) as unknown as React.FC<{
  className?: string
  children: React.ReactNode
}>

const SerializedStateTextarea = ({ isOpen }: SerializedStateTextareaProps) => {
  const [editor] = useLexicalComposerContext()

  const renderEditorState = () => JSON.stringify(editor.getEditorState().toJSON(), null, 2)

  const [serializedJson, setSerializedJson] = React.useState(renderEditorState())

  const onChange = () => {
    setSerializedJson(renderEditorState())
  }

  return (
    <>
      <div className="size-full resize-none !overflow-auto bg-black !p-4 font-mono text-sm text-grey-300 selection:bg-grey-800">
        {isOpen && <Highlight className="json">{serializedJson}</Highlight>}
      </div>
      <OnChangePlugin onChange={onChange} />
    </>
  )
}

export default SerializedStateTextarea
