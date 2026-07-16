/**
 * Clean-consumer type fixture for the published @inkling/editor declaration.
 *
 * This file is installed into isolated temp projects in
 * scripts/verify-packed-types.mjs and type-checked against the packed tarball
 * only — it must not import from workspace aliases or undocumented paths.
 */
import {
  BASIC_TRANSFORMERS,
  type CardConfig,
  // @ts-expect-error - DesignSandbox was removed from the public barrel in 2.0.0
  DesignSandbox,
  type ExternalControlAPI,
  type FileUploader,
  type FileUploaderInput,
  type GifSettings,
  // @ts-expect-error - InklingCardWrapper was removed from the public barrel in 2.0.0
  InklingCardWrapper,
  InklingComposer,
  InklingComposableEditor,
  type InklingComposableEditorProps,
  InklingEditor,
  type InklingEditorProps,
  type InklingInitialEditorState,
  INSERT_AUDIO_COMMAND,
  type LexicalEditor,
  type LinkingSettings,
  type ListOptionItem,
  type SearchResult,
  type SerializedEditorState,
  type SnippetItem,
  type SnippetSettings,
  type UploadSettings,
  type VisibilitySettings,
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

// --- host-config type family (2.0.0) -----------------------------------------

const gifSettings: GifSettings = {
  klipy: { apiKey: 'key', contentFilter: 'high' },
  tenor: { googleApiKey: 'key' },
}
const snippetItems: SnippetItem[] = [{ name: 'welcome', value: '{"root":{}}' }]
const snippetSettings: SnippetSettings = {
  snippets: snippetItems,
  createSnippet: ({ name, value }) => void (name + value),
  deleteSnippet: ({ name }) => Promise.resolve(void name),
}
const linkingSettings: LinkingSettings = {
  fetchAutocompleteLinks: () => Promise.resolve(undefined),
  fetchEmbed: (href, opts) => Promise.resolve({ href, opts }),
  searchLinks: (term) => Promise.resolve(term ? [] : undefined),
  siteUrl: 'https://example.com',
}
const visibilitySettings: VisibilitySettings = { stripeEnabled: true, visibilitySettings: 'web' }
const uploadSettings: UploadSettings = { image: { allowedWidths: ['regular'] }, pinturaConfig: {} }

const searchResult: SearchResult = { label: 'Pages', items: [{ title: 'Home', url: 'https://example.com' }] }
const listOption: ListOptionItem = {
  label: 'Home',
  value: 'https://example.com',
  Icon: () => null,
  highlight: false,
  type: 'url',
}

const fileUploader: FileUploader = {
  useFileUpload: () => ({ upload: () => Promise.resolve(undefined) }),
  fileTypes: { image: { mimeTypes: ['image/png'] } },
}
const fileUploaderInput: FileUploaderInput = { fileTypes: { image: { mimeTypes: ['image/png'] } } }

// a full closed CardConfig literal is accepted on InklingComposer
const cardConfig: CardConfig = {
  ...gifSettings,
  ...linkingSettings,
  ...snippetSettings,
  ...uploadSettings,
  ...visibilitySettings,
  post: { displayName: 'post' },
}
const composerWithConfig = (
  <InklingComposer cardConfig={cardConfig} fileUploader={fileUploader}>
    {null}
  </InklingComposer>
)
void composerWithConfig
void searchResult
void listOption
void fileUploaderInput
void DesignSandbox
void InklingCardWrapper

// @ts-expect-error - unknown cardConfig keys are rejected by the closed type
const composerWithUnknownKey = <InklingComposer cardConfig={{ membersEnabled: true }} />
void composerWithUnknownKey
