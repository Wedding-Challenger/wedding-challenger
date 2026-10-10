// 빌드 산출물(dist)의 광고·색인·API origin 정책을 읽기만 해서 검사한다. 배포 워크플로와 로컬 게이트에서 쓴다.
//   node scripts/check-dist.mjs production|staging [distDir]
// 게시자 ID 기대값은 src/config/ads.js 를 import 해서 읽는다(ID 리터럴을 여기 두지 않는다).
// 라우트 목록은 운영 원본 public/sitemap.xml 의 <loc> 에서 읽는다(사전 렌더링 라우트와 같은 목록).
// 관리 셸 admin.html(빈 root·noindex·광고 없음)과 public/_redirects·_headers 의 /admin 규칙도 두 mode 모두 검사한다.
// 제휴 사이드 레이아웃: 추적 mode 파일(.env.<mode>)의 VITE_PARTNER_SIDE_LAYOUT 과 prerender /guide·/checklist 의
// data-partner-side-layout 표식(정확히 하나)이 같아야 하고, data-partner-side-column 은 true 일 때만 정확히 하나다.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ADSENSE_CLIENT, ADSENSE_PUBLISHER_ID } from '../src/config/ads.js'
import { ORIGINS, SIDE_LAYOUT_KEY, trackedSideLayout } from './build-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DEV_ROBOTS = 'User-agent: *\nDisallow: /\n'
export const NOINDEX_HEADER = 'X-Robots-Tag: noindex, nofollow'
export const NO_STORE_HEADER = 'Cache-Control: no-store'
// rewrite 는 이 한 줄만 둔다. /admin 은 Pages 가 admin.html 을 바로 서빙하므로 규칙을 따로 두지 않는다
export const ADMIN_REDIRECT = '/admin/* /admin 200'
export const ADMIN_HEADER_PATHS = ['/admin', '/admin/*', '/admin.html']
export const SIDE_LAYOUT_ROUTES = ['/guide', '/checklist']

// _headers 를 경로 블록으로 나눈다 (들여쓰지 않은 줄 = 경로, 들여쓴 줄 = 그 경로의 헤더)
export function parseHeaders(text) {
  const blocks = []
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (/^\s/.test(line)) blocks.at(-1)?.headers.push(line.trim())
    else blocks.push({ path: line.trim(), headers: [] })
  }
  return blocks
}

const ruleLines = (text) => text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))

function routePaths() {
  const sitemap = readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8')
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
}

const htmlFile = (p) => (p === '/' ? 'index.html' : `${p.slice(1)}.html`)
const read = (dir, file) => readFileSync(path.join(dir, file), 'utf8')
const metaContent = (html, attr, key) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1]

// options.sideLayout: 기대 레이아웃 플래그(테스트용). 없으면 추적 mode 파일 값을 읽는다.
export function checkDist(mode, dist = path.join(root, 'dist'), options = {}) {
  if (mode !== 'production' && mode !== 'staging') throw new Error(`검사 대상 mode 는 production·staging: ${mode}`)
  const origins = ORIGINS[mode]
  const production = mode === 'production'
  const [api] = origins.api
  const [site] = origins.site
  const otherApi = ORIGINS[production ? 'staging' : 'production'].api[0]
  const problems = []
  const expect = (ok, msg) => { if (!ok) problems.push(msg) }

  const paths = routePaths()
  expect(!paths.some((p) => p.startsWith('/admin')), 'sitemap 에 /admin 경로')
  let sideLayout = options.sideLayout
  if (sideLayout === undefined) {
    const tracked = trackedSideLayout(root, mode)
    expect(tracked === 'true' || tracked === 'false', `.env.${mode} 의 ${SIDE_LAYOUT_KEY} 가 'true'/'false' 아님: ${JSON.stringify(tracked)}`)
    sideLayout = tracked === 'true'
  }
  for (const p of paths) {
    const file = htmlFile(p)
    if (!existsSync(path.join(dist, file))) { problems.push(`${file} 없음`); continue }
    const html = read(dist, file)
    const url = site + p
    expect(html.includes(`<link rel="canonical" href="${url}"`), `${file}: canonical 이 ${url} 아님`)
    expect(metaContent(html, 'property', 'og:url') === url, `${file}: og:url 이 ${url} 아님`)
    expect(!/%[A-Z_]+%/.test(html), `${file}: 치환 안 된 자리표시자`)
    expect(!html.includes('googlesyndication'), `${file}: HTML 에 광고 스크립트`)
    expect(!html.includes('<div id="root"></div>'), `${file}: 사전 렌더링 본문 없음`)
    if (SIDE_LAYOUT_ROUTES.includes(p)) {
      const layouts = [...html.matchAll(/data-partner-side-layout="([^"]*)"/g)].map((m) => m[1])
      expect(layouts.length === 1 && layouts[0] === String(sideLayout),
        `${file}: data-partner-side-layout 표식이 "${sideLayout}" 하나가 아님 (${layouts.join(', ') || '없음'})`)
      const columns = (html.match(/data-partner-side-column/g) ?? []).length
      expect(columns === (sideLayout ? 1 : 0), `${file}: data-partner-side-column 이 ${sideLayout ? '정확히 하나' : '없어야'} 함 (${columns}개)`)
    }
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
  const blocks = parseHeaders(headers)

  if (!has('admin.html')) {
    problems.push('admin.html 없음')
  } else {
    const admin = read(dist, 'admin.html')
    expect(admin.includes('<div id="root"></div>'), 'admin.html: 빈 root 아님(사전 렌더링 본문)')
    expect(metaContent(admin, 'name', 'robots') === 'noindex, nofollow', 'admin.html: robots 가 noindex, nofollow 아님')
    expect(!admin.includes('google-adsense-account') && !admin.includes('googlesyndication'), 'admin.html: 광고 계정 meta 또는 광고 스크립트')
    expect(!/%[A-Z_]+%/.test(admin), 'admin.html: 치환 안 된 자리표시자')
  }
  const redirects = has('_redirects') ? ruleLines(read(dist, '_redirects')) : []
  expect(redirects.length === 1 && redirects[0] === ADMIN_REDIRECT, `_redirects 가 "${ADMIN_REDIRECT}" 한 줄이 아님`)
  for (const p of ADMIN_HEADER_PATHS) {
    const block = blocks.find((b) => b.path === p)
    expect(block?.headers.includes(NO_STORE_HEADER) && block.headers.includes(NOINDEX_HEADER), `_headers 에 ${p} no-store·noindex 없음`)
  }
  if (production) {
    expect(has('ads.txt') && read(dist, 'ads.txt') === `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`, 'ads.txt 없음 또는 내용 불일치')
    expect(has('sitemap.xml') && read(dist, 'sitemap.xml') === read(path.join(root, 'public'), 'sitemap.xml'), 'sitemap.xml 이 운영 원본과 다름')
    expect(has('robots.txt') && read(dist, 'robots.txt') === read(path.join(root, 'public'), 'robots.txt'), 'robots.txt 가 운영 원본과 다름')
    // 운영은 관리 셸 경로만 noindex 를 허용한다
    const outside = blocks.filter((b) => !ADMIN_HEADER_PATHS.includes(b.path) && b.headers.some((h) => h.startsWith('X-Robots-Tag')))
    expect(outside.length === 0, `_headers 에 관리 셸 밖 X-Robots-Tag (${outside.map((b) => b.path).join(', ')})`)
  } else {
    expect(!has('ads.txt'), '개발 빌드에 ads.txt')
    expect(!has('sitemap.xml'), '개발 빌드에 sitemap.xml')
    expect(has('robots.txt') && read(dist, 'robots.txt') === DEV_ROBOTS, 'robots.txt 가 전체 차단이 아님')
    expect(blocks.some((b) => b.path === '/*' && b.headers.includes(NOINDEX_HEADER)), `_headers 에 /* ${NOINDEX_HEADER} 없음`)
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
