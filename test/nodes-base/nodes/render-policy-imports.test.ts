import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

/**
 * Plan 040 import guard: renderer policy — URL validation, template escaping,
 * sanitization — lives behind the render-context seam
 * (src/nodes/base/render-context.ts). Card sources must not import the policy
 * implementation modules directly; they go through the seam. The allowlists
 * below are the complete intentional exceptions and may only shrink: delete an
 * entry when a file migrates onto the seam.
 */

const POLICY_MODULES = new Set(['is-safe-url', 'escape-html', 'clean-dom', 'sanitize-html'])

// escape-html: no exceptions — all card-template escaping goes through
// context.escapeText (plan 041); the escape-html implementation is private to
// the seam.
// sanitize-html exception: the markdown card sanitizes markdown-it's rendered
// output with the same DOMPurify-backed helper the seam wraps.
const ALLOWED_DIRECT_IMPORTS: Record<string, string[]> = {
  'markdown/markdown-renderer.ts': ['sanitize-html'],
}

// is-safe-url has exactly one documented importer besides the seam:
// render-helpers/email-button.ts keeps the legacy isSafeUrl fallback for
// direct callers outside a render pass (commit 58711c3; pinned by
// test/nodes-base/utils/email-button.test.ts).
const ALLOWED_IS_SAFE_URL_IMPORTERS = [
  'src/nodes/base/render-context.ts',
  'src/nodes/base/utils/render-helpers/email-button.ts',
]

// cleanDOM runs only behind the seam's CALLOUT_HTML_CONFIG unwrap-allowlist
// fallback (plan 040 Step 4 STOP condition).
const ALLOWED_CLEAN_DOM_IMPORTERS = ['src/nodes/base/render-context.ts']

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true })
    .map(String)
    .filter((name) => /\.tsx?$/.test(name))
}

/** Static, side-effect, and dynamic import specifiers of a source file. */
function importSpecifiers(source: string): string[] {
  const statics = source.matchAll(/(?:^|\s)from\s+['"]([^'"]+)['"]/g)
  const sideEffects = source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)
  const dynamics = source.matchAll(/import\s*\(\s*['"]([^'"]+)['"]/g)
  return [...statics, ...sideEffects, ...dynamics].map((match) => match[1])
}

/** The policy modules (by specifier basename) a source file imports directly. */
function policyImportsOf(file: string): string[] {
  const basenames = importSpecifiers(readFileSync(file, 'utf8')).map((specifier) => specifier.split('/').pop()!)
  return [...new Set(basenames.filter((basename) => POLICY_MODULES.has(basename)))].sort()
}

describe('render policy import guard', () => {
  it('no card source under src/nodes/base/nodes imports policy modules directly', () => {
    const nodesDir = join('src', 'nodes', 'base', 'nodes')
    const offenders: Record<string, string[]> = {}

    for (const name of listSourceFiles(nodesDir)) {
      const imports = policyImportsOf(join(nodesDir, name))
      if (imports.length > 0) {
        offenders[name.split(sep).join('/')] = imports
      }
    }

    expect(offenders).toEqual(ALLOWED_DIRECT_IMPORTS)
  })

  it('the seam and the documented email-button fallback are the only is-safe-url importers', () => {
    const importers = listSourceFiles('src')
      .map((name) => `src/${name.split(sep).join('/')}`)
      .filter((file) => policyImportsOf(file).includes('is-safe-url'))
      .sort()

    expect(importers).toEqual(ALLOWED_IS_SAFE_URL_IMPORTERS)
  })

  it('the seam is the only clean-dom importer', () => {
    const importers = listSourceFiles('src')
      .map((name) => `src/${name.split(sep).join('/')}`)
      .filter((file) => policyImportsOf(file).includes('clean-dom'))
      .sort()

    expect(importers).toEqual(ALLOWED_CLEAN_DOM_IMPORTERS)
  })
})
