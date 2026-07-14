#!/usr/bin/env node
/* oxlint-disable no-console -- CLI script: stdout is its output channel */
// Packed-type verifier: installs the packed @inkling/editor tarball into an
// isolated temp project with only documented peers and type packages, then
// type-checks a clean consumer under both "Bundler" and "NodeNext" module
// resolution. Feature runtimes (Lexical, CodeMirror, emoji-mart, markdown-it,
// Yjs, etc.) are deliberately NOT installed — the published declaration must
// own its own type graph.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONSUMER_SOURCE = join(REPO_ROOT, 'test', 'typecheck-consumer', 'consumer.tsx')

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

function makeTsconfig(module, moduleResolution) {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'es2022',
        lib: ['es2022', 'dom', 'dom.iterable'],
        strict: true,
        jsx: 'react-jsx',
        module,
        moduleResolution,
        noEmit: true,
        skipLibCheck: false,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        types: ['react', 'react-dom'],
      },
      include: ['consumer.tsx'],
    },
    null,
    2,
  )
}

const tempRoot = mkdtempSync(join(tmpdir(), 'inkling-pack-types-'))

function checkConsumer(label, consumerDir, module, moduleResolution) {
  phase(label)
  mkdirSync(consumerDir, { recursive: true })
  writeFileSync(
    join(consumerDir, 'package.json'),
    JSON.stringify(
      {
        name: `verify-types-${module.toLowerCase()}`,
        private: true,
        type: 'module',
        dependencies: {
          '@inkling/editor': `file:${tarballPath}`,
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: {
          typescript: '^5.5.0',
          '@types/react': '^19.0.0',
          '@types/react-dom': '^19.0.0',
        },
      },
      null,
      2,
    ),
  )
  copyFileSync(CONSUMER_SOURCE, join(consumerDir, 'consumer.tsx'))
  writeFileSync(join(consumerDir, 'tsconfig.json'), makeTsconfig(module, moduleResolution))

  if (!run(`${label} install`, 'pnpm', ['install', '--no-frozen-lockfile'], { cwd: consumerDir })) {
    return false
  }

  const output = run(`${label} tsc`, 'pnpm', ['exec', 'tsc', '--project', 'tsconfig.json'], {
    cwd: consumerDir,
  })
  if (output) {
    process.stdout.write(output)
    return true
  }
  return false
}

let tarballPath = ''

try {
  phase('pack')
  const packOutput = run('pnpm pack', 'pnpm', ['pack', '--pack-destination', tempRoot, '--json'])
  if (!packOutput) {
    throw new Error('pnpm pack failed; see errors above')
  }
  const jsonStart = packOutput.indexOf('{')
  const packJson = JSON.parse(jsonStart === -1 ? packOutput : packOutput.slice(jsonStart))
  tarballPath = isAbsolute(packJson.filename) ? packJson.filename : join(tempRoot, packJson.filename)
  console.log(`tarball: ${packJson.filename}`)

  const bundlerOk = checkConsumer('bundler consumer', join(tempRoot, 'consumer-bundler'), 'ESNext', 'Bundler')
  const nodenextOk = checkConsumer('nodenext consumer', join(tempRoot, 'consumer-nodenext'), 'NodeNext', 'NodeNext')

  if (bundlerOk && nodenextOk) {
    phase('negative check')
    const brokenDir = join(tempRoot, 'consumer-broken-decl')
    mkdirSync(brokenDir, { recursive: true })
    // Copy the Bundler consumer, then delete the emitted root declaration to
    // prove the fixture is actually reading the package types and not the repo.
    writeFileSync(
      join(brokenDir, 'package.json'),
      JSON.stringify(
        {
          name: 'verify-types-broken-decl',
          private: true,
          type: 'module',
          dependencies: {
            '@inkling/editor': `file:${tarballPath}`,
            react: '^19.0.0',
            'react-dom': '^19.0.0',
          },
          devDependencies: {
            typescript: '^5.5.0',
            '@types/react': '^19.0.0',
            '@types/react-dom': '^19.0.0',
          },
        },
        null,
        2,
      ),
    )
    copyFileSync(CONSUMER_SOURCE, join(brokenDir, 'consumer.tsx'))
    writeFileSync(join(brokenDir, 'tsconfig.json'), makeTsconfig('ESNext', 'Bundler'))

    if (run('broken-decl install', 'pnpm', ['install', '--no-frozen-lockfile'], { cwd: brokenDir })) {
      const typesPath = join(brokenDir, 'node_modules', '@inkling', 'editor', 'dist', 'editor.d.ts')
      rmSync(typesPath, { force: true })
      console.log(`removed ${typesPath}`)
      const brokenOutput = run('broken-decl tsc (should fail)', 'pnpm', ['exec', 'tsc', '--project', 'tsconfig.json'], {
        cwd: brokenDir,
      })
      if (brokenOutput) {
        recordFailure('negative check', {
          message: 'broken declaration file was removed but tsc still succeeded',
        })
      } else {
        console.log('negative check OK: missing declaration causes expected failure')
      }
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nverify:types FAILED (${failures.length} phase(s)):`)
  for (const failure of failures) {
    console.error(`  - ${failure.label}`)
  }
  process.exit(1)
}

console.log(
  '\nverify:types OK — packed declaration entry compiles under Bundler and NodeNext with only peers installed',
)
