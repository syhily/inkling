import { ERROR_TYPE } from '@/utils/services/gif'

export function Error({ error }: { error?: string }) {
  if (error === ERROR_TYPE.COMMON) {
    return <p>Uh-oh! Trouble reaching the GIF service, please check your connection</p>
  }

  if (error === ERROR_TYPE.INVALID_API_KEY) {
    return <p>The GIF API key is not valid. Please check your configuration.</p>
  }
  return <p>{error}</p>
}
