import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { ADSENSE_CLIENT, ADSENSE_PUBLISHER_ID } from './src/config/ads.js'
import { resolveModeConfig } from './scripts/build-config.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))

// index.html 의 사이트 주소·색인·광고 meta 를 빌드 설정에 맞춘다.
// 운영(production)만 src/config/ads.js 의 게시자 ID 로 meta 치환 + ads.txt 생성, 그 밖은 meta 제거·noindex.
function siteMeta(config) {
  return {
    name: 'wc-site-meta',
    transformIndexHtml(html) {
      let out = html.replaceAll('%WC_SITE_URL%', config.siteUrl)
      out = config.adsEnabled
        ? out.replaceAll('%ADSENSE_CLIENT%', ADSENSE_CLIENT)
        : out.replace(/\s*<meta name="google-adsense-account" content="%ADSENSE_CLIENT%" \/>/, '')
      if (!config.indexable) {
        out = out.replace('<meta name="robots" content="index, follow" />', '<meta name="robots" content="noindex, nofollow" />')
      }
      return out
    },
    generateBundle() {
      if (!config.adsEnabled) return
      this.emitFile({
        type: 'asset',
        fileName: 'ads.txt',
        source: `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`,
      })
    },
  }
}

// envRoot 는 env 파일 위치(기본은 이 저장소). 테스트가 임시 디렉터리로 같은 프로세스 재평가를 확인할 때만 바꾼다.
export function createViteConfig({ mode }, envRoot = root) {
  // mode 별 API·사이트 origin 을 검증한다. 허용 밖 조합(예: development 에 운영 API)은 dev 서버·빌드 모두 여기서 실패.
  // test 는 env 파일·프로세스 값을 읽지 않고 고정값(localhost, 광고·색인 false)을 쓴다.
  const config = resolveModeConfig({ mode, root: envRoot, loadEnv })
  const define = { __WC_BUILD_CONFIG__: JSON.stringify(config) }
  if (mode === 'test') {
    // test 는 client API 값을 고정값으로 초기화한다(개별 테스트는 vi.stubEnv 로만 바꾼다)
    process.env.VITE_API_BASE_URL = config.apiOrigin
  } else {
    // 그 밖의 mode 는 process.env 를 건드리지 않는다 — 건드리면 dev 서버 재시작 때 loadEnv 가 그 값을
    // env 파일보다 우선해 설정 변경·제거와 잘못된 값이 가려진다. client·SSR 에는 검증값을 define 으로 넣는다.
    define['import.meta.env.VITE_API_BASE_URL'] = JSON.stringify(config.apiOrigin)
  }

  return {
    envDir: mode === 'test' ? false : envRoot,
    define,
    plugins: [react(), tailwindcss(), siteMeta(config)],
    server: {
      port: 5173,
      strictPort: true,
    },
  }
}

export default defineConfig((env) => createViteConfig(env))
