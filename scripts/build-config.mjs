// 빌드 mode 별 API·사이트 origin 을 검증하고 client/SSR 공통 빌드 상수(__WC_BUILD_CONFIG__)를 만든다.
// vite.config.js 와 scripts/check-dist.mjs 가 쓴다. 광고·색인은 stage === 'production' 에서만 켠다
// (staging 빌드도 import.meta.env.PROD 는 true 라 그 값으로 판단하지 않는다).

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
})

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
  }
}

// test 는 loadEnv 를 부르지 않는다. 나머지 mode 는 env 파일 + 프로세스 VITE_ 값(Vite 와 같은 우선순위)을 검증한다.
export function resolveModeConfig({ mode, root, loadEnv }) {
  if (mode === 'test') return resolveBuildConfig('test')
  return resolveBuildConfig(mode, loadEnv(mode, root, 'VITE_'))
}
