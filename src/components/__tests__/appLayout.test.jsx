import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from '../../App';
import { BudgetProvider } from '../../context/BudgetContext';

// 사전 렌더링과 같은 방식(Node renderToString)으로 공개·관리 레이아웃을 나눠 그리는지 본다
const render = (url) => renderToString(
  <StaticRouter location={url}>
    <BudgetProvider>
      <App />
    </BudgetProvider>
  </StaticRouter>,
);

describe('공개·관리 레이아웃 분리', () => {
  it.each(['/admin', '/admin/partners', '/admin/unknown'])(
    'adminLayoutHasNoPublicChrome — %s 에는 공개 Header·Footer·광고·동의 배너가 없다',
    (url) => {
      const html = render(url);
      expect(html).toContain('data-layout="admin"');
      expect(html).not.toContain('<header class="bg-white/80');
      expect(html).not.toContain('광고 동의 설정');
      expect(html).not.toContain('adsbygoogle');
      expect(html).not.toContain('<footer');
    },
  );

  it.each(['/', '/calc', '/about'])('publicLayoutKeepsHeaderAndFooter — %s 는 그대로', (url) => {
    const html = render(url);
    expect(html).toContain('<header');
    expect(html).toContain('광고 동의 설정');
    expect(html).not.toContain('data-layout="admin"');
  });

  it('unknownPublicPathKeepsPublicChrome — 없는 공개 경로도 Header·Footer 는 그린다', () => {
    const html = render('/no-such-page');
    expect(html).toContain('<header');
    expect(html).toContain('<footer');
  });
});
