import { createHeadlessEditor } from '@lexical/headless'
import { createEditor, type LexicalEditor } from 'lexical'

// The unit suite's editor harness — the one home of the test-editor
// factory and the update awaiters that used to be copied per spec:
//
// - createTestEditor: the two construction flavors (headless by default;
//   headless: false for the rendered-component specs that need a real
//   editor). Bespoke configs (html import config, themes, parentEditor)
//   keep their own createEditor calls — this factory owns only the
//   common nodes + onError shape.
// - updateEditor: await one committed update.
// - tick: one macrotask hop — the flush React effect registration and
//   listener-enqueued work need.
// - drainEnqueuedUpdates: the double hop — await the outer commit, then
//   one macrotask so a commit enqueued from the update listener (the
//   footnote renumber scan, registerUpdateScan) begins and lands.

type HeadlessEditorArgs = NonNullable<Parameters<typeof createHeadlessEditor>[0]>

type EditorUpdateOptions = Omit<NonNullable<Parameters<LexicalEditor['update']>[1]>, 'onUpdate'>

export interface CreateTestEditorOptions {
  nodes?: HeadlessEditorArgs['nodes']
  onError?: (error: Error) => void
  /** false for the rendered-component specs: a real editor (jsdom), namespace 'test'. */
  headless?: boolean
}

export function createTestEditor({ nodes = [], onError = () => {}, headless = true }: CreateTestEditorOptions = {}) {
  return headless ? createHeadlessEditor({ nodes, onError }) : createEditor({ namespace: 'test', nodes, onError })
}

/** Await one committed editor update. */
export function updateEditor(editor: LexicalEditor, updateFn: () => void): Promise<void> {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

/** One macrotask hop: flushes React effect registration and listener-enqueued work. */
export function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * Awaits the outer commit, then drains the listener-enqueued commit: work
 * scheduled from an update listener begins only after the outer commit's
 * deferred callbacks (Lexical's $triggerEnqueuedUpdates tail) and commits
 * in a later microtask, so the macrotask hop flushes both.
 */
export async function drainEnqueuedUpdates(
  editor: LexicalEditor,
  updateFn: () => void,
  options?: EditorUpdateOptions,
): Promise<void> {
  await new Promise<void>((resolve) => {
    editor.update(updateFn, { ...options, onUpdate: () => resolve() })
  })
  await tick()
}
