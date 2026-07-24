import { createHeadlessEditor } from '@lexical/headless'
import { $getRoot, type EditorState, type LexicalEditor, type LexicalNodeConfig } from 'lexical'

import type {
  GeneratedDecoratorNodeClass,
  NestedEditorSpec,
  TransientPropSpec,
} from '@/nodes/base/generate-decorator-node'

import { dom } from '#/nodes-base/test-utils/index'
import { ensureLexicalNodeOwnMethods, utils, type ExportDOMOutput, type Visibility } from '@/nodes/base/index'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
import { populateNestedEditor } from '@/utils/nested-editors'

const defaultVisibility = utils.visibility.buildDefaultVisibility()

function createRenderResult(tagName: 'div' | 'span', content: string) {
  const element = dom.window.document.createElement(tagName)
  element.textContent = content
  return {
    element,
    type: 'inner' as const,
  }
}

function expectHtmlElement(output: ExportDOMOutput) {
  const { element } = output

  if (!element || !('outerHTML' in element)) {
    throw new Error('Expected exportDOM() to return an HTML element')
  }

  return element
}

describe('Utils: generateDecoratorNode', function () {
  let editor: LexicalEditor

  // NOTE: all tests should use this function, without it you need manual
  // try/catch and done handling to avoid assertion failures not triggering
  // failed tests
  const editorTest = (testFn: () => void) => () =>
    new Promise<void>((resolve, reject) => {
      editor.update(() => {
        try {
          testFn()
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })

  const editorTestWithNodes =
    <TNodes extends readonly LexicalNodeConfig[]>(
      getNodes: () => TNodes,
      testFn: (testEditor: LexicalEditor, nodes: TNodes) => void,
    ) =>
    () =>
      new Promise<void>((resolve, reject) => {
        const nodes = getNodes()
        const testEditor = createHeadlessEditor({ nodes })
        testEditor.update(() => {
          try {
            testFn(testEditor, nodes)
            resolve()
          } catch (e) {
            reject(e)
          }
        })
      })

  describe('exportDOM', function () {
    let NodeWithRender: GeneratedDecoratorNodeClass<Record<string, never>, ReturnType<typeof createRenderResult>>
    let $createNodeWithRender: (dataset?: Record<string, unknown>) => InstanceType<typeof NodeWithRender>

    beforeAll(function () {
      NodeWithRender = utils.generateDecoratorNode({
        nodeType: 'render-test',
        properties: [],
        defaultRenderFn: () => createRenderResult('div', 'default render'),
      })

      $createNodeWithRender = (dataset?: Record<string, unknown>) => {
        return new NodeWithRender(dataset)
      }

      editor = createHeadlessEditor({ nodes: [NodeWithRender] })
    })

    it(
      'uses default renderer when no custom renderer is provided',
      editorTest(function () {
        const node = $createNodeWithRender()
        const result = node.exportDOM(editor)

        expect(result.type).toBe('inner')
        expect(expectHtmlElement(result).outerHTML).toBe('<div>default render</div>')
      }),
    )

    it(
      'throws error when defaultRenderFn is not provided',
      editorTestWithNodes(
        () =>
          [
            utils.generateDecoratorNode({
              nodeType: 'no-render-test',
              properties: [],
            }),
          ] as const,
        function (testEditor, [NodeWithoutRender]) {
          const node = new NodeWithoutRender()
          expect(() => node.exportDOM(testEditor)).toThrow(
            /^\[generateDecoratorNode\] no-render-test: "defaultRenderFn" is required$/,
          )
        },
      ),
    )
  })

  describe('constructor', function () {
    let FalsyAwareNode: GeneratedDecoratorNodeClass<{ count: number; label: string }>
    let $createFalsyAwareNode: (dataset?: Record<string, unknown>) => InstanceType<typeof FalsyAwareNode>

    beforeAll(function () {
      FalsyAwareNode = utils.generateDecoratorNode({
        nodeType: 'falsy-aware-test',
        properties: [
          { name: 'count', default: 10 },
          { name: 'label', default: 'default' },
        ] as const,
      })

      $createFalsyAwareNode = (dataset?: Record<string, unknown>) => {
        return new FalsyAwareNode(dataset)
      }

      editor = createHeadlessEditor({ nodes: [FalsyAwareNode] })
    })

    it(
      'preserves falsy non-boolean values like 0 and empty string',
      editorTest(function () {
        const node = $createFalsyAwareNode({ count: 0, label: '' })

        expect(node.getDataset().count!).toBe(0)
        expect(node.getDataset().label!).toBe('')
        expect(node.exportJSON().count!).toBe(0)
        expect(node.exportJSON().label!).toBe('')
      }),
    )
  })

  describe('hasVisibility', function () {
    let NodeWithVisibility: GeneratedDecoratorNodeClass<{ visibility: Visibility }>
    let $createNodeWithVisibility: (dataset?: Record<string, unknown>) => InstanceType<typeof NodeWithVisibility>

    beforeAll(function () {
      NodeWithVisibility = utils.generateDecoratorNode({
        nodeType: 'visibility-test',
        properties: [],
        hasVisibility: true,
      })

      $createNodeWithVisibility = (dataset?: Record<string, unknown>) => {
        return new NodeWithVisibility(dataset)
      }

      editor = createHeadlessEditor({ nodes: [NodeWithVisibility] })
    })

    it(
      'adds visibility property with default',
      editorTest(function () {
        const node = $createNodeWithVisibility()

        expect(node.visibility, 'node.visibility').toEqual(defaultVisibility)
        expect(node.getDataset().visibility!, 'node.getDataset().visibility').toEqual(defaultVisibility)
        expect(node.exportJSON().visibility!, 'node.exportJSON().visibility').toEqual(defaultVisibility)
      }),
    )

    it(
      'can update visibility',
      editorTest(function () {
        const node = $createNodeWithVisibility()

        const newVisibility: Visibility = {
          web: {
            nonMember: false,
            memberSegment: 'status:free',
          },
          email: {
            memberSegment: 'status:free',
          },
        }

        node.visibility = newVisibility

        expect(node.visibility, 'node.visibility').toEqual(newVisibility)
        expect(node.getDataset().visibility!, 'node.getDataset().visibility').toEqual(newVisibility)
        expect(node.exportJSON().visibility!, 'node.exportJSON().visibility').toEqual(newVisibility)
      }),
    )

    it(
      "ensures default doesn't change when nested visibility objects are updated",
      editorTest(function () {
        const node = $createNodeWithVisibility()

        // NOTE: this wouldn't trigger a Lexical node update, it's just to show
        // that the default can't be accidentally changed by reference
        ;(node.visibility as { web: { nonMember: boolean } }).web.nonMember = false

        expect(NodeWithVisibility.getPropertyDefaults().visibility!).toEqual(defaultVisibility)
      }),
    )

    // During the early visibility beta period we had a different format for visibility
    // when importing we convert to the new format so it keeps working with later UI iterations
    it(
      'migrates old visibility format when importing JSON',
      editorTest(function () {
        const node = NodeWithVisibility.importJSON({
          visibility: {
            showOnWeb: false,
            showOnEmail: true,
            segment: 'status:free',
          },
        })

        // old values are kept, new values are added
        expect(node.visibility).toEqual({
          showOnWeb: false,
          showOnEmail: true,
          segment: 'status:free',
          web: {
            nonMember: false,
            memberSegment: '',
          },
          email: {
            memberSegment: 'status:free',
          },
        })
      }),
    )

    it(
      'can set visibility via constructor',
      editorTest(function () {
        const node = $createNodeWithVisibility({
          visibility: {
            web: {
              nonMember: false,
              memberSegment: 'status:free',
            },
            email: {
              memberSegment: 'status:free',
            },
          },
        })

        expect(node.visibility).toEqual({
          web: {
            nonMember: false,
            memberSegment: 'status:free',
          },
          email: {
            memberSegment: 'status:free',
          },
        })
      }),
    )
  })

  describe('spec adoption (nested editors and transient props)', function () {
    // A synthetic card pinning the spec contract the per-card tests cover only
    // incidentally: the generated base class runs no spec behaviour on its
    // own; a subclass adopting the specs via statics gets the full
    // constructor/getDataset/exportJSON treatment — the same shape
    // `assembleCardNode` produces for the real cards.
    const specNestedEditors: readonly NestedEditorSpec[] = [
      { name: 'captionEditor', serializedKey: 'caption', nodes: MINIMAL_NODES },
      // Header's idiom: the dataset exposes the editor but not its initial state
      { name: 'bodyEditor', serializedKey: 'body', nodes: MINIMAL_NODES, exposeInitialStateInDataset: false },
    ]
    const specTransientProps: readonly TransientPropSpec[] = [
      {
        name: 'flag',
        initial: (dataset) => (!dataset.src && dataset.flag) || false,
        datasetKey: '__flag',
      },
      // no datasetKey: initialized on the node but never re-exposed
      { name: 'seed' },
    ]

    class SpeclessNode extends utils.generateDecoratorNode({
      nodeType: 'spec-contract-test',
      properties: [
        { name: 'caption', default: '' },
        { name: 'body', default: '' },
        { name: 'src', default: '' },
      ] as const,
    }) {}

    class SpecAdoptingNode extends SpeclessNode {
      static nestedEditors = specNestedEditors
      static transientProps = specTransientProps

      declare __captionEditor: LexicalEditor
      declare __captionEditorInitialState: EditorState | undefined
      declare __bodyEditor: LexicalEditor
      declare __flag: boolean
      declare __seed: unknown
    }
    ensureLexicalNodeOwnMethods(SpecAdoptingNode)

    beforeAll(function () {
      editor = createHeadlessEditor({ nodes: [SpecAdoptingNode] })
    })

    it(
      'runs no spec behaviour on the spec-less generated class',
      // a separate editor: the shared one registers the subclass, and Lexical
      // rejects constructing an unregistered class with the same node type
      editorTestWithNodes(
        () => [SpeclessNode] as const,
        function (_testEditor, [RegisteredSpeclessNode]) {
          const node = new RegisteredSpeclessNode({ caption: '<p>hi</p>', flag: true, seed: 'abc' })
          const fields = node as unknown as Record<string, unknown>

          expect(fields.__captionEditor).toBeUndefined()
          expect(fields.__flag).toBeUndefined()
          expect(node.getDataset()).toEqual({ caption: '<p>hi</p>', body: '', src: '' })
        },
      ),
    )

    it(
      'sets up nested editors from their serialized HTML on construction',
      editorTest(function () {
        const node = new SpecAdoptingNode({ caption: '<p>Hello caption</p>' })

        expect(node.__captionEditor).toBeDefined()
        expect(node.__captionEditorInitialState).toBeDefined()
        expect(node.__captionEditor.getEditorState().read(() => $getRoot().getTextContent())).toBe('Hello caption')
      }),
    )

    it(
      'appends the nested-editor dataset keys, honouring exposeInitialStateInDataset',
      editorTest(function () {
        const node = new SpecAdoptingNode({ caption: '<p>Hello caption</p>' })
        const dataset = node.getDataset()

        expect(dataset.captionEditor).toBe(node.__captionEditor)
        expect(dataset.captionEditorInitialState).toBe(node.__captionEditorInitialState)
        // exposeInitialStateInDataset: false — the editor is exposed, its initial state is not
        expect(dataset.bodyEditor).toBe(node.__bodyEditor)
        expect(dataset).not.toHaveProperty('bodyEditorInitialState')
      }),
    )

    it(
      'initializes transient props from the dataset and re-exposes only datasetKey specs',
      editorTest(function () {
        const node = new SpecAdoptingNode({ flag: true, seed: 'abc' })
        expect(node.__flag).toBe(true) // the spec's `initial` computes from the dataset
        expect(node.__seed).toBe('abc') // no `initial`: defaults to dataset[name]

        const dataset = node.getDataset()
        expect(dataset.__flag).toBe(true)
        expect(dataset).not.toHaveProperty('__seed')

        const withSrc = new SpecAdoptingNode({ src: 'filled', flag: true })
        expect(withSrc.__flag).toBe(false)
      }),
    )

    it(
      're-serializes nested editor content back into its serializedKey on exportJSON',
      editorTest(function () {
        const node = new SpecAdoptingNode({})
        // fill the editor the way the constructor does (discrete updates) —
        // manual root surgery inside an outer update never commits
        node.__captionEditor = createHeadlessEditor({ nodes: [SpecAdoptingNode] })
        populateNestedEditor(node.__captionEditor, '<p>Updated caption</p>')

        const json = node.exportJSON()
        expect(json.caption).toContain('Updated caption')
      }),
    )

    it(
      'never serializes transient props or nested-editor keys to JSON',
      editorTest(function () {
        const node = new SpecAdoptingNode({ flag: true, seed: 'abc' })

        expect(Object.keys(node.exportJSON()).sort()).toEqual(['body', 'caption', 'src', 'type', 'version'])
      }),
    )
  })
})
