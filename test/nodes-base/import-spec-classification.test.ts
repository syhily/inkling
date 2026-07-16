import type { CardImportSpec } from '@/nodes/base/import-spec'

import { CARD_DECLARATIONS, type CardDeclaration } from '@/nodes/cards'

/**
 * Import-spec classification invariant (CONTEXT.md: "import spec"): every
 * card declaration either names its DOM-import knowledge (`importSpec`, from
 * which the generated node machinery derives `importDOM`) or is pinned here
 * in the structural set, keeping a hand-written parser. The sets may only
 * change deliberately — shrinking the derivable set is acceptable (record
 * the why-comment on the surviving parser); growing the structural set
 * needs vocabulary the flat reads can't express.
 */

const DERIVABLE_CARDS = ['audio', 'button', 'callout', 'file', 'horizontalrule', 'image', 'toggle', 'video']

const STRUCTURAL_CARDS = ['bookmark', 'codeblock', 'gallery', 'header', 'html']

// the declarations are viewed through the interface so `importSpec` is
// accessible on the structural (spec-less) entries too
const declarations: readonly CardDeclaration[] = CARD_DECLARATIONS

type BaseNodeStatics = {
  importSpec?: CardImportSpec
  getPropertyDefaults(): Record<string, unknown>
}

function baseNodeStatics(declaration: CardDeclaration): BaseNodeStatics {
  return declaration.baseNode as unknown as BaseNodeStatics
}

describe('import spec classification', () => {
  it('every declaration either names an import spec or is pinned in the structural set', () => {
    const withSpec = declarations
      .filter((declaration) => declaration.importSpec !== undefined)
      .map((declaration) => declaration.nodeType)
    const structural = declarations
      .filter((declaration) => declaration.importSpec === undefined)
      .map((declaration) => declaration.nodeType)

    expect(withSpec.sort()).toEqual(DERIVABLE_CARDS)
    expect(structural.sort()).toEqual(STRUCTURAL_CARDS)
  })

  it('declaration and base node reference the same spec object', () => {
    declarations
      .filter((declaration) => declaration.importSpec !== undefined)
      .forEach((declaration) => {
        expect(baseNodeStatics(declaration).importSpec).toBe(declaration.importSpec)
      })
  })

  it('every read in every spec names a property of the base node', () => {
    declarations
      .filter((declaration) => declaration.importSpec !== undefined)
      .forEach((declaration) => {
        const defaults = baseNodeStatics(declaration).getPropertyDefaults()
        const spec = declaration.importSpec as CardImportSpec

        spec.conversions.forEach((conversion) => {
          conversion.reads.forEach((read) => {
            const names = read.kind === 'composite' ? (read.provides ?? []) : [read.name]
            names.forEach((name) => {
              expect(defaults, `${declaration.nodeType} read "${name}"`).toHaveProperty(name)
            })
          })
        })
      })
  })
})
