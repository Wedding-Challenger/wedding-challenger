// 빌드 시 scripts/prerender.mjs 가 라우트별 HTML 을 만들 때 쓰는 서버 렌더링 진입점.
// 크롤러(AdSense 검수 봇 포함)가 JS 실행 없이도 본문을 읽을 수 있게 한다.
// 라우트·SITE_URL·빌드 설정도 여기서 내보낸다 — prerender 는 원본 소스가 아닌 이 SSR 번들의 값만 쓴다.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { BudgetProvider } from './context/BudgetContext'
import App from './App.jsx'
import * as environment from './config/environment'
import { ROUTES, SITE_URL } from './config/routes'

export const routes = ROUTES
export const siteUrl = SITE_URL
export const buildConfig = { ...environment }

export function render(url) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <BudgetProvider>
          <App />
        </BudgetProvider>
      </StaticRouter>
    </StrictMode>,
  )
}
