// 빌드 mode 별 API·사이트 origin 을 검증하고 client/SSR 공통 빌드 상수(__WC_BUILD_CONFIG__)를 만든다.
// vite.config.js 와 scripts/check-dist.mjs 가 쓴다. 광고·색인은 stage === 'production' 에서만 켠다
// (staging 빌드도 import.meta.env.PROD 는 true 라 그 값으로 판단하지 않는다).
// 제휴 사이드 레이아웃 플래그(VITE_PARTNER_SIDE_LAYOUT)는 보안이 아닌 레이아웃 적용 시점이다. production·staging 의 값 원천은
// 추적되는 .env.production·.env.staging 하나이며(변경은 develop→master PR), 프로세스 env·*.local 로 덮어쓰면 실패한다.
import { readFileSync } from 'node:fs'
import path from 'node:path'

const LOCAL_API = 'http://localhost:8080'
const LOCAL_SITE = 'http://localhost:5173'

// mode 별 허용 origin. 첫 항목이 기본값으로 쓰이는 것은 defaults 가 있는 development 뿐이다.
export const ORIGINS = {
  production: {
    api: ['https://api.wedding-challenger.com'],
    site: ['https://wedding-challenger.com'],
  },
  staging: {
    api: ['https://api-dev.wedding-challenger.com'],
    site: ['https://develop.wedding-challenger.pages.dev'],
  },
  development: {
    api: [LOCAL_API, 'https://api-dev.wedding-challenger.com'],
    site: [LOCAL_SITE],
    defaults: { api: LOCAL_API, site: LOCAL_SITE },
  },
}

// test 는 env 파일·프로세스 값을 보지 않고 이 값만 쓴다
export const TEST_CONFIG = Object.freeze({
  stage: 'test',
  apiOrigin: LOCAL_API,
  siteUrl: LOCAL_SITE,
  adsEnabled: false,
  indexable: false,
  // 테스트에서 on 은 env 가 아니라 설정 mock 으로만 만든다
  partnerSideLayoutEnabled: false,
})

export const SIDE_LAYOUT_KEY = 'VITE_PARTNER_SIDE_LAYOUT'
// 레이아웃 플래그를 추적 mode 파일에서만 읽는 mode
const TRACKED_FLAG_MODES = ['production', 'staging']

// 경로·query·credentials 없는 origin 만 받는다. 끝 슬래시 하나는 허용해 origin 으로 정규화.
function toOrigin(key, value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${key} 가 URL 이 아님: ${value}`)
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || value.includes('?') || value.includes('#')) {
    throw new Error(`${key} 는 origin 만 넣는다 (경로·query·credentials 금지): ${value}`)
  }
  return url.origin
}

function pick(mode, key, value, allowed, fallback) {
  const raw = value || fallback
  if (!raw) throw new Error(`${mode} mode 에 ${key} 가 없다 (.env.${mode} 확인)`)
  const origin = toOrigin(key, raw)
  if (!allowed.includes(origin)) {
    throw new Error(`${mode} mode 에서 ${key}=${origin} 는 허용되지 않는다 (허용: ${allowed.join(', ')})`)
  }
  return origin
}

// 정확한 문자열 'true'/'false' 만 받는다. development 만 값이 없을 때 false 로 둔다.
function sideLayoutFlag(mode, value) {
  if (value === undefined && !TRACKED_FLAG_MODES.includes(mode)) return false
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${mode} mode 의 ${SIDE_LAYOUT_KEY} 는 'true' 또는 'false' 만 (.env.${mode} 확인): ${JSON.stringify(value)}`)
}

export function resolveBuildConfig(mode, env = {}) {
  if (mode === 'test') return { ...TEST_CONFIG }
  const rule = ORIGINS[mode]
  if (!rule) throw new Error(`지원하지 않는 mode: ${mode} (production·staging·development·test)`)
  const production = mode === 'production'
  return {
    stage: mode,
    apiOrigin: pick(mode, 'VITE_API_BASE_URL', env.VITE_API_BASE_URL, rule.api, rule.defaults?.api),
    siteUrl: pick(mode, 'VITE_SITE_URL', env.VITE_SITE_URL, rule.site, rule.defaults?.site),
    adsEnabled: production,
    indexable: production,
    partnerSideLayoutEnabled: sideLayoutFlag(mode, env[SIDE_LAYOUT_KEY]),
  }
}

// dotenv 형식의 KEY=VALUE 줄만 읽는다(주석·빈 줄 무시). 추적 mode 파일의 레이아웃 플래그 원본 확인용.
export function parseEnvFile(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

// 추적 mode 파일(.env.production·.env.staging)의 레이아웃 플래그 원문. 파일·키가 없으면 undefined.
export function trackedSideLayout(root, mode) {
  try {
    return parseEnvFile(readFileSync(path.join(root, `.env.${mode}`), 'utf8'))[SIDE_LAYOUT_KEY]
  } catch {
    return undefined
  }
}

// test 는 loadEnv 를 부르지 않는다. 나머지 mode 는 env 파일 + 프로세스 VITE_ 값(Vite 와 같은 우선순위)을 검증한다.
// production·staging 의 레이아웃 플래그는 추적 mode 파일 값만 쓴다: 프로세스 env 에 키가 있거나 병합값이 추적값과 다르면
// (*.local 등 덮어쓰기) 실패한다.
export function resolveModeConfig({ mode, root, loadEnv, processEnv = process.env }) {
  if (mode === 'test') return resolveBuildConfig('test')
  const env = loadEnv(mode, root, 'VITE_')
  if (TRACKED_FLAG_MODES.includes(mode)) {
    if (processEnv[SIDE_LAYOUT_KEY] !== undefined) {
      throw new Error(`${SIDE_LAYOUT_KEY} 는 프로세스 env 로 넣지 않는다 — 추적되는 .env.${mode} 만 바꾼다(develop→master PR)`)
    }
    const tracked = trackedSideLayout(root, mode)
    if (env[SIDE_LAYOUT_KEY] !== tracked) {
      throw new Error(`${SIDE_LAYOUT_KEY} 가 .env.${mode} 밖에서 덮어써졌다(*.local 확인): ${JSON.stringify(env[SIDE_LAYOUT_KEY])}`)
    }
    return resolveBuildConfig(mode, { ...env, [SIDE_LAYOUT_KEY]: tracked })
  }
  return resolveBuildConfig(mode, env)
}
