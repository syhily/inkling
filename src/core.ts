// The `./core` subpath entry (plan C5) — the comment-level composition
// surface. Everything here is card-free: no DEFAULT_NODES, no card shims or
// INSERT_*_COMMAND, no feature plugins (emoji/at-link/snippet/selector/
// card-menu), no markdown round-trip, no HtmlOutputPlugin. The `.` entry is
// untouched and stays the full bundle.
//
// The composition contract changes two defaults versus `.`:
// - `InklingComposer` is the core variant — `nodes` is REQUIRED (the host
//   names its node set instead of defaulting to the full card set).
// - `MarkdownShortcutPlugin`'s default transformer set is
//   MINIMAL_TRANSFORMERS everywhere; a bare InklingSurface gets no
//   heading/list/fence shortcuts unless the host passes them explicitly.

import type { Transformer } from '@lexical/markdown'
import type { EditorState, LexicalEditor, SerializedEditorState } from 'lexical'

/* Components */
import InklingComposableEditor from '@/components/InklingComposableEditor'
import InklingComposer from '@/components/InklingComposerBase'
import InklingSurface from '@/components/InklingSurface'
/* Transformers (card-free sets only) */
import { BASIC_TRANSFORMERS, MINIMAL_TRANSFORMERS } from '@/markdown/transformers-core'
/* Nodes (card-free sets only) */
import BASIC_NODES from '@/nodes/BasicNodes'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
/* Plugins */
import RestrictContentPlugin from '@/plugins/RestrictContentPlugin'

/* Exports ------------------------------------------------------------------ */

export type { InklingComposableEditorProps } from '@/components/InklingComposableEditor'
export type { InklingComposerProps, InklingInitialEditorState } from '@/components/InklingComposerBase'
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

/* Labels (docs/kobato-fit-plan.md C7): exported from ./core too because
 * `labels` is a core-composer prop. */
export { DEFAULT_LABELS } from '@/labels/inkling-labels'
export type { InklingLabels, InklingLabelsInput } from '@/labels/inkling-labels'

/* Media library (docs/kobato-fit-plan.md C8): the picker's headless state
 * machine rides the core entry too — a host building its own library-backed
 * card (e.g. music) on the core composer reuses it. */
export { createLibraryBrowser } from '@/utils/services/library-browser'
export type {
  LibraryBrowser,
  LibraryBrowserIntent,
  LibraryBrowserSnapshot,
  LibraryScheduler,
} from '@/utils/services/library-browser'

/* Types re-exported from the bundled Lexical runtime so consumers can name
 * the shapes that appear in public prop signatures without installing
 * Lexical. */
export type { Transformer, EditorState, LexicalEditor, SerializedEditorState }

export {
  InklingComposableEditor,
  InklingComposer,
  InklingSurface,
  RestrictContentPlugin,
  BASIC_NODES,
  MINIMAL_NODES,
  BASIC_TRANSFORMERS,
  MINIMAL_TRANSFORMERS,
}

export const version = __APP_VERSION__
