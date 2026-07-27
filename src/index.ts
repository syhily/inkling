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
  CODE_BLOCK as CODE_BLOCK_TRANSFORMER,
  DEFAULT_TRANSFORMERS,
  ELEMENT_TRANSFORMERS,
  HR as HR_TRANSFORMER,
} from '@/markdown/transformers'
import { BASIC_TRANSFORMERS, MINIMAL_TRANSFORMERS } from '@/markdown/transformers-core'
/* Nodes */
import BASIC_NODES from '@/nodes/BasicNodes'
import DEFAULT_NODES, { EDITOR_BASE_NODES } from '@/nodes/DefaultNodes'
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
import FootnotePlugin from '@/plugins/FootnotePlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import HtmlOutputPlugin from '@/plugins/HtmlOutputPlugin'
import InklingBehaviourPlugin from '@/plugins/InklingBehaviourPlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import InklingSnippetPlugin from '@/plugins/InklingSnippetPlugin'
import MarkdownShortcutPlugin from '@/plugins/MarkdownShortcutPlugin'
import MathInlinePlugin from '@/plugins/MathInlinePlugin'
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
  ImageLibrarySettings,
  LibraryImageItem,
  LibrarySettings,
  LinkingSettings,
  MathSettings,
  SnippetItem,
  SnippetSettings,
  UploadSettings,
} from '@/context/InklingHostIntegrationContext'
export type { ListOptionItem, SearchResult } from '@/hooks/useSearchLinks'
export type { PinturaConfig } from '@/hooks/usePinturaEditor'

/* Labels (docs/kobato-fit-plan.md C7): the closed labels table a host
 * overrides through <InklingComposer labels={...}> — partial table in,
 * English fallback for missing keys. */
export { DEFAULT_LABELS } from '@/labels/inkling-labels'
export type { InklingLabels, InklingLabelsInput } from '@/labels/inkling-labels'

export type { AudioNodeDataset } from '@/nodes/AudioNode'
export { INSERT_AUDIO_COMMAND } from '@/nodes/AudioNode'
export type { CodeBlockNodeDataset } from '@/nodes/CodeBlockNode'
export { INSERT_CODE_BLOCK_COMMAND } from '@/nodes/CodeBlockNode'
export type { HtmlNodeDataset } from '@/nodes/HtmlNode'
export { INSERT_HTML_COMMAND } from '@/nodes/HtmlNode'
export { INSERT_HORIZONTAL_RULE_COMMAND } from '@/nodes/HorizontalRuleNode'
export type { MathNodeDataset } from '@/nodes/MathNode'
export { INSERT_MATH_COMMAND } from '@/nodes/MathNode'

/* Inline math (not a card — cards are block-level): the host owns the inline
 * editing UI and listens for EDIT_MATH_INLINE_COMMAND. */
export { $createMathInlineNode, $isMathInlineNode, MathInlineNode } from '@/nodes/math/MathInlineNode'
export type { MathInlineDataset, SerializedMathInlineNode } from '@/nodes/math/MathInlineNode'
export { EDIT_MATH_INLINE_COMMAND } from '@/plugins/behaviour/math-inline'

/* Footnotes: the inline ref (a TextNode entity — its text IS the citation
 * index) and the menu-less definition card, created and ordered by the
 * footnote behaviour module (`FootnotePlugin` wires it on a surface). */
export { $createFootnoteRefNode, $isFootnoteRefNode, FootnoteRefNode } from '@/nodes/footnote/FootnoteRefNode'
export type { SerializedFootnoteRefNode } from '@/nodes/footnote/FootnoteRefNode'
export {
  $createFootnoteDefinitionNode,
  $isFootnoteDefinitionNode,
  FootnoteDefinitionNode,
} from '@/nodes/FootnoteDefinitionNode'
export type { FootnoteDefinitionNodeDataset } from '@/nodes/FootnoteDefinitionNode'

/* Host card pipeline (CONTEXT.md: "host card"): `defineCard` declares a card
 * once and every derived view (node class, menus, decorate target, insert
 * registrar, toolbar label, markdown fence) picks it up;
 * `generateDecoratorNode` builds the base node the declaration names.
 * `EDITOR_BASE_NODES` is the non-card run a subset surface composes with its
 * picked card classes instead of forking DEFAULT_NODES. */
export { defineCard } from '@/nodes/cards/host-cards'
export type { HostCard, HostCardMenuEntrySpec, HostCardSpec } from '@/nodes/cards/host-cards'
export { generateDecoratorNode } from '@/nodes/base/generate-decorator-node'
export type {
  CardSpecFieldMap,
  CardSpecFieldNames,
  DecoratorNodeProperty,
  NestedEditorSpec,
  TransientPropSpec,
} from '@/nodes/base/generate-decorator-node'
export { InklingDecoratorNode } from '@/nodes/base/InklingDecoratorNode'
export type { CardNodeClass } from '@/nodes/assemble-card-node'

/* Media library (docs/kobato-fit-plan.md C8): the headless state machine
 * behind the image-library picker, generic over the item shape so a host's
 * own library pickers (e.g. a music library on a host card) reuse the same
 * machine. `LibrarySelector`/`LibraryPlugin` stay internal — image-shaped
 * UI, not a public contract. */
export { createLibraryBrowser } from '@/utils/services/library-browser'
export type {
  LibraryBrowser,
  LibraryBrowserIntent,
  LibraryBrowserSnapshot,
  LibraryScheduler,
} from '@/utils/services/library-browser'

export * from '@/utils'
export { lexicalStateToMarkdown, markdownToLexicalState } from '@/markdown'
export type { MarkdownRoundTripOptions } from '@/markdown/round-trip'
export {
  htmlToLexicalState,
  lexicalStateToHtml,
  lexicalStateToPlainText,
  DEFAULT_HTML_NODES,
} from '@/html/headless-html'
export type {
  HtmlToLexicalStateOptions,
  LexicalStateToHtmlOptions,
  LexicalStateToPlainTextOptions,
} from '@/html/headless-html'
export type { ExportDOMDom } from '@/nodes/base'

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
  FootnotePlugin,
  HorizontalRulePlugin,
  HtmlOutputPlugin,
  InklingBehaviourPlugin,
  InklingSelectorPlugin,
  InklingSnippetPlugin,
  ListPlugin,
  MarkdownShortcutPlugin,
  MathInlinePlugin,
  PlusCardMenuPlugin,
  ReplacementStringsPlugin,
  RestrictContentPlugin,
  SlashCardMenuPlugin,
  TKCountPlugin,
  WordCountPlugin,
  DEFAULT_NODES,
  EDITOR_BASE_NODES,
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
