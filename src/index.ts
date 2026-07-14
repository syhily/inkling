import { ListPlugin } from '@lexical/react/LexicalListPlugin'

/* Types re-exported from bundled runtimes so consumers can name the shapes
 * that appear in public prop/command signatures without installing Lexical. */
export type { Transformer } from '@lexical/markdown'
export type { EditorState, LexicalEditor, SerializedEditorState } from 'lexical'

/* Components */
import DesignSandbox from '@/components/DesignSandbox'
import EmailEditor, { EMAIL_EDITOR_CARD_CONFIG, getEmailEditorCardConfig } from '@/components/EmailEditor'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import InklingComposableEditor from '@/components/InklingComposableEditor'
import InklingComposer from '@/components/InklingComposer'
import InklingEditor from '@/components/InklingEditor'
import InklingNestedComposer from '@/components/InklingNestedComposer'
/* Nodes */
import BASIC_NODES from '@/nodes/BasicNodes'
import DEFAULT_NODES from '@/nodes/DefaultNodes'
import EMAIL_EDITOR_NODES from '@/nodes/EmailEditorNodes'
import EMAIL_NODES from '@/nodes/EmailNodes'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
/* Plugins */
import AllDefaultPlugins from '@/plugins/AllDefaultPlugins'
import AudioPlugin from '@/plugins/AudioPlugin'
import BookmarkPlugin from '@/plugins/BookmarkPlugin'
import ButtonPlugin from '@/plugins/ButtonPlugin'
import CalloutPlugin from '@/plugins/CalloutPlugin'
import CardMenuPlugin from '@/plugins/CardMenuPlugin'
import DragDropPastePlugin from '@/plugins/DragDropPastePlugin'
import DragDropReorderPlugin from '@/plugins/DragDropReorderPlugin'
import EmEnDashPlugin from '@/plugins/EmEnDashPlugin'
import EmojiPickerPlugin from '@/plugins/EmojiPickerPlugin'
import ExternalControlPlugin from '@/plugins/ExternalControlPlugin'
import FilePlugin from '@/plugins/FilePlugin'
import FloatingToolbarPlugin from '@/plugins/FloatingToolbarPlugin'
import GalleryPlugin from '@/plugins/GalleryPlugin'
import HeaderPlugin from '@/plugins/HeaderPlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import HtmlOutputPlugin from '@/plugins/HtmlOutputPlugin'
import HtmlPlugin from '@/plugins/HtmlPlugin'
import ImagePlugin from '@/plugins/ImagePlugin'
import InklingBehaviourPlugin from '@/plugins/InklingBehaviourPlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import InklingSnippetPlugin from '@/plugins/InklingSnippetPlugin'
/* Transformers */
import MarkdownShortcutPlugin, {
  BASIC_TRANSFORMERS,
  CODE_BLOCK as CODE_BLOCK_TRANSFORMER,
  DEFAULT_TRANSFORMERS,
  ELEMENT_TRANSFORMERS,
  EMAIL_TRANSFORMERS,
  HR as HR_TRANSFORMER,
  MINIMAL_TRANSFORMERS,
} from '@/plugins/MarkdownShortcutPlugin'
import PlusCardMenuPlugin from '@/plugins/PlusCardMenuPlugin'
import ReplacementStringsPlugin from '@/plugins/ReplacementStringsPlugin'
import RestrictContentPlugin from '@/plugins/RestrictContentPlugin'
import SlashCardMenuPlugin from '@/plugins/SlashCardMenuPlugin'
import TKCountPlugin from '@/plugins/TKCountPlugin'
import TogglePlugin from '@/plugins/TogglePlugin'
import VideoPlugin from '@/plugins/VideoPlugin'
import WordCountPlugin from '@/plugins/WordCountPlugin'

/* Exports ------------------------------------------------------------------ */

export type { EmailEditorProps } from '@/components/EmailEditor'
export type { InklingComposableEditorProps } from '@/components/InklingComposableEditor'
export type { InklingComposerProps, InklingInitialEditorState } from '@/components/InklingComposer'
export type { InklingEditorProps } from '@/components/InklingEditor'
export type { InklingNestedComposerProps } from '@/components/InklingNestedComposer'
export type { ExternalControlAPI } from '@/plugins/ExternalControlPlugin'

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
  DesignSandbox,
  EmailEditor,
  InklingComposableEditor,
  InklingComposer,
  InklingEditor,
  InklingNestedComposer,
  InklingCardWrapper,
  AllDefaultPlugins,
  AudioPlugin,
  BookmarkPlugin,
  ButtonPlugin,
  CalloutPlugin,
  CardMenuPlugin,
  DragDropPastePlugin,
  DragDropReorderPlugin,
  EmEnDashPlugin,
  EmojiPickerPlugin,
  ExternalControlPlugin,
  FilePlugin,
  FloatingToolbarPlugin,
  GalleryPlugin,
  HeaderPlugin,
  HorizontalRulePlugin,
  HtmlOutputPlugin,
  HtmlPlugin,
  ImagePlugin,
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
  TogglePlugin,
  VideoPlugin,
  WordCountPlugin,
  DEFAULT_NODES,
  BASIC_NODES,
  EMAIL_EDITOR_NODES,
  EMAIL_NODES,
  MINIMAL_NODES,
  EMAIL_EDITOR_CARD_CONFIG,
  ELEMENT_TRANSFORMERS,
  HR_TRANSFORMER,
  CODE_BLOCK_TRANSFORMER,
  DEFAULT_TRANSFORMERS,
  BASIC_TRANSFORMERS,
  EMAIL_TRANSFORMERS,
  MINIMAL_TRANSFORMERS,
  getEmailEditorCardConfig,
}

export const version = __APP_VERSION__ ? __APP_VERSION__ : 'development'
