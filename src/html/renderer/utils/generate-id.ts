import type { RenderContext } from '@/nodes/base/render-context'

import { slugify } from '@/utils'

// The render context owns the used-id map (plan 040 Step 6): one map per
// render pass, so duplicate headings dedup within a render exactly as the old
// options-bag `usedIdAttributes` did.
function generateId(text: string, context: RenderContext) {
  return context.trackIdAttribute(slugify(text))
}

export default generateId
