// gets image dimensions from a given Url

export interface AudioMetadata {
  duration: number
}

export async function getAudioMetadata(url: string): Promise<AudioMetadata> {
  const audio = new Audio()

  return new Promise((resolve, reject) => {
    audio.onloadedmetadata = function () {
      resolve({
        duration: audio.duration,
      })
    }
    audio.onerror = function () {
      reject(new Error(`Failed to load audio metadata from ${url}`))
    }
    audio.src = url
  })
}
