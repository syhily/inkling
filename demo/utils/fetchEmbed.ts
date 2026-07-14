interface FetchEmbedOptions {
  type: string
}

interface EmbedMetadata {
  icon: string
  title: string
  description: string
  publisher: string
  author: string
  thumbnail: string
}

interface EmbedReturnData {
  url: string
  metadata: EmbedMetadata
}

interface VideoEmbedReturnData {
  html: string
  author_url: string
  provider_name: string
  title: string
  provider_url: string
  author_name: string
  version: string
  thumbnail_url: string
  type: string
}

// 1x1 transparent GIF data URL used so e2e bookmark image assertions do not
// depend on network fetches for https://inkling.local assets.
const BOOKMARK_ICON = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const BOOKMARK_THUMBNAIL = BOOKMARK_ICON

export async function fetchEmbed(
  url: string,
  { type }: FetchEmbedOptions,
): Promise<EmbedReturnData | VideoEmbedReturnData | null> {
  void 0 // fetchEmbed({url, type})
  const urlObject = new URL(url)
  if (!urlObject) {
    throw new Error('No URL specified.')
  }
  await delay(process.env.NODE_ENV === 'test' ? 50 : 1500)

  try {
    if (type === 'bookmark') {
      const returnData: EmbedReturnData = {
        url: 'https://inkling.local/',
        metadata: {
          icon: BOOKMARK_ICON,
          title: 'Inkling: The Creator Economy Platform',
          description:
            'The former of the two songs addresses the issue of negative rumors in a relationship, while the latter, with a more upbeat pulse, is a classic club track; the single is highlighted by a hyped bridge.',
          publisher: 'Inkling - The Professional Publishing Platform',
          author: 'Author McAuthory',
          thumbnail: BOOKMARK_THUMBNAIL,
        },
      }
      return returnData
    }

    const returnData: VideoEmbedReturnData = {
      html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/b52pBaObiY0?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="" title="BOM at the Historic Rally Festival 2021" style="width: 100%; height: 418.1px; max-width: 100%;"></iframe>',
      author_url: 'https://www.youtube.com/user/gorillaz',
      provider_name: 'YouTube',
      title: 'Gorillaz - Humility (Official Video)',
      provider_url: 'https://www.youtube.com/',
      author_name: 'Gorillaz',
      version: '1.0',
      thumbnail_url: 'https://i.ytimg.com/vi/E5yFcdPAGv0/hqdefault.jpg',
      type: 'video',
    }

    // for tests, should convert url to link
    if (url === 'https://inkling.local/should-convert-to-link') {
      throw new Error('Failed to fetch embed')
    }

    return returnData
  } catch (e) {
    // console.log(e);
    return null
  }
}

function delay(time: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, time)
  })
}
