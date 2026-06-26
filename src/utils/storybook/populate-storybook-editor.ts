import generateEditorState from '@/utils/generateEditorState'

export default function populateEditor({
  editor,
  initialHtml,
}: {
  editor: import('lexical').LexicalEditor
  initialHtml: string
}) {
  generateEditorState({ editor, initialHtml })
}
