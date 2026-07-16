#!/usr/bin/env node
/* oxlint-disable no-console -- CLI script: stdout is its output channel */
// Bundled declaration build for @inkling/editor (plan 028).
//
// Tool note: unplugin-dts + API Extractor cannot parse this repository's
// TypeScript 6 declaration output (API Extractor bundles the TS 5.9 compiler
// and crashes on the re-export graph), so the bundle is produced with
// dts-bundle-generator, which runs on the repo's own TypeScript. React stays
// external (it is the only runtime peer); every other type package referenced
// by the public graph is inlined so consumers need no second Lexical install —
// the same ownership contract as scripts/verify-packed-package.ts.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = resolve(REPO_ROOT, 'src/dts-entry.ts')
const OUT_FILE = resolve(REPO_ROOT, 'dist/editor.d.ts')
const TSCONFIG = resolve(REPO_ROOT, 'tsconfig.build.json')

// Exact package names (the tool does not accept globs). Types from these
// packages are copied into the bundle; anything not listed here and not in
// the React peer family must not appear in the output at all.
const INLINED_LIBRARIES = [
  'lexical',
  '@lexical/clipboard',
  '@lexical/headless',
  '@lexical/html',
  '@lexical/link',
  '@lexical/list',
  '@lexical/markdown',
  '@lexical/react',
  '@lexical/rich-text',
  '@lexical/selection',
  '@lexical/text',
  '@lexical/utils',
  'markdown-it',
  '@types/markdown-it',
  'color',
  '@types/color',
  'color-convert',
  '@types/color-convert',
  'clsx',
  'react-error-boundary',
]

const { generateDtsBundle } = require('dts-bundle-generator') as typeof import('dts-bundle-generator')

const [content] = generateDtsBundle(
  [
    {
      filePath: ENTRY,
      libraries: { inlinedLibraries: INLINED_LIBRARIES },
      output: {
        inlineDeclareGlobals: true,
        // Referenced-but-not-exported symbols must stay local: auto-exporting
        // only the interface half of Lexical's merged class+interface pairs
        // (TextNode, ElementNode, DecoratorNode, ...) breaks the merge.
        exportReferencedTypes: false,
      },
    },
  ],
  { preferredConfigPath: TSCONFIG },
)

// dts-bundle-generator 9.5.1 collision bug: our sources use React's default
// import while inlined Lexical declarations use `import * as React`, and both
// get aliased to the same identifier. The output then contains a duplicate
// import binding plus `import("react").<alias>.X` references that do not
// resolve. Rewrite both to the single namespace import.
function fixReactAliasCollision(source: string): string {
  const aliasMatch = source.match(/^import \* as ([\w$]+) from 'react';$/m)
  if (!aliasMatch) {
    return source
  }
  const alias = aliasMatch[1]
  return source
    .replace(new RegExp(`^import ${alias.replace(/\$/g, '\\$')} from 'react';\\n`, 'm'), '')
    .replaceAll(`import("react").${alias}.`, `${alias}.`)
}

function collectExternals(source: string): string[] {
  const externals = new Set<string>()
  for (const match of source.matchAll(/from '([^']+)'/g)) {
    externals.add(match[1])
  }
  for (const match of source.matchAll(/import\('([^']+)'\)/g)) {
    externals.add(match[1])
  }
  return [...externals].sort()
}

const failures: string[] = []
const fixed = fixReactAliasCollision(content)

const forbidden = /(?:from|import\()\s*['"](@\/|\/Users\/|\.\.\/src|src\/|test\/|demo\/)/
if (forbidden.test(fixed)) {
  failures.push('declaration contains workspace alias or absolute local path')
}

const externals = collectExternals(fixed)
const unexpected = externals.filter((name) => !/^react($|\/)|^react-dom($|\/)/.test(name))
if (unexpected.length > 0) {
  failures.push(`declaration references non-peer externals: ${unexpected.join(', ')}`)
}

for (const symbol of ['InklingEditor', 'InklingComposer', 'markdownToLexicalState']) {
  if (!fixed.includes(symbol)) {
    failures.push(`declaration is missing expected public symbol: ${symbol}`)
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`build-types FAILED: ${failure}`)
  }
  process.exit(1)
}

writeFileSync(OUT_FILE, fixed)
console.log(`wrote ${OUT_FILE} (${(fixed.length / 1024).toFixed(1)} KiB); externals: ${externals.join(', ')}`)

// Fast in-repo validation; the authoritative gate is pnpm verify:types
// (packed consumer, skipLibCheck: false, consumer TypeScript).
execFileSync(
  'pnpm',
  [
    'exec',
    'tsc',
    '--ignoreConfig',
    '--noEmit',
    '--strict',
    '--skipLibCheck',
    'false',
    '--target',
    'es2022',
    '--module',
    'esnext',
    '--moduleResolution',
    'bundler',
    '--lib',
    'es2022,dom,dom.iterable',
    OUT_FILE,
  ],
  { cwd: REPO_ROOT, stdio: 'inherit' },
)
console.log('build-types OK')
