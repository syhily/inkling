import type { ExportDOMOptions } from '@/nodes/base'

export interface RendererOptions extends ExportDOMOptions {
  usedIdAttributes?: Record<string, number>
}
