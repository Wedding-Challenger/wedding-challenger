// 빌드 진입점: client → SSR → 사전 렌더링을 모두 같은 mode 로 실행한다.
//   npm run build          → node scripts/build.mjs --mode production
//   npm run build:staging  → node scripts/build.mjs --mode staging
// mode 별 API·사이트 origin 검증과 빌드 상수는 vite.config.js(scripts/build-config.mjs)가 맡는다.
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { prerender } from './prerender.mjs'

const BUILD_MODES = ['production', 'staging', 'development']

function parseMode(args) {
  const modes = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) modes.push(args[++i])
    else if (args[i].startsWith('--mode=')) modes.push(args[i].slice('--mode='.length))
    else throw new Error(`알 수 없는 인자: ${args[i]}`)
  }
  // `npm run build -- --mode staging` 처럼 mode 가 둘 이상 들어오면 어느 단계가 어느 mode 인지 모호하다
  if (modes.length !== 1) throw new Error('--mode 는 정확히 한 번 지정한다 (npm run build:staging 사용)')
  if (!BUILD_MODES.includes(modes[0])) throw new Error(`빌드 mode 는 ${BUILD_MODES.join('·')}: ${modes[0]}`)
  return modes[0]
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

try {
  const mode = parseMode(process.argv.slice(2))
  // 순차 빌드(staging → production 등)에서 이전 산출물이 섞이지 않게 매번 비운다
  await rm(path.join(root, 'dist'), { recursive: true, force: true })
  await rm(path.join(root, 'dist-ssr'), { recursive: true, force: true })

  await build({ root, mode })
  await build({ root, mode, build: { ssr: 'src/entry-server.jsx', outDir: 'dist-ssr' } })
  const config = await prerender()
  if (config.stage !== mode) throw new Error(`SSR 번들 stage(${config.stage})가 빌드 mode(${mode})와 다르다`)
  console.log(`build ${mode} 완료: API ${config.apiOrigin} · 사이트 ${config.siteUrl} · 광고 ${config.adsEnabled} · 색인 ${config.indexable}`)
} catch (e) {
  console.error(`build 실패: ${e.message}`)
  process.exit(1)
}
