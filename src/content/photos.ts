import manifest from './photos.generated.json'

export type Photo = {
  id: string
  file: string
  label: string
  tags: string[]
  title: string
  author: string
  license: string
  licenseUrl: string
  source: string
}

export const photos: Photo[] = manifest as Photo[]

const byId = new Map(photos.map((p) => [p.id, p]))

export function getPhoto(id: string) {
  return byId.get(id)
}

export function photoUrl(photo: Photo) {
  return `./photos/${photo.file}`
}

export function tagValues(photo: Photo, category: string) {
  return photo.tags.filter((t) => t.startsWith(`${category}:`)).map((t) => t.slice(category.length + 1))
}
