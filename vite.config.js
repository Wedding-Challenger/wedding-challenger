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

export default defineConfig(({ mode }) => {
  // mode 별 API·사이트 origin 을 검증한다. 허용 밖 조합(예: development 에 운영 API)은 dev 서버·빌드 모두 여기서 실패.
  // test 는 env 파일·프로세스 값을 읽지 않고 고정값(localhost, 광고·색인 false)을 쓴다.
  const config = resolveModeConfig({ mode, root, loadEnv })
  // client 의 import.meta.env.VITE_API_BASE_URL 을 검증된 값으로 맞춘다(test 는 고정값 — vi.stubEnv 로만 바꾼다)
  process.env.VITE_API_BASE_URL = config.apiOrigin

  return {
    envDir: mode === 'test' ? false : root,
    define: { __WC_BUILD_CONFIG__: JSON.stringify(config) },
    plugins: [react(), tailwindcss(), siteMeta(config)],
    server: {
      port: 5173,
      strictPort: true,
    },
  }
})
