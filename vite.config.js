import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { ADSENSE_CLIENT, ADSENSE_PUBLISHER_ID } from './src/config/ads.js'

// src/config/ads.js 의 게시자 ID 로 meta 태그 치환 + ads.txt 생성
function adsense() {
  return {
    name: 'wc-adsense',
    transformIndexHtml: (html) => html.replaceAll('%ADSENSE_CLIENT%', ADSENSE_CLIENT),
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'ads.txt',
        source: `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`,
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), adsense()],
  server: {
    port: 5173,
  },
})
