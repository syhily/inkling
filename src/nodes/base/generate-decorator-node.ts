import type {
  DOMConversionMap,
  EditorState,
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
  SerializedLexicalNode,
} from 'lexical'

import { $generateHtmlFromNodes } from '@lexical/html'

import type { ExportDOMOptions, ExportDOMOutput } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'

import { cleanBasicHtml, type CleanBasicHtmlOptions } from '@/html/clean-basic-html'
import { buildImportConversions, validateImportSpec, type CardImportSpec } from '@/nodes/base/import-spec'
import { InklingDecoratorNode } from '@/nodes/base/InklingDecoratorNode'
import { createRenderContext } from '@/nodes/base/render-context'
import readTextContent from '@/nodes/base/utils/read-text-content'
import { populateNestedEditor, setupNestedEditor } from '@/utils/nested-editors'

// The render context is the ONLY export-time view a render fn receives
// besides the node: render policy (URL, sanitization, feature flags) and the
// image/markdown data options all live behind it
// (plans 040/042). The public `exportDOM(editor, options)` entry point
// builds the context from the options bag; the bag itself never reaches the
// render fn. The node parameter is typed as the generated instance itself
// (below), so a render fn's declared node view must be a shape the instance
// genuinely satisfies — strict parameter contravariance rejects narrower
// fictions (e.g. `width: number` where the dataset is `number | null`).
type RenderFn<TNode, TOutput extends ExportDOMOutput = ExportDOMOutput> = (
  node: TNode,
  context: RenderContext,
) => TOutput
type WidenLiteral<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? U[]
        : T
/**
 * Validates the required arguments passed to `generateDecoratorNode`
 */
function validateArguments(nodeType: string, properties: readonly DecoratorNodeProperty[]) {
  /* c8 ignore start */
  if (!nodeType) {
    throw new Error('[generateDecoratorNode] A unique "nodeType" should be provided')
  }

  properties.forEach((prop: DecoratorNodeProperty) => {
    if (!('name' in prop) || !('default' in prop)) {
      throw new Error('[generateDecoratorNode] Properties should have both "name" and "default" attributes.')
    }

    if (prop.urlType && !['url', 'html', 'markdown'].includes(prop.urlType)) {
      throw new Error('[generateDecoratorNode] "urlType" should be either "url", "html" or "markdown"')
    }

    if ('wordCount' in prop && typeof prop.wordCount !== 'boolean') {
      throw new Error('[generateDecoratorNode] "wordCount" should be of boolean type.')
    }
  })
  /* c8 ignore stop */
}

/**
 * One declarative property of a generated card node. `name` and `default`
 * drive the dataset typing (via `DecoratorNodeValueMap`); `default` also
 * seeds the constructor and `getPropertyDefaults`. `urlType` marks the
 * property as URL-bearing — 'url' when it holds only a URL, 'html' or
 * 'markdown' when its content may contain URLs — for the out-of-repo
 * `urlTransformMap` consumer, and `urlPath` remaps the key used there.
 * `wordCount` includes the property in the node's text content.
 */
export interface DecoratorNodeProperty<Name extends string = string, Default = unknown> {
  name: Name
  default: Default
  // validateArguments keeps the runtime throw for untyped consumers
  urlType?: 'url' | 'html' | 'markdown'
  urlPath?: string
  wordCount?: boolean
}

/**
 * One nested editor of a card spec (CONTEXT.md: "card spec"). Each entry
 * drives the full nested-editor trilogy on the generated node:
 *
 * - constructor: `setupNestedEditor` creates (or adopts a passed-in) editor
 *   instance on `__<name>`, and `populateNestedEditor` fills it from the
 *   `serializedKey` property's HTML when no editor instance was passed.
 * - `getDataset`: appends the client-side `<name>` key, plus the
 *   `<name>InitialState` key unless the spec sets
 *   `exposeInitialStateInDataset: false` (Header exposes the editors but not
 *   their initial states).
 * - `exportJSON`: re-serializes the editor's content back into the
 *   `serializedKey` property via `$generateHtmlFromNodes` + `cleanBasicHtml`
 *   (the editor's content may not be reflected in the data property).
 *
 * The spec is adopted per node class through the static `nestedEditors`
 * property, so a base node class stays editor-free while a wrapper subclass
 * turns the trilogy on. `nodes` are Lexical node-class arrays — the spec
 * stays React-free.
 */
export interface NestedEditorSpec {
  /** Dataset key for the editor instance; the node field is `__<name>` and the initial-state keys derive from it. */
  name: string
  /** The node's data property holding this editor's serialized HTML (e.g. `caption`). */
  serializedKey: string
  /** Node classes registered on the nested editor. */
  nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>
  /** `cleanBasicHtml` options used when re-serializing the editor on `exportJSON`. */
  cleanBasicHtml?: CleanBasicHtmlOptions
  /** Whether `getDataset` exposes the `<name>InitialState` key (default true). */
  exposeInitialStateInDataset?: boolean
}

// type-level brand key for the nested-editor value carrier below — never
// assigned at runtime, so a `declare`d unique symbol keeps it off every
// object shape while staying derivable in type space. Exported so inferred
// entry types can name it through declaration bundling; the `declare` emits
// no runtime binding
export declare const nestedEditorValueType: unique symbol

/**
 * The type-level carrier recording one nested-editor entry's `__<name>`
 * field value type: `LexicalEditor` for an editor that lives for the node's
 * whole lifetime, `LexicalEditor | null` for one the markdown round-trip
 * detaches (`$detachNestedEditorsForRoundTrip` nulls every spec-declared
 * editor on a fence-imported card) or the export path drops. Carried as a
 * branded property because a spec entry's inferred type is the only channel
 * `CardSpecFieldMap` can derive from — a `satisfies` target's type arguments
 * never reach it.
 */
export interface NestedEditorValueCarrier<TEditor extends LexicalEditor | null> {
  readonly [nestedEditorValueType]: TEditor
}

/**
 * Builds a nested-editor spec entry whose editor field is nullable (see
 * NestedEditorValueCarrier): the markdown round-trip / headless export paths
 * detach it. Entries built as plain literals default to a non-null
 * `LexicalEditor` field. Runtime-identical to the literal — the brand is
 * type-space only.
 */
export function nullableNestedEditor<const TName extends string>(
  spec: Omit<NestedEditorSpec, 'name'> & { name: TName },
): NestedEditorSpec & { name: TName } & NestedEditorValueCarrier<LexicalEditor | null> {
  return spec as NestedEditorSpec & { name: TName } & NestedEditorValueCarrier<LexicalEditor | null>
}

const NO_NESTED_EDITORS: readonly NestedEditorSpec[] = []

/**
 * Reads the nested-editor spec off the node's actual class, so a subclass
 * adopts its own spec via `static nestedEditors` while the generated base
 * class (and spec-less subclasses) run no nested-editor behaviour.
 */
export function getNestedEditorSpecs(node: LexicalNode): readonly NestedEditorSpec[] {
  return (node.constructor as { nestedEditors?: readonly NestedEditorSpec[] }).nestedEditors ?? NO_NESTED_EDITORS
}

/**
 * One transient prop of a card spec (CONTEXT.md: "card spec") — a
 * client-side-only field that controls node behaviour (upload flow state
 * like `triggerFileDialog`/`initialFile`/`previewSrc`, or CodeBlock's
 * `_openInEditMode` edit-mode flag). Transient props are read from the
 * construction dataset, are never serialized to JSON, and are exposed in
 * `getDataset` only when the spec names a `datasetKey` (Image exposes
 * `__previewSrc`/`__triggerFileDialog`; its datasets flow through the
 * drag-and-drop payload path).
 *
 * The spec is adopted per node class through the static `transientProps`
 * property, so a base node class stays free of upload-flow state while a
 * wrapper subclass turns the props on — the generated constructor
 * initializes each `__<name>` field from the dataset it receives.
 */
export interface TransientPropSpec {
  /** The construction-dataset key the initial value is read from (e.g. `triggerFileDialog`, `_openInEditMode`). */
  name: string
  /** The node's private field; defaults to `__${name}`. */
  privateName?: string
  /** Computes the field's initial value from the construction dataset (defaults to `dataset[name]`). */
  initial?: (dataset: Record<string, unknown>) => unknown
  /** Key under which `getDataset` re-exposes the current field value, if any. */
  datasetKey?: string
}

const NO_TRANSIENT_PROPS: readonly TransientPropSpec[] = []

/**
 * Reads the transient-prop spec off the node's actual class, so a subclass
 * adopts its own spec via `static transientProps` while the generated base
 * class (and spec-less subclasses) run no transient-prop behaviour.
 */
function getTransientPropSpecs(node: LexicalNode): readonly TransientPropSpec[] {
  return (node.constructor as { transientProps?: readonly TransientPropSpec[] }).transientProps ?? NO_TRANSIENT_PROPS
}

function getTransientPropPrivateName(spec: TransientPropSpec): string {
  return spec.privateName ?? `__${spec.name}`
}

/**
 * The node's private field name for one transient-prop spec entry (the
 * `privateName` remap when present, else `__${name}`) — the type-level twin
 * of `getTransientPropPrivateName` above. Only literal when the spec array
 * was const-asserted (`as const satisfies readonly TransientPropSpec[]`), as
 * every card declaration does.
 */
export type TransientPropFieldName<Spec extends TransientPropSpec> = Spec extends {
  privateName: infer Name extends string
}
  ? Name
  : `__${Spec['name']}`

/**
 * The private field names one nested-editor spec entry drives: the editor
 * instance field `__<name>` and its `__<name>InitialState` companion (set
 * when the editor is populated from its serialized HTML — the pair exists on
 * the node regardless of `exposeInitialStateInDataset`, which only gates the
 * `getDataset` key).
 */
export type NestedEditorFieldNames<Spec extends NestedEditorSpec> =
  | `__${Spec['name']}`
  | `__${Spec['name']}InitialState`

/**
 * Every `__*` field name a card declaration's spec (CONTEXT.md: "card spec")
 * drives — transient props and nested editors together. Reads the spec
 * arrays off the declaration's own type, so the declaration files must keep
 * their spec arrays const-asserted (`as const satisfies …`) for the literal
 * names to survive. A spec-less declaration yields `never`.
 */
export type CardSpecFieldNames<D> =
  | (D extends { transientProps: infer Specs extends readonly TransientPropSpec[] }
      ? TransientPropFieldName<Specs[number]>
      : never)
  | (D extends { nestedEditors: infer Specs extends readonly NestedEditorSpec[] }
      ? NestedEditorFieldNames<Specs[number]>
      : never)

/**
 * The value type one transient-prop spec entry carries: the annotated return
 * type of its `initial` lambda. Every declaration entry provides an
 * `initial` — an entry that wants the default `dataset[name]` read spells it
 * out with its value type — so the spec is the single source of both the
 * field NAME and the field TYPE. An entry without `initial` derives
 * `unknown` (host specs stay loose).
 */
export type TransientPropValue<Spec> = Spec extends {
  initial: (dataset: Record<string, unknown>) => infer Value
}
  ? Value
  : unknown

/**
 * The value type one nested-editor spec entry carries: the carrier's brand
 * (`nestedEditorSpec`) when present, else a non-null `LexicalEditor` — the
 * constructor's nested-editor setup always assigns an editor, and only the
 * round-trip-detached / export-dropped editors ride the carrier.
 */
export type NestedEditorValue<Spec> = Spec extends NestedEditorValueCarrier<infer Value> ? Value : LexicalEditor

/**
 * The `__*` type map of a card node, DERIVED from its declaration's spec
 * (CONTEXT.md: "card declaration"): keys come from the spec names, value
 * types from the entries' own type carriers (the transient `initial`
 * lambda's return type, the nested-editor `nestedEditorSpec` brand) — the
 * spec is the single source of the whole transient/nested-editor field
 * vocabulary, and renaming or retyping a spec entry is a compile error at
 * every consumer. The map rides the assembled class's instance type
 * (`assembleCardNodeOnce` folds it in), so the shims are re-exports only.
 * The base classes keep their hand-written `declare __*` fields (a base
 * cannot import its declaration — the declaration imports the base); that
 * leg is pinned by `test/typecheck/card-spec-field-agreement.ts` and the
 * runtime agreement test in `test/unit/nodes/card-declarations.test.ts`.
 */
export type CardSpecFieldMap<D> = (D extends { transientProps: infer Specs extends readonly TransientPropSpec[] }
  ? { [Spec in Specs[number] as TransientPropFieldName<Spec>]: TransientPropValue<Spec> }
  : unknown) &
  (D extends { nestedEditors: infer Specs extends readonly NestedEditorSpec[] }
    ? { [Spec in Specs[number] as `__${Spec['name']}`]: NestedEditorValue<Spec> } & {
        [Spec in Specs[number] as `__${Spec['name']}InitialState`]: EditorState | undefined
      }
    : unknown)

export type DecoratorNodeValueMap<Props extends readonly DecoratorNodeProperty[]> = {
  [Prop in Props[number] as Prop['name']]: WidenLiteral<Prop['default']>
}

export type DecoratorNodeData<Props extends readonly DecoratorNodeProperty[]> = Partial<DecoratorNodeValueMap<Props>>

type GeneratedDecoratorNodeInstance<
  TDataset extends Record<string, unknown>,
  TOutput extends ExportDOMOutput = ExportDOMOutput,
> = {
  exportDOM(editor: LexicalEditor, options?: ExportDOMOptions): TOutput
} & GeneratedDecoratorNodeBase &
  TDataset &
  PrivateDatasetFields<TDataset>

/**
 * The node's private `__<name>` fields, derived from the declared dataset
 * properties: every `{ name: 'src' }` property is stored on (and readable
 * through) `__src` at the property's value type. This is what closes the
 * field seam — `__`-prefixed reads on a typed card node are checked against
 * the card's declared vocabulary instead of an open index signature.
 * Transient-prop and nested-editor fields (`__triggerFileDialog`,
 * `__captionEditor`, …) are per-class spec state, not dataset properties;
 * each card's shim type derives them from the declaration's spec one layer
 * up via `CardSpecFieldMap`.
 */
type PrivateDatasetFields<TDataset extends Record<string, unknown>> = {
  [K in keyof TDataset as `__${string & K}`]: TDataset[K]
}

// An intersection rather than Lexical's `Spread` utility: `Spread` isn't provably
// assignable to `SerializedLexicalNode` when TDataset is an unresolved generic, which
// breaks the `exportJSON` override inside `generateDecoratorNode`. The trade-off is
// that a dataset property colliding with `type`/`version` at an incompatible type
// produces `never` — keep such properties compatible (e.g. HeaderNode's `version: number`).
export type SerializedGeneratedDecoratorNode<TDataset extends Record<string, unknown> = Record<string, unknown>> =
  SerializedLexicalNode & TDataset

export interface GeneratedDecoratorNodeClass<
  TDataset extends Record<string, unknown>,
  TOutput extends ExportDOMOutput = ExportDOMOutput,
> {
  new (
    data?: Partial<TDataset> | Record<string, unknown>,
    key?: string,
  ): GeneratedDecoratorNodeInstance<TDataset, TOutput>
  prototype: GeneratedDecoratorNodeInstance<TDataset, TOutput>
  getType(): string
  clone(node: GeneratedDecoratorNodeInstance<TDataset, TOutput>): GeneratedDecoratorNodeInstance<TDataset, TOutput>
  transform(): null
  getPropertyDefaults(): TDataset
  readonly nestedEditors?: readonly NestedEditorSpec[]
  readonly transientProps?: readonly TransientPropSpec[]
  readonly urlTransformMap: Record<string, string | Record<string, string>>
  readonly importSpec: CardImportSpec | undefined
  importDOM(): DOMConversionMap | null
  importJSON(serializedNode: Record<string, unknown>): GeneratedDecoratorNodeInstance<TDataset, TOutput>
}

// Type-only view of the generated node's instance side, used in the instance
// intersection above and by consumers holding a card node without its
// concrete dataset type. Extending InklingDecoratorNode keeps generated nodes
// LexicalNode-typed while declaring the generated members. This cannot be a
// merged declaration on the generator's real class: that class is
// function-local and its dataset members depend on the function's type
// parameters, which merged declarations cannot capture. The surface is
// declared here once, as types only — the generated class below supplies
// every member at runtime, and the return-site cast bridges the two.
//
// There is deliberately NO index signature here: field reads on a card node
// must resolve against the card's declared vocabulary (the dataset
// properties, mirrored as typed `__<name>` fields by `PrivateDatasetFields`,
// plus the per-class transient/nested-editor fields the wrapper node types
// declare). The function-local class below keeps its own index signature for
// its dynamic spec-driven assignments; it never reaches consumers because
// the class is only exposed through the `GeneratedDecoratorNodeClass` cast.
export interface GeneratedDecoratorNodeBase extends InklingDecoratorNode {
  getDataset(): Record<string, unknown>
  appendNestedEditorDataset<T extends Record<string, unknown>>(dataset: T): T
  appendTransientDataset<T extends Record<string, unknown>>(dataset: T): T
  serializeNestedEditorHtml<T extends Record<string, unknown>>(json: T): T
  exportJSON(): { type: string; version: number; [key: string]: unknown }
  isInklingCard(): true
  hasEditMode(): boolean
}

export function generateDecoratorNode<
  Props extends readonly DecoratorNodeProperty[] = readonly [],
  TOutput extends ExportDOMOutput = ExportDOMOutput,
>({
  nodeType,
  properties,
  defaultRenderFn,
  version = 1,
  importSpec,
}: {
  nodeType: string
  properties?: Props
  // The render fn's declared node type is checked against the generated
  // instance shape: it must accept the instance, so every key it reads must
  // exist on the node's dataset at the dataset's true (widened) type.
  defaultRenderFn?: RenderFn<GeneratedDecoratorNodeInstance<DecoratorNodeValueMap<Props>, TOutput>, TOutput>
  version?: number
  importSpec?: CardImportSpec
}): GeneratedDecoratorNodeClass<DecoratorNodeValueMap<Props>, TOutput> {
  type GeneratedDataset = DecoratorNodeValueMap<Props>

  const nodeProperties = properties ?? []

  validateArguments(nodeType, nodeProperties)

  // Adds a `privateName` field to the properties for convenience (e.g. `__name`):
  // properties: [{name: 'name', privateName: '__name', default: 'hello'}, {...}]
  const internalProps: (DecoratorNodeProperty & { privateName: string })[] = nodeProperties.map((prop) => ({
    ...prop,
    privateName: `__${prop.name}`,
  }))

  // The import spec names the card's DOM-import knowledge (CONTEXT.md:
  // "import spec"); validate it against the property list at class-creation
  // time so a read naming an unknown property fails loudly here.
  if (importSpec) {
    validateImportSpec(importSpec, internalProps, nodeType)
  }

  class GeneratedDecoratorNode extends InklingDecoratorNode {
    // Function-local escape hatch for the spec-driven dynamic assignments
    // below (`this[prop.privateName] = …`). Never visible to consumers: the
    // class is only exposed through the `GeneratedDecoratorNodeClass` cast,
    // whose instance side has no index signature (see the note on
    // `GeneratedDecoratorNodeBase`).
    [key: string]: unknown

    /**
     * The card's nested-editor spec entries (CONTEXT.md: "card spec"). Read
     * off the node's actual class at runtime, so subclasses adopt a spec by
     * redeclaring this static while the generated class itself (and spec-less
     * subclasses) run no nested-editor behaviour.
     */
    static nestedEditors: readonly NestedEditorSpec[] | undefined = undefined

    /**
     * The card's transient-prop spec entries (CONTEXT.md: "card spec"). Read
     * off the node's actual class at runtime, so subclasses adopt a spec by
     * redeclaring this static while the generated class itself (and spec-less
     * subclasses) run no transient-prop behaviour.
     */
    static transientProps: readonly TransientPropSpec[] | undefined = undefined

    /**
     * The card's import spec (CONTEXT.md: "import spec"), exposed as a static
     * so `importDOM` and the classification invariant read it off the class.
     * Undefined for cards whose structural parsing keeps a hand-written
     * parser.
     */
    static importSpec: CardImportSpec | undefined = importSpec

    /**
     * The derived DOM-import conversions (CONTEXT.md: "import spec"). Reads
     * the spec off `this` — the class Lexical invokes `importDOM` on — so
     * assembled/wrapper subclasses construct themselves and nested editors
     * keep populating on paste, and a subclass redeclaring `static importSpec`
     * derives from its own spec (the same adoption idiom as `nestedEditors`).
     * Spec-less classes (MarkdownNode; cards with structural hand-written
     * parsers, which override this) yield no conversions; Lexical tolerates
     * the null return.
     */
    static importDOM() {
      return this.importSpec ? buildImportConversions(this.importSpec, this) : null
    }

    // The import-conversion boundary constructs nodes from a plain payload
    // record (import-spec.ts); the union admits both that record and the
    // typed partial dataset without either side asserting the other.
    constructor(data: Partial<DecoratorNodeValueMap<Props>> | Record<string, unknown> = {}, key?: string) {
      super(key)
      const dataset = data as Record<string, unknown>
      internalProps.forEach((prop) => {
        this[prop.privateName] = dataset[prop.name] ?? prop.default
      })

      // set up nested editor instances, then populate them on initial
      // construction from their serialized HTML property when no editor
      // instance was passed in
      getNestedEditorSpecs(this).forEach((spec) => {
        const editorProperty = `__${spec.name}`
        const nestedEditor = setupNestedEditor({
          editor: dataset[spec.name] as LexicalEditor | undefined,
          nodes: spec.nodes,
        })
        this[editorProperty] = nestedEditor

        const serialized = dataset[spec.serializedKey]
        if (!dataset[spec.name] && serialized) {
          // store the initial state separately as it's passed in to
          // `<CollaborationPlugin />` when no YJS document exists
          this[`${editorProperty}InitialState`] = populateNestedEditor(nestedEditor, `${serialized}`)
        }
      })

      // initialize transient (client-side-only) props from the dataset;
      // runs after the nested editors, matching the historical order in
      // which wrapper constructors assigned these fields after super()
      getTransientPropSpecs(this).forEach((spec) => {
        this[getTransientPropPrivateName(spec)] = spec.initial ? spec.initial(dataset) : dataset[spec.name]
      })
    }

    /**
     * Returns the node's unique type
     * @extends DecoratorNode
     * @see https://lexical.dev/docs/concepts/nodes#extending-decoratornode
     * @returns {string}
     */
    static getType() {
      return nodeType
    }

    isInklingCard(): true {
      return true
    }

    /**
     * Creates a copy of an existing node with all its properties
     * @extends DecoratorNode
     * @see https://lexical.dev/docs/concepts/nodes#extending-decoratornode
     */
    static clone(node: GeneratedDecoratorNodeInstance<DecoratorNodeValueMap<Props>, TOutput>) {
      return new this(node.getDataset(), node.__key)
    }

    /**
     * Returns default values for any properties, allowing our editor code
     * to detect when a property has been changed
     */
    static getPropertyDefaults() {
      return internalProps.reduce((obj: Record<string, unknown>, prop) => {
        obj[prop.name] = prop.default
        return obj
      }, {}) as DecoratorNodeValueMap<Props>
    }

    /**
     * Transforms URLs contained in the payload to relative paths (`__INKLING_URL__/relative/path/`),
     * so that URLs to be changed without having to update the database
     *
     * Write-only in-repo: the consumer is an out-of-repo URL-rebasing pass that rewrites payload
     * URLs to `__INKLING_URL__/...` paths — the marker `src/nodes/base/utils/is-local-content-image.ts:4`
     * matches. Kept for that consumer; do not flag as dead.
     * @see upstream URL utilities
     */
    static get urlTransformMap() {
      const map: Record<string, string> = {}

      internalProps.forEach((prop) => {
        if (prop.urlType) {
          if (prop.urlPath) {
            map[prop.urlPath] = prop.urlType
          } else {
            map[prop.name] = prop.urlType
          }
        }
      })

      return map
    }

    /**
     * Convenience method to get all properties of the node
     * @returns {Object} - The node's properties
     */
    getDataset() {
      const self = this.getLatest()

      const dataset: Record<string, unknown> = {}
      internalProps.forEach((prop) => {
        dataset[prop.name] = self[prop.privateName]
      })

      return this.appendTransientDataset(this.appendNestedEditorDataset(dataset))
    }

    /**
     * Appends the client-side nested-editor keys (`<name>` and, unless the
     * spec opts out, `<name>InitialState`) to a dataset. Mutates and returns
     * the passed-in dataset; a no-op when the node's class has no
     * `nestedEditors` spec. Also called by hand-written `getDataset`
     * overrides (e.g. Bookmark's metadata remap).
     */
    appendNestedEditorDataset<T extends Record<string, unknown>>(dataset: T): T {
      const specs = getNestedEditorSpecs(this)
      if (specs.length > 0) {
        const target = dataset as Record<string, unknown>
        const self = this.getLatest()
        specs.forEach((spec) => {
          target[spec.name] = self[`__${spec.name}`]
          if (spec.exposeInitialStateInDataset !== false) {
            target[`${spec.name}InitialState`] = self[`__${spec.name}InitialState`]
          }
        })
      }
      return dataset
    }

    /**
     * Appends the transient-prop keys a spec exposes (only specs naming a
     * `datasetKey`) to a dataset, reading the current field off `this` —
     * mirroring the hand-written `getDataset` overrides this replaces
     * (Image exposed `dataset.__previewSrc = this.__previewSrc`). Mutates and
     * returns the passed-in dataset; a no-op when the node's class has no
     * `transientProps` spec.
     */
    appendTransientDataset<T extends Record<string, unknown>>(dataset: T): T {
      const specs = getTransientPropSpecs(this)
      if (specs.length > 0) {
        const target = dataset as Record<string, unknown>
        specs.forEach((spec) => {
          if (spec.datasetKey) {
            target[spec.datasetKey] = this[getTransientPropPrivateName(spec)]
          }
        })
      }
      return dataset
    }

    /**
     * Converts JSON to a Lexical node
     * @see https://lexical.dev/docs/concepts/serialization#lexicalnodeimportjson
     * @extends DecoratorNode
     * @param {Object} serializedNode - Lexical's representation of the node, in JSON format
     */
    static importJSON(serializedNode: Record<string, unknown>) {
      const data: Record<string, unknown> = {}

      internalProps.forEach((prop) => {
        data[prop.name] = serializedNode[prop.name]
      })

      // Trust boundary: payloads are trusted to match the declared prop types
      // (same model as Lexical's own importJSON and upstream koenig). Only
      // BookmarkNode validates its payload; a corrupt payload lands wrong-typed
      // values in `__` fields and fails later at read/export time.
      return new this(data as Partial<DecoratorNodeValueMap<Props>>)
    }

    /**
     * Serializes a Lexical node to JSON. The JSON content is then saved to the database.
     * @extends DecoratorNode
     * @see https://lexical.dev/docs/concepts/serialization#lexicalnodeexportjson
     */
    exportJSON(): SerializedGeneratedDecoratorNode<GeneratedDataset> {
      const dataset = {
        type: nodeType,
        version: version,
        ...internalProps.reduce((obj: Record<string, unknown>, prop) => {
          obj[prop.name] = this[prop.name]
          return obj
        }, {}),
      } as SerializedGeneratedDecoratorNode<GeneratedDataset>
      return this.serializeNestedEditorHtml(dataset)
    }

    /**
     * Converts nested editor instances back into cleaned HTML on their
     * `serializedKey` properties, because their content may not be
     * automatically updated when the nested editor changes. Mutates and
     * returns the passed-in JSON; a no-op when the node's class has no
     * `nestedEditors` spec. Also called by hand-written `exportJSON`
     * overrides (e.g. Image/Video blob-src guards, Bookmark's metadata remap).
     */
    serializeNestedEditorHtml<T extends Record<string, unknown>>(json: T): T {
      const target = json as Record<string, unknown>
      getNestedEditorSpecs(this).forEach((spec) => {
        const editor = this[`__${spec.name}`] as LexicalEditor | null | undefined
        if (editor) {
          editor.getEditorState().read(() => {
            const html = $generateHtmlFromNodes(editor, null)
            target[spec.serializedKey] = cleanBasicHtml(html, spec.cleanBasicHtml)
          })
        }
      })
      return json
    }

    exportDOM(_editor: LexicalEditor, options: ExportDOMOptions = {}): TOutput {
      if (!defaultRenderFn) {
        throw new Error(`[generateDecoratorNode] ${nodeType}: "defaultRenderFn" is required`)
      }

      // One read-only render context per export — the only export-time view
      // the render fn receives besides the node (plan 042).
      const context = createRenderContext(options)
      // The class's dynamic-dataset index signature makes `this` unprovable
      // as the instance type (see the return-cast note below), but unlike the
      // old inferred TRenderNode the asserted shape is now TRUE of the
      // runtime object: the dataset keys at their widened types.
      return defaultRenderFn(this as unknown as GeneratedDecoratorNodeInstance<GeneratedDataset, TOutput>, context)
    }

    /* c8 ignore start */
    /**
     * Inserts node in the DOM. Required when extending the DecoratorNode.
     * @extends DecoratorNode
     * @see https://lexical.dev/docs/concepts/nodes#extending-decoratornode
     */
    createDOM() {
      return document.createElement('div')
    }

    /**
     * Required when extending the DecoratorNode
     * @extends DecoratorNode
     * @see https://lexical.dev/docs/concepts/nodes#extending-decoratornode
     */
    updateDOM() {
      return false
    }

    /**
     * Defines whether a node is a top-level block.
     * @see https://lexical.dev/docs/api/classes/lexical.DecoratorNode#isinline
     */
    isInline() {
      // All our cards are top-level blocks. Override if needed.
      return false
    }
    /* c8 ignore stop */

    /**
     * Defines whether a node has an edit mode in the editor UI
     */
    hasEditMode() {
      // Most of our cards have an edit mode. Override if needed.
      return true
    }

    /*
     * Returns the text content of the node, used by the editor to calculate the word count
     * This method filters out properties without `wordCount: true`
     */
    getTextContent() {
      const self = this.getLatest()
      const propertiesWithText = nodeProperties.filter((prop) => !!prop.wordCount)

      const text = propertiesWithText
        .map((prop) => readTextContent(self, prop.name))
        .filter(Boolean)
        .join('\n')

      return text ? `${text}\n\n` : ''
    }
  }

  /**
   * Generates getters and setters for each property, following ES6 syntax
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set
   *
   * Example: for a given property 'content', the generated getter and setter will be:
   * get content() {
   *    const self = this.getLatest();
   *    return self.__content;
   * }
   *
   * set content(newVal) {
   *   const writable = this.getWritable();
   *   writable.__content = newVal;
   * }
   *
   * They can be used as `node.content` (getter) and `node.content = 'new value'` (setter)
   */
  internalProps.forEach((prop) => {
    Object.defineProperty(GeneratedDecoratorNode.prototype, prop.name, {
      get: function () {
        const self = this.getLatest()
        return self[prop.privateName]
      },
      set: function (newVal) {
        const writable = this.getWritable()
        writable[prop.privateName] = newVal
      },
    })
  })

  return GeneratedDecoratorNode as unknown as GeneratedDecoratorNodeClass<DecoratorNodeValueMap<Props>, TOutput>
}
