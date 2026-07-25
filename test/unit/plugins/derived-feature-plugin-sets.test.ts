import { describe, expect, it } from 'vitest'

import { DEFAULT_FEATURE_PLUGINS } from '@/plugins/DefaultFeaturePlugins'

// Guard for the default feature plugin set — the plugin analogue of
// test/unit/nodes/derived-node-sets.test.ts.
describe('default feature plugin set', () => {
  it('assigns every entry a unique render key', () => {
    const keys = DEFAULT_FEATURE_PLUGINS.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
