import { describe, expect, it } from 'vitest'

import { EMAIL_FEATURE_PLUGINS } from '@/components/EmailEditor'
import AtLinkPlugin from '@/plugins/AtLinkPlugin'
import { DEFAULT_FEATURE_PLUGINS } from '@/plugins/DefaultFeaturePlugins'
import ReplacementStringsPlugin from '@/plugins/ReplacementStringsPlugin'

// Surface-parity guard for the feature plugin sets — the plugin analogue of
// test/unit/nodes/derived-node-sets.test.ts. The email set must stay exactly
// the default set with at-linking swapped for replacement strings; NEVER edit
// this to match drift — fix the derivation (or the declared delta) instead.
describe('derived feature plugin sets', () => {
  it('email set is the default set minus AtLinkPlugin plus ReplacementStringsPlugin', () => {
    expect(EMAIL_FEATURE_PLUGINS).toEqual([
      ...DEFAULT_FEATURE_PLUGINS.filter((entry) => entry.Component !== AtLinkPlugin),
      { key: 'replacement-strings', Component: ReplacementStringsPlugin },
    ])
  })

  it('keeps the shared default entries in their declared order', () => {
    const emailComponents = EMAIL_FEATURE_PLUGINS.map((entry) => entry.Component)
    const sharedDefaults = DEFAULT_FEATURE_PLUGINS.map((entry) => entry.Component).filter(
      (Component) => Component !== AtLinkPlugin,
    )

    expect(emailComponents.slice(0, sharedDefaults.length)).toEqual(sharedDefaults)
    expect(emailComponents).not.toContain(AtLinkPlugin)
    expect(emailComponents.at(-1)).toBe(ReplacementStringsPlugin)
  })

  it('assigns every entry a unique render key within each set', () => {
    for (const plugins of [DEFAULT_FEATURE_PLUGINS, EMAIL_FEATURE_PLUGINS]) {
      const keys = plugins.map((entry) => entry.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})
