const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'ftp:'])

export function isValidUrl(url: string): boolean {
  if (/\s/.test(url)) {
    return false
  }

  try {
    const parsed = new URL(url)
    return ALLOWED_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

export function isInternalUrl(url: string, siteUrl?: string): boolean {
  if (!url || !siteUrl) {
    return false
  }

  try {
    const urlObj = new URL(url)
    const subdir = `/${new URL(siteUrl).pathname.split('/')[1]}`
    return urlObj.hostname === new URL(siteUrl).hostname && urlObj.pathname.startsWith(subdir)
  } catch {
    return false
  }
}
