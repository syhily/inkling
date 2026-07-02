import { describe, expect, it } from 'vitest'

import { isInternalUrl, isValidUrl } from '@/utils/isInternalUrl'

describe('isInternalUrl', () => {
  it('returns false when url or siteUrl is missing', () => {
    expect(isInternalUrl('', 'https://example.com')).toBe(false)
    expect(isInternalUrl('https://example.com/post', '')).toBe(false)
    expect(isInternalUrl('https://example.com/post')).toBe(false)
  })

  it('returns true for urls on the same hostname and subdir', () => {
    expect(isInternalUrl('https://example.com/blog/post/', 'https://example.com/blog/')).toBe(true)
    expect(isInternalUrl('https://example.com/blog/post', 'https://example.com/blog')).toBe(true)
  })

  it('returns false for a different hostname', () => {
    expect(isInternalUrl('https://other.com/blog/post', 'https://example.com/blog')).toBe(false)
  })

  it('returns false when the pathname is outside the site subdir', () => {
    expect(isInternalUrl('https://example.com/news/post', 'https://example.com/blog')).toBe(false)
  })

  it('returns false for malformed urls', () => {
    expect(isInternalUrl('not a url', 'https://example.com')).toBe(false)
    expect(isInternalUrl('https://example.com', 'not a url')).toBe(false)
  })
})

describe('isValidUrl', () => {
  it('returns true for http and https urls', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('https://example.com/path?query=1#hash')).toBe(true)
  })

  it('returns true for mailto, tel, and ftp urls', () => {
    expect(isValidUrl('mailto:test@example.com')).toBe(true)
    expect(isValidUrl('tel:+1234567890')).toBe(true)
    expect(isValidUrl('ftp://example.com/file.txt')).toBe(true)
  })

  it('returns false for javascript urls', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false)
  })

  it('returns false for malformed urls', () => {
    expect(isValidUrl('not a url')).toBe(false)
    expect(isValidUrl('')).toBe(false)
    expect(isValidUrl('https://')).toBe(false)
  })

  it('returns false for relative urls', () => {
    expect(isValidUrl('/path')).toBe(false)
    expect(isValidUrl('#anchor')).toBe(false)
  })

  it('returns false for urls with whitespace', () => {
    expect(isValidUrl(' https://example.com')).toBe(false)
    expect(isValidUrl('https://example.com ')).toBe(false)
  })
})
