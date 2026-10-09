// 빌드 산출물(dist)의 광고·색인·API origin 정책을 읽기만 해서 검사한다. 배포 워크플로와 로컬 게이트에서 쓴다.
//   node scripts/check-dist.mjs production|staging [distDir]
// 게시자 ID 기대값은 src/config/ads.js 를 import 해서 읽는다(ID 리터럴을 여기 두지 않는다).
// 라우트 목록은 운영 원본 public/sitemap.xml 의 <loc> 에서 읽는다(사전 렌더링 라우트와 같은 목록).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ADSENSE_CLIENT, ADSENSE_PUBLISHER_ID } from '../src/config/ads.js'
import { ORIGINS } from './build-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DEV_ROBOTS = 'User-agent: *\nDisallow: /\n'
export const NOINDEX_HEADER = 'X-Robots-Tag: noindex, nofollow'

function routePaths() {
  const sitemap = readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
}

const htmlFile = (p) => (p === '/' ? 'index.html' : `${p.slice(1)}.html`)
const read = (dir, file) => readFileSync(path.join(dir, file), 'utf8')
const metaContent = (html, attr, key) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1]

export function checkDist(mode, dist = path.join(root, 'dist')) {
  if (mode !== 'production' && mode !== 'staging') throw new Error(`검사 대상 mode 는 production·staging: ${mode}`)
  const origins = ORIGINS[mode]
  const production = mode === 'production'
  const [api] = origins.api
  const [site] = origins.site
  const otherApi = ORIGINS[production ? 'staging' : 'production'].api[0]
  const problems = []
  const expect = (ok, msg) => { if (!ok) problems.push(msg) }

  for (const p of routePaths()) {
    const file = htmlFile(p)
    if (!existsSync(path.join(dist, file))) { problems.push(`${file} 없음`); continue }
    const html = read(dist, file)
    const url = site + p
    expect(html.includes(`<link rel="canonical" href="${url}"`), `${file}: canonical 이 ${url} 아님`)
    expect(metaContent(html, 'property', 'og:url') === url, `${file}: og:url 이 ${url} 아님`)
    expect(!/%[A-Z_]+%/.test(html), `${file}: 치환 안 된 자리표시자`)
    expect(!html.includes('googlesyndication'), `${file}: HTML 에 광고 스크립트`)
    expect(!html.includes('<div id="root"></div>'), `${file}: 사전 렌더링 본문 없음`)
    if (production) {
      expect(metaContent(html, 'name', 'robots') === 'index, follow', `${file}: robots 가 index, follow 아님`)
      expect(metaContent(html, 'name', 'google-adsense-account') === ADSENSE_CLIENT, `${file}: 광고 계정 meta 불일치`)
    } else {
      expect(metaContent(html, 'name', 'robots') === 'noindex, nofollow', `${file}: robots 가 noindex, nofollow 아님`)
      expect(!html.includes('google-adsense-account'), `${file}: 광고 계정 meta 가 남아 있음`)
    }
  }

  const has = (file) => existsSync(path.join(dist, file))
  const headers = has('_headers') ? read(dist, '_headers') : ''
  if (production) {
    expect(has('ads.txt') && read(dist, 'ads.txt') === `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`, 'ads.txt 없음 또는 내용 불일치')
    expect(has('sitemap.xml') && read(dist, 'sitemap.xml') === read(path.join(root, 'public'), 'sitemap.xml'), 'sitemap.xml 이 운영 원본과 다름')
    expect(has('robots.txt') && read(dist, 'robots.txt') === read(path.join(root, 'public'), 'robots.txt'), 'robots.txt 가 운영 원본과 다름')
    expect(!headers.includes('X-Robots-Tag'), '_headers 에 X-Robots-Tag')
  } else {
    expect(!has('ads.txt'), '개발 빌드에 ads.txt')
    expect(!has('sitemap.xml'), '개발 빌드에 sitemap.xml')
    expect(has('robots.txt') && read(dist, 'robots.txt') === DEV_ROBOTS, 'robots.txt 가 전체 차단이 아님')
    expect(/^\/\*$/m.test(headers) && headers.includes(NOINDEX_HEADER), `_headers 에 /* ${NOINDEX_HEADER} 없음`)
  }

  const assets = path.join(dist, 'assets')
  const js = existsSync(assets)
    ? readdirSync(assets).filter((f) => f.endsWith('.js')).map((f) => read(assets, f)).join('\n')
    : ''
  expect(js.includes(api), `번들에 API origin ${api} 없음`)
  expect(!js.includes(otherApi), `번들에 다른 환경 API origin ${otherApi}`)

  return problems
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, dist] = process.argv.slice(2)
  try {
    const problems = checkDist(mode, dist && path.resolve(dist))
    if (problems.length) {
      console.error(`dist 검사 실패 (${mode}):\n- ${problems.join('\n- ')}`)
      process.exit(1)
    }
    console.log(`dist 검사 통과 (${mode})`)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
