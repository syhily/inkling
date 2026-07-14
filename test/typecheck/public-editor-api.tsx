/**
 * Compile-time contract fixtures for the public editor component API.
 *
 * This file is included by the root tsconfig (unlike test/unit) and is only
 * type-checked — it is never executed and contains no runtime assertions.
 */
import type { Transformer } from '@lexical/markdown'
import type { LexicalEditor, SerializedEditorState } from 'lexical'

import { ORDERED_LIST } from '@lexical/markdown'

import {
  BASIC_NODES,
  BASIC_TRANSFORMERS,
  EmailEditor,
  type EmailEditorProps,
  type ExternalControlAPI,
  InklingComposableEditor,
  type InklingComposableEditorProps,
  InklingComposer,
  type InklingComposerProps,
  InklingEditor,
  type InklingEditorProps,
  type InklingInitialEditorState,
  InklingNestedComposer,
  type InklingNestedComposerProps,
} from '@/index'

declare const nestedEditor: LexicalEditor
declare const serializedState: SerializedEditorState
declare const handleChange: (editorState: SerializedEditorState) => void
declare const handleApi: (api: ExternalControlAPI | null) => void

const customTransformers: readonly Transformer[] = [ORDERED_LIST, ...BASIC_TRANSFORMERS]

// --- positive cases ---------------------------------------------------------

// every InklingInitialEditorState shape is accepted
const stateFromString: InklingInitialEditorState =
  '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}'
const stateFromObject: InklingInitialEditorState = serializedState
const stateFromNull: InklingInitialEditorState = null
const stateFromInitializer: InklingInitialEditorState = () => {}
void stateFromString
void stateFromObject
void stateFromNull
void stateFromInitializer

const composerProps: InklingComposerProps = {
  darkMode: true,
  // a partial uploader (missing useFileUpload) is accepted for compatibility
  fileUploader: { fileTypes: { image: { mimeTypes: ['image/png'] } } },
  initialEditorState: serializedState,
}
void composerProps

const composer = (
  <InklingComposer initialEditorState={serializedState} nodes={BASIC_NODES} onError={(error) => void error}>
    {null}
  </InklingComposer>
)
void composer

const composableEditorProps: InklingComposableEditorProps = {
  markdownTransformers: customTransformers,
  onChange: handleChange,
  registerAPI: handleApi,
}
void composableEditorProps

const composableEditor = (
  <InklingComposableEditor
    markdownTransformers={customTransformers}
    onChange={handleChange}
    placeholderText="Start writing"
    registerAPI={handleApi}
  />
)
void composableEditor

const editorProps: InklingEditorProps = { onChange: handleChange, readOnly: true }
void editorProps

const editor = <InklingEditor onChange={handleChange} registerAPI={handleApi} />
void editor

const nestedComposerProps: InklingNestedComposerProps = {
  initialEditor: nestedEditor,
  initialNodes: BASIC_NODES,
  skipEditableListener: true,
}
void nestedComposerProps

const nestedComposer = (
  <InklingNestedComposer initialEditor={nestedEditor} initialNodes={BASIC_NODES} skipEditableListener={true}>
    {null}
  </InklingNestedComposer>
)
void nestedComposer

const emailEditorProps: EmailEditorProps = {
  initialEditorState: serializedState,
  markdownTransformers: BASIC_TRANSFORMERS,
  onChange: handleChange,
  registerAPI: handleApi,
}
void emailEditorProps

const emailEditor = <EmailEditor initialEditorState={serializedState} onChange={handleChange} placeholderText="Write" />
void emailEditor

// --- negative cases ---------------------------------------------------------

// @ts-expect-error - node lists must contain Lexical node classes or replacements
const invalidNodes = <InklingComposer nodes={[42]} />
void invalidNodes

// @ts-expect-error - markdown transformers must be Lexical Transformers
const invalidTransformer = <InklingComposableEditor markdownTransformers={[{ notATransformer: true }]} />
void invalidTransformer

// @ts-expect-error - onChange receives a SerializedEditorState, not a string
const wrongCallback = <InklingEditor onChange={(state: string) => void state} />
void wrongCallback
