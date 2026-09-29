// vite build(클라이언트) + vite build --ssr(src/entry-server.jsx) 결과로 라우트별 정적 HTML 을 만든다.
// '/' → dist/index.html, '/guide' → dist/guide.html (Cloudflare Pages 가 /guide 로 서빙, 끝 슬래시 리다이렉트 없음)
import { readFile, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')

const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href)
const { SITE_URL, ROUTES } = await import(pathToFileURL(path.join(root, 'src/config/routes.js')).href)
const template = await readFile(path.join(dist, 'index.html'), 'utf8')

const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
  if (!re.test(html)) throw new Error(`index.html 에 <meta ${attr}="${key}"> 가 없음`)
  return html.replace(re, `$1${escape(value)}$2`)
}

for (const route of ROUTES) {
  const url = SITE_URL + route.path
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

  const file = route.path === '/' ? 'index.html' : `${route.path.slice(1)}.html`
  await writeFile(path.join(dist, file), html)
  console.log(`prerendered ${route.path} → dist/${file}`)
}

await rm(ssrDir, { recursive: true, force: true })
