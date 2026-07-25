import { ListPlugin } from '@lexical/react/LexicalListPlugin'

/* Types re-exported from bundled runtimes so consumers can name the shapes
 * that appear in public prop/command signatures without installing Lexical. */
export type { Transformer } from '@lexical/markdown'
export type { EditorState, LexicalEditor, SerializedEditorState } from 'lexical'

/* Components */
import InklingComposableEditor from '@/components/InklingComposableEditor'
import InklingComposer from '@/components/InklingComposer'
import InklingEditor from '@/components/InklingEditor'
import InklingNestedComposer from '@/components/InklingNestedComposer'
import InklingSurface from '@/components/InklingSurface'
/* Transformers */
import {
  BASIC_TRANSFORMERS,
  CODE_BLOCK as CODE_BLOCK_TRANSFORMER,
  DEFAULT_TRANSFORMERS,
  ELEMENT_TRANSFORMERS,
  HR as HR_TRANSFORMER,
  MINIMAL_TRANSFORMERS,
} from '@/markdown/transformers'
/* Nodes */
import BASIC_NODES from '@/nodes/BasicNodes'
import DEFAULT_NODES from '@/nodes/DefaultNodes'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
/* Plugins */
import CardInsertPlugin from '@/plugins/CardInsertPlugin'
import CardMenuPlugin from '@/plugins/CardMenuPlugin'
import DefaultFeaturePlugins from '@/plugins/DefaultFeaturePlugins'
import DragDropPastePlugin from '@/plugins/DragDropPastePlugin'
import DragDropReorderPlugin from '@/plugins/DragDropReorderPlugin'
import EmEnDashPlugin from '@/plugins/EmEnDashPlugin'
import EmojiPickerPlugin from '@/plugins/EmojiPickerPlugin'
import ExternalControlPlugin from '@/plugins/ExternalControlPlugin'
import FloatingToolbarPlugin from '@/plugins/FloatingToolbarPlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import HtmlOutputPlugin from '@/plugins/HtmlOutputPlugin'
import InklingBehaviourPlugin from '@/plugins/InklingBehaviourPlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import InklingSnippetPlugin from '@/plugins/InklingSnippetPlugin'
import MarkdownShortcutPlugin from '@/plugins/MarkdownShortcutPlugin'
import PlusCardMenuPlugin from '@/plugins/PlusCardMenuPlugin'
import ReplacementStringsPlugin from '@/plugins/ReplacementStringsPlugin'
import RestrictContentPlugin from '@/plugins/RestrictContentPlugin'
import SlashCardMenuPlugin from '@/plugins/SlashCardMenuPlugin'
import TKCountPlugin from '@/plugins/TKCountPlugin'
import WordCountPlugin from '@/plugins/WordCountPlugin'

/* Exports ------------------------------------------------------------------ */

export type { InklingComposableEditorProps } from '@/components/InklingComposableEditor'
export type { InklingComposerProps, InklingInitialEditorState } from '@/components/InklingComposer'
export type { InklingEditorProps } from '@/components/InklingEditor'
export type { InklingNestedComposerProps } from '@/components/InklingNestedComposer'
export type { InklingSurfaceProps } from '@/components/InklingSurface'
export type { ExternalControlAPI } from '@/plugins/ExternalControlPlugin'

/* Host-facing config types: the shapes a host names when wiring
 * <InklingComposer cardConfig={...} fileUploader={...}> and its callbacks. */
export type {
  BookmarkEmbedOptions,
  BookmarkEmbedResponse,
  CardConfig,
  FileUploader,
  FileUploaderInput,
  GifSettings,
  LinkingSettings,
  SnippetItem,
  SnippetSettings,
  UploadSettings,
} from '@/context/InklingHostIntegrationContext'
export type { ListOptionItem, SearchResult } from '@/hooks/useSearchLinks'
export type { PinturaConfig } from '@/hooks/usePinturaEditor'

export type { AudioNodeDataset } from '@/nodes/AudioNode'
export { INSERT_AUDIO_COMMAND } from '@/nodes/AudioNode'
export type { CodeBlockNodeDataset } from '@/nodes/CodeBlockNode'
export { INSERT_CODE_BLOCK_COMMAND } from '@/nodes/CodeBlockNode'
export type { HtmlNodeDataset } from '@/nodes/HtmlNode'
export { INSERT_HTML_COMMAND } from '@/nodes/HtmlNode'
export { INSERT_HORIZONTAL_RULE_COMMAND } from '@/nodes/HorizontalRuleNode'

export * from '@/utils'
export { lexicalStateToMarkdown, markdownToLexicalState } from '@/markdown'

export {
  InklingComposableEditor,
  InklingComposer,
  InklingEditor,
  InklingNestedComposer,
  InklingSurface,
  DefaultFeaturePlugins,
  CardInsertPlugin,
  CardMenuPlugin,
  DragDropPastePlugin,
  DragDropReorderPlugin,
  EmEnDashPlugin,
  EmojiPickerPlugin,
  ExternalControlPlugin,
  FloatingToolbarPlugin,
  HorizontalRulePlugin,
  HtmlOutputPlugin,
  InklingBehaviourPlugin,
  InklingSelectorPlugin,
  InklingSnippetPlugin,
  ListPlugin,
  MarkdownShortcutPlugin,
  PlusCardMenuPlugin,
  ReplacementStringsPlugin,
  RestrictContentPlugin,
  SlashCardMenuPlugin,
  TKCountPlugin,
  WordCountPlugin,
  DEFAULT_NODES,
  BASIC_NODES,
  MINIMAL_NODES,
  ELEMENT_TRANSFORMERS,
  HR_TRANSFORMER,
  CODE_BLOCK_TRANSFORMER,
  DEFAULT_TRANSFORMERS,
  BASIC_TRANSFORMERS,
  MINIMAL_TRANSFORMERS,
}

export const version = __APP_VERSION__
