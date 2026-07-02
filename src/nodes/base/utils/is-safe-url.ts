/**
 * Check whether a URL is safe to interpolate into HTML/CSS.
 *
 * Allowed schemes: http, https, data. Relative URLs without a scheme are also
 * allowed so that content paths (e.g. /content/images/...) keep working.
 */
export function isSafeUrl(url: string): boolean {
  if (typeof url !== 'string') {
    return false
  }

  const trimmed = url.trim()
  if (trimmed === '') {
    return false
  }

  const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!schemeMatch) {
    // No scheme -> treat as a relative URL
    return true
  }

  const scheme = schemeMatch[1].toLowerCase()
  return scheme === 'http' || scheme === 'https' || scheme === 'data'
}
