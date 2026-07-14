/**
 * Clean-consumer type fixture for the published @inkling/editor declaration.
 *
 * This file is installed into isolated temp projects in
 * scripts/verify-packed-types.mjs and type-checked against the packed tarball
 * only — it must not import from workspace aliases or undocumented paths.
 */
import {
  BASIC_TRANSFORMERS,
  type ExternalControlAPI,
  InklingComposer,
  InklingComposableEditor,
  type InklingComposableEditorProps,
  InklingEditor,
  type InklingEditorProps,
  type InklingInitialEditorState,
  INSERT_AUDIO_COMMAND,
  type LexicalEditor,
  type SerializedEditorState,
  type AudioNodeDataset,
} from '@inkling/editor'

declare const serializedState: SerializedEditorState
declare const handleChange: (editorState: SerializedEditorState) => void
declare const handleApi: (api: ExternalControlAPI | null) => void
declare const editor: LexicalEditor
declare const file: File

// --- positive cases ---------------------------------------------------------

const stateFromString: InklingInitialEditorState =
  '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}'
const stateFromObject: InklingInitialEditorState = serializedState
const stateFromNull: InklingInitialEditorState = null
void stateFromString
void stateFromObject
void stateFromNull

const editorProps: InklingEditorProps = { onChange: handleChange, readOnly: true }
void editorProps

const composer = (
  <InklingComposer initialEditorState={serializedState} nodes={[]} onError={(error) => void error}>
    {null}
  </InklingComposer>
)
void composer

const composableProps: InklingComposableEditorProps = {
  markdownTransformers: BASIC_TRANSFORMERS,
  onChange: handleChange,
  registerAPI: handleApi,
}
void composableProps

const composableEditor = (
  <InklingComposableEditor
    markdownTransformers={BASIC_TRANSFORMERS}
    onChange={handleChange}
    placeholderText="Start writing"
    registerAPI={handleApi}
  />
)
void composableEditor

const typedInsertPayload: AudioNodeDataset = {
  src: 'https://example.com/audio.mp3',
  initialFile: file,
}
editor.dispatchCommand(INSERT_AUDIO_COMMAND, typedInsertPayload)

// --- negative cases ---------------------------------------------------------

// @ts-expect-error - onChange receives a SerializedEditorState, not a string
const wrongCallback = <InklingEditor onChange={(state: string) => void state} />
void wrongCallback

// @ts-expect-error - AudioNodeDataset.src must be a string
const badAudioPayload: AudioNodeDataset = { src: 123 }
void badAudioPayload

// @ts-expect-error - INSERT_AUDIO_COMMAND payload must match AudioNodeDataset
editor.dispatchCommand(INSERT_AUDIO_COMMAND, { html: '<p>not audio</p>' })
