import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const distDir = path.resolve(__dirname, '../../dist')

// Feature runtimes bundled by Inkling (plan 027): these must never appear as
// load-time externals of either root entry. React/ReactDOM are the only
// packages that resolve from the consumer.
const FEATURE_PACKAGES = [
  'markdown-it',
  '@uiw/react-codemirror',
  '@uiw/codemirror-extensions-basic-setup',
  '@codemirror/',
  'emoji-mart',
  '@emoji-mart/',
  'fast-average-color',
  'yjs',
  'y-websocket',
]

const isFeaturePackage = (id: string) =>
  FEATURE_PACKAGES.some((pkg) => (pkg.endsWith('/') ? id.startsWith(pkg) : id === pkg || id.startsWith(`${pkg}/`)))

function readDist(fileName: string) {
  return fs.readFileSync(path.join(distDir, fileName), 'utf-8')
}

/** Leading static `import ... from "..."` specifiers of an ESM bundle. */
function esmImportSpecifiers(content: string) {
  return [...content.matchAll(/^import .*? from ["']([^"']+)["']/gm)].map((match) => match[1])
}

/** `require("...")` specifiers in the UMD/CJS factory prelude (first 4 KB). */
function umdRequireSpecifiers(content: string) {
  return [...content.slice(0, 4096).matchAll(/require\(["']([^"']+)["']\)/g)].map((match) => match[1])
}

/** Runtime body with the trailing sourceMappingURL comment stripped. */
function stripSourceMapTrailer(content: string) {
  return content.replace(/\n\/\/# sourceMappingURL=.*$/, '')
}

describe('Build output', function () {
  it('UMD bundle contains injected CSS', function () {
    const umdPath = path.join(distDir, 'editor.umd.js')
    const umdContent = fs.readFileSync(umdPath, 'utf-8')

    // The UMD build should contain the CSS content for style injection
    // so consumers get styles without needing a separate CSS import
    expect(umdContent).toContain('.inkling-lexical')
  })

  it('ES module build has a separate style.css file', function () {
    const cssPath = path.join(distDir, 'style.css')

    expect(fs.existsSync(cssPath)).toBe(true)

    const cssContent = fs.readFileSync(cssPath, 'utf-8')
    expect(cssContent).toContain('.inkling-lexical')
  })

  it('emits the canonical CJS artifact editor.umd.cjs and retains legacy editor.umd.js', function () {
    expect(fs.existsSync(path.join(distDir, 'editor.umd.cjs')), 'canonical CJS output dist/editor.umd.cjs').toBe(true)
    expect(fs.existsSync(path.join(distDir, 'editor.umd.js')), 'legacy UMD output dist/editor.umd.js').toBe(true)
  })

  it('ESM prelude has no static imports for feature packages and keeps React external', function () {
    const specifiers = esmImportSpecifiers(readDist('editor.js'))

    expect(specifiers.length).toBeGreaterThan(0)
    expect(specifiers.filter(isFeaturePackage)).toEqual([])
    expect(specifiers).toContain('react')
    expect(specifiers).toContain('react-dom')
  })

  it('CJS prelude has no requires for feature packages and keeps React external', function () {
    const specifiers = umdRequireSpecifiers(readDist('editor.umd.cjs'))

    expect(specifiers.length).toBeGreaterThan(0)
    expect(specifiers.filter(isFeaturePackage)).toEqual([])
    expect(specifiers).toContain('react')
    expect(specifiers).toContain('react-dom')
  })

  it('legacy editor.umd.js carries the same runtime body as editor.umd.cjs', function () {
    const canonical = stripSourceMapTrailer(readDist('editor.umd.cjs'))
    const legacy = stripSourceMapTrailer(readDist('editor.umd.js'))

    expect(legacy).toBe(canonical)
  })
})
