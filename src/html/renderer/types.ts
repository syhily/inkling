import type { ExportDOMOptions } from '@/nodes/base'

// The string layer's options type. It used to add renderer-specific bags
// (`usedIdAttributes`, `renderData`); id tracking is render-context-owned now
// (plan 040 Step 6), so it currently adds nothing over `ExportDOMOptions`.
export interface RendererOptions extends ExportDOMOptions {}
