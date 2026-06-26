// purely for testing purposes
import fixturePhotosDataset from '@/unsplash/api/dataFixtures.json'
import { Photo } from '@/unsplash/UnsplashTypes'

// oxlint-disable-next-line typescript/no-explicit-any
export const fixturePhotos: Photo[] = fixturePhotosDataset as unknown as Photo[]
