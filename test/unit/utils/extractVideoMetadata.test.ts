import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import extractVideoMetadata from '@/utils/extractVideoMetadata'

class MockCanvas {
  width = 0
  height = 0

  getContext() {
    return {
      drawImage: vi.fn(),
      canvas: this,
    }
  }

  toBlob(callback: (blob: Blob) => void, _type?: string, _quality?: number) {
    callback(new Blob(['thumbnail'], { type: 'image/jpeg' }))
  }
}

class MockVideo {
  muted = false
  playsInline = false
  src = ''
  duration = 10
  videoWidth = 100
  videoHeight = 50
  private _currentTime = 0

  onerror: (() => void) | null = null
  onloadedmetadata: (() => void) | null = null
  oncanplay: (() => void) | null = null
  onseeked: (() => void) | null = null

  get currentTime() {
    return this._currentTime
  }

  set currentTime(value: number) {
    this._currentTime = value
    queueMicrotask(() => this.onseeked?.())
  }

  load() {
    this.onloadedmetadata?.()
    this.oncanplay?.()
  }
}

describe('extractVideoMetadata', () => {
  const originalCreateElement = document.createElement
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = () => 'blob://video'
    URL.revokeObjectURL = vi.fn()

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') {
        return new MockVideo() as unknown as HTMLElement
      }
      if (tagName === 'canvas') {
        return new MockCanvas() as unknown as HTMLElement
      }
      return originalCreateElement.call(document, tagName)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('resolves with video metadata and a thumbnail blob', async () => {
    const file = new File(['video'], 'test.mp4', { type: 'video/mp4' })

    const result = await extractVideoMetadata(file)

    expect(result.duration).toBe(10)
    expect(result.width).toBe(100)
    expect(result.height).toBe(50)
    expect(result.mimeType).toBe('video/mp4')
    expect(result.thumbnailBlob).toBeInstanceOf(Blob)
  })

  it('rejects when the video fails to load', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') {
        const video = new MockVideo()
        video.load = () => video.onerror?.()
        return video as unknown as HTMLElement
      }
      return originalCreateElement.call(document, tagName)
    })

    const file = new File(['video'], 'test.mp4', { type: 'video/mp4' })

    await expect(extractVideoMetadata(file)).rejects.toThrow('Failed to load video metadata')
  })
})
