#!/usr/bin/env node
// Skip sentinel: every test.skip/describe.skip/it.todo in the e2e and unit
// suites must carry a SKIP-REASON justification (on the same line or the line
// directly above) so new skips can't become invisible. Invoked from `pnpm lint`.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const DIRS = ['test/e2e', 'test/unit']

let grepOutput = ''
try {
  grepOutput = execSync(`grep -rnE "\\.(skip|todo)\\(" ${DIRS.join(' ')} --include='*.ts' --include='*.tsx'`, {
    encoding: 'utf8',
  })
} catch (error) {
  if (error.status === 1) {
    process.exit(0) // no matches at all
  }
  throw error
}

const fileCache = new Map()
const offenders = []

for (const line of grepOutput.split('\n').filter(Boolean)) {
  const match = line.match(/^([^:]+):(\d+):(.*)$/)
  if (!match) {
    continue
  }
  const [, file, lineNumber, content] = match
  if (content.includes('SKIP-REASON')) {
    continue
  }
  if (!fileCache.has(file)) {
    fileCache.set(file, readFileSync(file, 'utf8').split('\n'))
  }
  const lineAbove = fileCache.get(file)[Number(lineNumber) - 2] ?? ''
  if (!lineAbove.includes('SKIP-REASON')) {
    offenders.push(`${file}:${lineNumber}`)
  }
}

if (offenders.length > 0) {
  console.error('Unjustified test skips found — add a SKIP-REASON comment (same line or line above):')
  for (const offender of offenders) {
    console.error(`  ${offender}`)
  }
  process.exit(1)
}
