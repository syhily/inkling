import type { GifSettings } from '@/context/InklingHostIntegrationContext'

const PROVIDER_API_URLS: Record<string, string> = {
  klipy: 'https://api.klipy.com',
  tenor: 'https://tenor.googleapis.com',
}

export const ERROR_TYPE: Record<string, string> = {
  COMMON: 'common',
  INVALID_API_KEY: 'invalid_key',
}

export interface GifProviderConfig {
  provider: string
  apiUrl: string
  apiKey: string
  contentFilter: string
}

export function getGifProviderConfig(cardConfig: GifSettings | null | undefined): GifProviderConfig | null {
  if (cardConfig?.klipy?.apiKey) {
    return {
      provider: 'klipy',
      apiUrl: PROVIDER_API_URLS.klipy,
      apiKey: cardConfig.klipy.apiKey,
      contentFilter: cardConfig.klipy.contentFilter || 'off',
    }
  }
  if (cardConfig?.tenor?.googleApiKey) {
    return {
      provider: 'tenor',
      apiUrl: PROVIDER_API_URLS.tenor,
      apiKey: cardConfig.tenor.googleApiKey,
      contentFilter: cardConfig.tenor.contentFilter || 'off',
    }
  }
  return null
}

export interface GifErrorResponse {
  error?: { message?: string } | string
  errors?: { message?: string[] | string }
}

export function extractErrorMessage(json: GifErrorResponse | null | undefined): string {
  const klipyMessage = json?.errors?.message
  const err = json?.error
  return (
    (typeof err === 'object' && err?.message) ||
    (typeof err === 'string' ? err : '') ||
    (Array.isArray(klipyMessage) ? klipyMessage[0] : klipyMessage) ||
    'Unknown error'
  )
}

export function isInvalidKeyError(message: string | null | undefined): boolean {
  const text = message || ''
  return /api key/i.test(text) && /(invalid|not valid)/i.test(text)
}

interface MediaFormat {
  dims: [number, number]
  url?: string
}

export interface GifData {
  id: string
  media_formats: {
    tinygif?: MediaFormat
    gif?: MediaFormat
  }
  ratio?: number
  index?: number
  columnIndex?: number
  columnRowIndex?: number
  [key: string]: unknown
}

export interface GifResponse {
  results: GifData[]
  next?: string
}
