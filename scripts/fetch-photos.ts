import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

type Source = {
  id: string
  label: string
  query: string
  title?: string
  mime?: string
  file?: string
  skip?: string[]
  tags: string[]
}

type Info = {
  title: string
  thumburl: string
  width: number
  height: number
  descriptionurl: string
  mime: string
  extmetadata?: Record<string, { value: string }>
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcesPath = join(root, 'content/photo-sources.json')
const lockPath = join(root, 'content/photos.lock.json')
const outDir = join(root, 'public/photos')
const manifestPath = join(root, 'src/content/photos.generated.json')
const sheetDir = join(root, '.scratch/contact')

const api = 'https://commons.wikimedia.org/w/api.php'
const userAgent = 'StarGuardKidsGame/1.0 (educational offline game; photo fetch script)'
const allowedLicense = /^(public domain|pd\b|pd-|cc0|cc by(-sa)? \d)/i

const args = process.argv.slice(2)
const refresh = new Set(
  args
    .filter((a) => a.startsWith('--refresh='))
    .flatMap((a) => a.slice('--refresh='.length).split(','))
)
const sheetsOnly = args.includes('--sheets')

const sources: Source[] = JSON.parse(readFileSync(sourcesPath, 'utf8'))
const lock: Record<string, string> = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJson(params: Record<string, string>) {
  const url = `${api}?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })}`
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(700)
    const res = await fetch(url, { headers: { 'User-Agent': userAgent } })
    if (res.ok) return res.json()
    const retryAfter = Number(res.headers.get('retry-after'))
    await sleep(retryAfter > 0 ? retryAfter * 1000 : 4000 * 2 ** attempt)
  }
  throw new Error(`Commons API failed: ${url}`)
}

const infoProps = {
  prop: 'imageinfo',
  iiprop: 'url|size|mime|extmetadata',
  iiurlwidth: '800',
  iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|UsageTerms|ObjectName',
}

function pagesToInfos(data: { query?: { pages?: { title: string; index?: number; imageinfo?: Omit<Info, 'title'>[] }[] } }) {
  const pages = data.query?.pages ?? []
  return pages
    .filter((p) => p.imageinfo?.length)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((p) => ({ title: p.title, ...p.imageinfo![0] }) as Info)
}

async function byTitle(title: string) {
  const t = title.startsWith('File:') ? title : `File:${title}`
  return pagesToInfos(await getJson({ action: 'query', titles: t, ...infoProps }))[0]
}

async function search(src: Source, quality: boolean) {
  const filter = quality ? ' incategory:Quality_images' : ''
  const text = src.title ? `intitle:"${src.title}"` : src.query
  return pagesToInfos(
    await getJson({
      action: 'query',
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: `${text} filemime:${src.mime ?? 'image/jpeg'}${filter}`,
      gsrlimit: '15',
      ...infoProps,
    })
  )
}

function license(info: Info) {
  return info.extmetadata?.LicenseShortName?.value?.trim() ?? ''
}

function stripHtml(s: string) {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function acceptable(info: Info, src: Source, used: Set<string>) {
  if (!allowedLicense.test(license(info))) return false
  if (used.has(info.title)) return false
  if (src.skip?.some((s) => info.title.includes(s))) return false
  if (Math.min(info.width, info.height) < 500) return false
  const ratio = info.width / info.height
  return ratio > 0.5 && ratio < 2.2
}

async function choose(src: Source, used: Set<string>) {
  const locked = !refresh.has(src.id) ? lock[src.id] : undefined
  const fixed = locked ?? src.file
  if (fixed) {
    const info = await byTitle(fixed)
    if (info && allowedLicense.test(license(info))) return info
    console.warn(`  ${src.id}: fixed file unusable (${fixed}), searching instead`)
  }
  const avoid = new Set(used)
  if (refresh.has(src.id) && lock[src.id]) avoid.add(lock[src.id])
  for (const quality of [true, false]) {
    const found = (await search(src, quality)).find((i) => acceptable(i, src, avoid))
    if (found) return found
  }
  return undefined
}

async function download(info: Info, id: string) {
  const res = await fetch(info.thumburl, { headers: { 'User-Agent': userAgent } })
  if (!res.ok) throw new Error(`download ${res.status} ${info.thumburl}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const file = `${id}.webp`
  await sharp(buf)
    .flatten({ background: '#ffffff' })
    .resize(512, 512, { fit: 'cover', position: sharp.strategy.attention })
    .webp({ quality: 76 })
    .toFile(join(outDir, file))
  return file
}

async function contactSheets(manifest: { id: string; file: string; label: string }[]) {
  mkdirSync(sheetDir, { recursive: true })
  const cell = 180
  const cols = 6
  const perSheet = 24
  for (let s = 0; s * perSheet < manifest.length; s++) {
    const chunk = manifest.slice(s * perSheet, (s + 1) * perSheet)
    const rows = Math.ceil(chunk.length / cols)
    const layers = await Promise.all(
      chunk.map(async (m, i) => {
        const img = await sharp(join(outDir, m.file)).resize(cell, cell).toBuffer()
        const label = Buffer.from(
          `<svg width="${cell}" height="26"><rect width="100%" height="100%" fill="black" opacity="0.7"/><text x="6" y="19" font-size="16" font-family="sans-serif" fill="white">${m.id}</text></svg>`
        )
        const left = (i % cols) * cell
        const top = Math.floor(i / cols) * cell
        return [
          { input: img, left, top },
          { input: label, left, top: top + cell - 26 },
        ]
      })
    )
    await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#333' } })
      .composite(layers.flat())
      .jpeg({ quality: 80 })
      .toFile(join(sheetDir, `sheet-${s + 1}.jpg`))
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const previous: { id: string; file: string; label: string }[] = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : []
  if (sheetsOnly) {
    await contactSheets(previous)
    return
  }
  const used = new Set<string>()
  const manifest = []
  const missing: string[] = []
  for (const src of sources) {
    try {
      const info = await choose(src, used)
      if (!info) {
        missing.push(src.id)
        console.warn(`  ${src.id}: nothing usable for "${src.query}"`)
        continue
      }
      used.add(info.title)
      const target = join(outDir, `${src.id}.webp`)
      const file = lock[src.id] === info.title && existsSync(target) ? `${src.id}.webp` : await download(info, src.id)
      lock[src.id] = info.title
      const meta = info.extmetadata ?? {}
      manifest.push({
        id: src.id,
        file,
        label: src.label,
        tags: src.tags,
        title: info.title.replace(/^File:/, ''),
        author: stripHtml(meta.Artist?.value ?? 'Unknown') || 'Unknown',
        license: license(info),
        licenseUrl: meta.LicenseUrl?.value ?? '',
        source: info.descriptionurl,
      })
      console.log(`ok ${src.id} <- ${info.title} [${license(info)}]`)
      await sleep(150)
    } catch (err) {
      const kept = previous.find((p) => p.id === src.id && existsSync(join(outDir, p.file)))
      if (kept) manifest.push({ ...kept, label: src.label, tags: src.tags })
      else missing.push(src.id)
      console.warn(`  ${src.id}: ${(err as Error).message}${kept ? ' (kept previous photo)' : ''}`)
    }
  }
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n')
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  await contactSheets(manifest)
  console.log(`\n${manifest.length}/${sources.length} photos ready.`)
  if (missing.length) console.log(`Missing: ${missing.join(', ')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
