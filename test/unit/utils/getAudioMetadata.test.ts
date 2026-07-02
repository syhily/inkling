import { afterEach, describe, expect, it } from 'vitest'

import { getAudioMetadata } from '@/utils/getAudioMetadata'

describe('getAudioMetadata', () => {
  const OriginalAudio = globalThis.Audio

  afterEach(() => {
    globalThis.Audio = OriginalAudio
  })

  it('resolves with duration when metadata loads', async () => {
    globalThis.Audio = class MockAudio {
      onloadedmetadata: (() => void) | null = null
      onerror: (() => void) | null = null
      duration = 123.456

      set src(_url: string) {
        queueMicrotask(() => this.onloadedmetadata?.())
      }
    } as unknown as typeof Audio

    await expect(getAudioMetadata('https://example.com/audio.mp3')).resolves.toEqual({
      duration: 123.456,
    })
  })

  it('rejects when the audio fails to load', async () => {
    globalThis.Audio = class MockAudio {
      onloadedmetadata: (() => void) | null = null
      onerror: (() => void) | null = null
      duration = 0

      set src(_url: string) {
        queueMicrotask(() => this.onerror?.())
      }
    } as unknown as typeof Audio

    await expect(getAudioMetadata('https://example.com/broken.mp3')).rejects.toThrow(
      'Failed to load audio metadata from https://example.com/broken.mp3',
    )
  })
})
