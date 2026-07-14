export const isLocalContentImage = function (url: string, siteUrl = '', imageBaseUrl = '') {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '')
  const imagePath = url.replace(normalizedSiteUrl, '')
  if (/^(\/.*|__INKLING_URL__)\/?content\/images\//.test(imagePath)) {
    return true
  }

  // imageBaseUrl covers images served from a separate CDN host
  if (!imageBaseUrl) {
    return false
  }
  const normalizedBaseUrl = imageBaseUrl.replace(/\/$/, '')
  return /^\/?content\/images\//.test(url.replace(normalizedBaseUrl, ''))
}
