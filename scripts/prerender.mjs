// vite build(클라이언트) + vite build --ssr(src/entry-server.jsx) 결과로 라우트별 정적 HTML 을 만든다.
// '/' → dist/index.html, '/guide' → dist/guide.html (Cloudflare Pages 가 /guide 로 서빙, 끝 슬래시 리다이렉트 없음)
// 라우트·SITE_URL·빌드 설정은 SSR 번들의 export 만 쓴다(원본 소스를 Node 에서 직접 import 하면 빌드 상수가 없다).
// 색인 금지 빌드(production 이 아닌 mode)는 sitemap.xml 을 지우고 robots.txt 전체 차단·_headers noindex 를 더한다.
// 관리 셸 dist/admin.html 은 사전 렌더링하지 않는다(빈 root 그대로). _headers 의 /admin 블록은 public/_headers 에서 온다.
// 보통 scripts/build.mjs 가 호출한다. 단독 실행: node scripts/prerender.mjs
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')

const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
  if (!re.test(html)) throw new Error(`index.html 에 <meta ${attr}="${key}"> 가 없음`)
  return html.replace(re, `$1${escape(value)}$2`)
}

// public/_headers(관리 셸 no-store·noindex)를 지우지 않고 사이트 전체 noindex 블록을 덧붙인다
export function withNoindexHeaders(existing = '') {
  const base = existing.trimEnd()
  return `${base ? `${base}\n` : ''}/*\n  X-Robots-Tag: noindex, nofollow\n`
}

export async function prerender() {
  const { render, siteUrl, routes, buildConfig } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href)
  const template = await readFile(path.join(dist, 'index.html'), 'utf8')

  for (const route of routes) {
    const url = siteUrl + route.path
    let html = template
      .replace(/<title>[^<]*<\/title>/, `<title>${escape(route.title)}</title>`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
      .replace('<div id="root"></div>', `<div id="root">${render(route.path)}</div>`)
    html = setMeta(html, 'name', 'description', route.description)
    html = setMeta(html, 'property', 'og:url', url)
    html = setMeta(html, 'property', 'og:title', route.title)
    html = setMeta(html, 'property', 'og:description', route.description)
    html = setMeta(html, 'name', 'twitter:title', route.title)
    html = setMeta(html, 'name', 'twitter:description', route.description)

    // '/privacy/previous' → dist/privacy/previous.html (하위 경로는 폴더를 만든다)
    const file = route.path === '/' ? 'index.html' : `${route.path.slice(1)}.html`
    await mkdir(path.dirname(path.join(dist, file)), { recursive: true })
    await writeFile(path.join(dist, file), html)
    console.log(`prerendered ${route.path} → dist/${file}`)
  }

  if (!buildConfig.indexable) {
    // robots 차단만으로 비공개가 되지는 않는다 — 접근 제한(Access)은 별도 운영 작업
    await rm(path.join(dist, 'sitemap.xml'), { force: true })
    await writeFile(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
    const headersFile = path.join(dist, '_headers')
    const existing = existsSync(headersFile) ? await readFile(headersFile, 'utf8') : ''
    await writeFile(headersFile, withNoindexHeaders(existing))
    console.log(`noindex (${buildConfig.stage}) → robots.txt 전체 차단, _headers X-Robots-Tag, sitemap.xml 제거`)
  }

  await rm(ssrDir, { recursive: true, force: true })
  return buildConfig
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await prerender()
}
