import { expect } from 'vitest'

import { getEmailEditorCardConfig } from '@/components/EmailEditor'
import { normalizeCardConfig } from '@/context/InklingHostIntegrationContext'
import { VISIBILITY_SETTINGS } from '@/utils/visibility'

describe('normalizeCardConfig', function () {
  it('drops unknown keys', function () {
    const result = normalizeCardConfig({ stripeEnabled: true, foo: 'bar', editorType: 'full' })
    expect(result).toEqual({ stripeEnabled: true })
    expect('foo' in result).toBe(false)
    expect('editorType' in result).toBe(false)
  })

  it('drops malformed known slices', function () {
    const result = normalizeCardConfig({
      snippets: 'not-an-array',
      stripeEnabled: 'yes',
      image: { allowedWidths: 'wide' },
    })
    expect(result).toEqual({ image: {} })
  })

  it('drops malformed snippet entries but keeps well-formed ones', function () {
    const result = normalizeCardConfig({
      snippets: [{ name: 'One', value: '<p>One</p>' }, { name: 'Broken' }, 'garbage'],
    })
    expect(result.snippets).toEqual([{ name: 'One', value: '<p>One</p>' }])
  })

  it('keeps function- and object-valued slices', function () {
    const createSnippet = () => {}
    const searchLinks = () => Promise.resolve(undefined)
    const result = normalizeCardConfig({
      createSnippet,
      searchLinks,
      klipy: { apiKey: 'key', contentFilter: 'pg' },
      siteUrl: 'https://example.com',
    })
    expect(result.createSnippet).toBe(createSnippet)
    expect(result.searchLinks).toBe(searchLinks)
    expect(result.klipy).toEqual({ apiKey: 'key', contentFilter: 'pg' })
    expect(result.siteUrl).toBe('https://example.com')
  })

  it('passes any string visibilitySettings through without a clamp', function () {
    const result = normalizeCardConfig({ visibilitySettings: VISIBILITY_SETTINGS.WEB_AND_EMAIL })
    expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.WEB_AND_EMAIL)
  })

  it('clamps visibilitySettings to the allowed set with the fallback', function () {
    const clamp = {
      allowed: new Set([VISIBILITY_SETTINGS.EMAIL_ONLY, VISIBILITY_SETTINGS.NONE]),
      fallback: VISIBILITY_SETTINGS.EMAIL_ONLY,
    }
    expect(
      normalizeCardConfig({ visibilitySettings: VISIBILITY_SETTINGS.NONE }, { visibilityClamp: clamp })
        .visibilitySettings,
    ).toBe(VISIBILITY_SETTINGS.NONE)
    expect(
      normalizeCardConfig({ visibilitySettings: VISIBILITY_SETTINGS.WEB_ONLY }, { visibilityClamp: clamp })
        .visibilitySettings,
    ).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY)
    // the key is always written when a clamp is given, even for absent input
    expect(normalizeCardConfig({}, { visibilityClamp: clamp }).visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY)
  })

  it('returns an empty config for non-object input', function () {
    expect(normalizeCardConfig('garbage')).toEqual({})
    expect(normalizeCardConfig(undefined)).toEqual({})
    expect(normalizeCardConfig(null)).toEqual({})
  })
})

describe('getEmailEditorCardConfig', function () {
  it('defaults to EMAIL_ONLY visibility when no cardConfig is passed', function () {
    const result = getEmailEditorCardConfig()
    expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY)
  })

  it('defaults to EMAIL_ONLY visibility when cardConfig has no visibilitySettings', function () {
    const result = getEmailEditorCardConfig({ stripeEnabled: true })
    expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY)
  })

  it('allows NONE visibility to be passed through', function () {
    const result = getEmailEditorCardConfig({ visibilitySettings: VISIBILITY_SETTINGS.NONE })
    expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.NONE)
  })

  it('allows EMAIL_ONLY visibility to be passed through', function () {
    const result = getEmailEditorCardConfig({ visibilitySettings: VISIBILITY_SETTINGS.EMAIL_ONLY })
    expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY)
  })

  it('falls back to EMAIL_ONLY for WEB_AND_EMAIL', function () {
    const result = getEmailEditorCardConfig({ visibilitySettings: VISIBILITY_SETTINGS.WEB_AND_EMAIL })
    expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY)
  })

  it('falls back to EMAIL_ONLY for WEB_ONLY', function () {
    const result = getEmailEditorCardConfig({ visibilitySettings: VISIBILITY_SETTINGS.WEB_ONLY })
    expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY)
  })

  it('falls back to EMAIL_ONLY for invalid values', function () {
    const result = getEmailEditorCardConfig({ visibilitySettings: 'garbage' })
    expect(result.visibilitySettings).toBe(VISIBILITY_SETTINGS.EMAIL_ONLY)
  })

  it('restricts image widths to regular only', function () {
    const result = getEmailEditorCardConfig({ image: { allowedWidths: ['wide', 'full'] } })
    expect(result.image?.allowedWidths).toEqual(['regular'])
  })

  it('preserves declared cardConfig properties', function () {
    const result = getEmailEditorCardConfig({ stripeEnabled: true })
    expect(result.stripeEnabled).toBe(true)
  })

  it('drops unknown keys instead of spreading them through', function () {
    const result = getEmailEditorCardConfig({ stripeEnabled: true, foo: 'bar' })
    expect(result.stripeEnabled).toBe(true)
    expect('foo' in result).toBe(false)
  })

  it('does not write an editorType key', function () {
    const result = getEmailEditorCardConfig({ editorType: 'full' })
    expect('editorType' in result).toBe(false)
  })
})
