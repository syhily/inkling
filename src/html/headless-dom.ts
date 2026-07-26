import type { ExportDOMDom } from '@/nodes/base'

export const HEADLESS_DOM_MISSING_MESSAGE =
  '@inkling/editor headless HTML conversion needs a DOM: pass options.dom, run where a global ' +
  "window.document exists, or install the optional 'jsdom' peer dependency"

type LoadJsdom = () => Promise<ExportDOMDom>

const loadJsdom: LoadJsdom = async () => {
  const { JSDOM } = await import('jsdom')
  return new JSDOM()
}

let cachedDefaultDom: ExportDOMDom | undefined

/**
 * The headless DOM port — the only module in the package that knows jsdom
 * (an import guard enforces it). Resolves the DOM for one headless
 * conversion: an injected `options.dom` wins, then a global
 * `window.document` (mirroring the render context's createDocument chain),
 * then a lazily imported, process-cached JSDOM — the class-level cache the
 * renderer used to carry, moved here. The jsdom loader hides behind the
 * `load` injection port so the failure leg is a synchronous test table with
 * no module mocking: any loader failure is rethrown as the named error.
 */
export async function resolveHeadlessDom(injected?: ExportDOMDom, load: LoadJsdom = loadJsdom): Promise<ExportDOMDom> {
  if (injected) {
    return injected
  }

  if (typeof window !== 'undefined' && window.document) {
    // The REAL global window, not a fabricated {document} shell — the render
    // context binds DOMPurify to options.dom.window downstream, and a
    // structural fake is not a bindable window.
    return { window }
  }

  try {
    cachedDefaultDom ??= await load()
  } catch (error) {
    throw new Error(HEADLESS_DOM_MISSING_MESSAGE, { cause: error })
  }

  return cachedDefaultDom
}
