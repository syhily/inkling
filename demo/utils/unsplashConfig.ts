const API_VERSION = 'v1'
const API_TOKEN = import.meta.env.VITE_UNSPLASH_ACCESS_KEY ?? ''

const defaultHeaders: Record<string, string | boolean> = {
  'Accept-Version': API_VERSION,
  'Content-Type': 'application/json',
  'App-Pragma': 'no-cache',
  'X-Unsplash-Cache': true,
}

if (API_TOKEN) {
  defaultHeaders.Authorization = `Client-ID ${API_TOKEN}`
}

export { defaultHeaders }
