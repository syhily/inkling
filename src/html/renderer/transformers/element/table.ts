import type { ElementNode } from 'lexical'

/* c8 ignore start */
import type { ExportChildren } from '@/html/renderer/transformers/index'

import { $isTableCellNode, $isTableNode, $isTableRowNode } from '@/nodes/table/TableNodes'
/* c8 ignore stop */

// The table family exports straight from the tree — not via upstream
// exportDOM, whose cell inline styles and colgroup bookkeeping belong to the
// editing surface, not the published HTML. A header cell is a <th>, anything
// else a <td> (the hasHeaderRow ⇔ first-row isHeader fact). Cell children
// render inline: the renderer's exportChildren flattens the cell's single
// paragraph into the tag without wrapping it in <p>.
export default {
  export(node: ElementNode, exportChildren: ExportChildren) {
    if (!$isTableNode(node)) {
      return null
    }

    const rows = node
      .getChildren()
      .filter($isTableRowNode)
      .map((row) => {
        const cells = row
          .getChildren()
          .filter($isTableCellNode)
          .map((cell) => {
            const tag = cell.hasHeader() ? 'th' : 'td'
            return `<${tag}>${exportChildren(cell)}</${tag}>`
          })
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    return `<table>${rows}</table>`
  },
}
