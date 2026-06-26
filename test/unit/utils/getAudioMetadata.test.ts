import { afterEach, describe, expect, it } from 'vitest'

import { getAudioMetadata } from '@/utils/getAudioMetadata'

describe('getAudioMetadata', () => {
  const OriginalAudio = globalThis.Audio

  afterEach(() => {
    globalThis.Audio = OriginalAudio
  })

  it('resolves with duration when metadata is loaded', async () => {
    globalThis.Audio = class MockAudio {
      onloadedmetadata: (() => void) | null = null
      duration = 123.456

      set src(_url: string) {
        queueMicrotask(() => this.onloadedmetadata?.())
      }
    } as unknown as typeof Audio

    await expect(getAudioMetadata('https://example.com/audio.mp3')).resolves.toEqual({
      duration: 123.456,
    })
  })
})
