#!/usr/bin/env node
/* oxlint-disable no-console -- CLI script: stdout is its output channel */
// Packed-package verifier: packs @inkling/editor into a temp dir, installs the
// tarball with ONLY the react/react-dom peers, and exercises both published
// entry conditions (ESM `import` and CJS `require`) from throwaway consumers.
// This is the release gate for the documented install contract: no consumer
// installation of card/collaboration feature packages may be required to load
// the package root. Invoked from `pnpm verify:package`.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const NODE = process.execPath

const failures = []

function phase(label) {
  console.log(`\n== ${label} ==`)
}

function recordFailure(label, error) {
  const stdout = error?.stdout?.toString().trim()
  const stderr = error?.stderr?.toString().trim()
  failures.push({ label, stdout, stderr })
  console.error(`FAILED: ${label}`)
  if (stderr) {
    console.error(stderr)
  }
  if (stdout && stdout !== stderr) {
    console.error(stdout)
  }
  if (!stderr && !stdout && error?.message) {
    console.error(error.message)
  }
}

function run(label, command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    })
  } catch (error) {
    recordFailure(label, error)
    return null
  }
}

// Minimal DOM shim: the bundles inject their CSS at module evaluation via
// document.createElement('style') + document.head.appendChild, and CodeMirror
// sniffs document.documentElement.style at import time. This is a
// module-resolution harness, not SSR support.
const DOM_SHIM = `
const shimElement = () => ({
  style: {},
  parentNode: null,
  firstChild: null,
  setAttribute() {},
  getAttribute() {
    return null
  },
  appendChild() {},
  insertBefore() {},
})
globalThis.document = {
  documentElement: { style: {} },
  createElement: shimElement,
  head: { appendChild() {}, insertBefore() {}, firstChild: null },
}
`

const EXPORT_ASSERTIONS = `
function assertExports(mod) {
  const missing = []
  if (!mod.InklingEditor) missing.push('InklingEditor')
  if (!mod.InklingComposer) missing.push('InklingComposer')
  if (typeof mod.markdownToLexicalState !== 'function') missing.push('markdownToLexicalState')
  if (typeof mod.lexicalStateToMarkdown !== 'function') missing.push('lexicalStateToMarkdown')
  if (!mod.EmojiPickerPlugin) missing.push('EmojiPickerPlugin')
  if (!mod.CODE_BLOCK_TRANSFORMER) missing.push('CODE_BLOCK_TRANSFORMER')
  if (!Array.isArray(mod.DEFAULT_NODES) || mod.DEFAULT_NODES.length === 0) missing.push('DEFAULT_NODES')
  if (missing.length > 0) {
    throw new Error('missing or invalid exports: ' + missing.join(', '))
  }
  console.log('exports OK: ' + Object.keys(mod).length + ' exports')
}
`

const tempRoot = mkdtempSync(join(tmpdir(), 'inkling-pack-verify-'))

try {
  phase('pack')
  const packOutput = run('pnpm pack', 'pnpm', ['pack', '--pack-destination', tempRoot, '--json'])
  if (!packOutput) {
    throw new Error('pnpm pack failed; see errors above')
  }
  const jsonStart = packOutput.indexOf('{')
  const packJson = JSON.parse(jsonStart === -1 ? packOutput : packOutput.slice(jsonStart))
  const tarballPath = isAbsolute(packJson.filename) ? packJson.filename : join(tempRoot, packJson.filename)
  console.log(`tarball: ${packJson.filename}`)

  phase('tarball contents')
  const files = (packJson.files ?? []).map((file) => file.path)
  const mustInclude = [
    'package.json',
    'README.md',
    'LICENSE',
    'dist/editor.js',
    'dist/editor.umd.cjs',
    'dist/editor.umd.js',
    'dist/style.css',
  ]
  const missingFiles = mustInclude.filter((path) => !files.includes(path))
  if (missingFiles.length > 0) {
    recordFailure('tarball contents', { message: `missing files: ${missingFiles.join(', ')}` })
  }
  const forbidden = files.filter((path) => /(^|\/)(test|src|scripts|node_modules)\//.test(path) || /\.env/.test(path))
  if (forbidden.length > 0) {
    recordFailure('tarball contents', { message: `unexpected files: ${forbidden.join(', ')}` })
  }
  if (missingFiles.length === 0 && forbidden.length === 0) {
    console.log(`${files.length} files, all expected entries present`)
  }

  const consumerDeps = JSON.stringify({
    '@inkling/editor': `file:${tarballPath}`,
    react: '^19.0.0',
    'react-dom': '^19.0.0',
  })

  phase('esm consumer')
  const esmDir = join(tempRoot, 'consumer-esm')
  mkdirSync(esmDir, { recursive: true })
  writeFileSync(
    join(esmDir, 'package.json'),
    JSON.stringify({
      name: 'verify-esm-consumer',
      private: true,
      type: 'module',
      dependencies: JSON.parse(consumerDeps),
    }),
  )
  writeFileSync(
    join(esmDir, 'check.mjs'),
    `${DOM_SHIM}
const resolved = import.meta.resolve('@inkling/editor')
if (!resolved.endsWith('editor.js')) {
  throw new Error('ESM entry resolved to ' + resolved + ', expected .../editor.js')
}
console.log('resolved: ' + resolved)
const inkling = await import('@inkling/editor')
${EXPORT_ASSERTIONS}
assertExports(inkling)
`,
  )
  if (run('install esm consumer', 'pnpm', ['install', '--no-frozen-lockfile'], { cwd: esmDir })) {
    const output = run('execute esm consumer', NODE, ['check.mjs'], { cwd: esmDir })
    if (output) {
      process.stdout.write(output)
    }
  }

  phase('cjs consumer')
  const cjsDir = join(tempRoot, 'consumer-cjs')
  mkdirSync(cjsDir, { recursive: true })
  writeFileSync(
    join(cjsDir, 'package.json'),
    JSON.stringify({ name: 'verify-cjs-consumer', private: true, dependencies: JSON.parse(consumerDeps) }),
  )
  writeFileSync(
    join(cjsDir, 'check.cjs'),
    `${DOM_SHIM}
const resolved = require.resolve('@inkling/editor')
if (!resolved.endsWith('.cjs')) {
  throw new Error('CJS entry resolved to ' + resolved + ', expected .../editor.umd.cjs')
}
console.log('resolved: ' + resolved)
const inkling = require('@inkling/editor')
${EXPORT_ASSERTIONS}
assertExports(inkling)
`,
  )
  if (run('install cjs consumer', 'pnpm', ['install', '--no-frozen-lockfile'], { cwd: cjsDir })) {
    const output = run('execute cjs consumer', NODE, ['check.cjs'], { cwd: cjsDir })
    if (output) {
      process.stdout.write(output)
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nverify:package FAILED (${failures.length} phase(s)):`)
  for (const failure of failures) {
    console.error(`  - ${failure.label}`)
  }
  process.exit(1)
}

console.log('\nverify:package OK — packed ESM and CJS entries load with only react/react-dom installed')
