// 빌드 시 scripts/prerender.mjs 가 라우트별 HTML 을 만들 때 쓰는 서버 렌더링 진입점.
// 크롤러(AdSense 검수 봇 포함)가 JS 실행 없이도 본문을 읽을 수 있게 한다.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { BudgetProvider } from './context/BudgetContext'
import App from './App.jsx'

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
