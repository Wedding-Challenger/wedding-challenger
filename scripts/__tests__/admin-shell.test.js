import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createViteConfig, rewriteAdminUrl } from '../../vite.config.js';
import { withNoindexHeaders } from '../prerender.mjs';
import { NOINDEX_HEADER } from '../check-dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => readFileSync(path.join(root, f), 'utf8');

describe('admin 셸 원본', () => {
  it('adminHtmlIsEmptyNoindexShellWithoutAds — 빈 root·noindex·광고 없음·main.jsx 진입', () => {
    const html = read('admin.html');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).not.toContain('google-adsense-account');
    expect(html).not.toContain('googlesyndication');
    expect(html).not.toContain('%ADSENSE_CLIENT%');
    expect(html).toContain('src="/src/main.jsx"');
  });

  it('singleAdminRewrite — public/_redirects 는 /admin/* /admin 200 하나', () => {
    const rules = read('public/_redirects').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    expect(rules).toEqual(['/admin/* /admin 200']);
  });

  it('adminHeadersNoStoreNoindex — /admin·/admin/*·/admin.html 에 no-store·noindex', () => {
    const headers = read('public/_headers');
    for (const p of ['/admin', '/admin/*', '/admin.html']) {
      const block = headers.split(/\n(?=\S)/).find((b) => b.split('\n')[0].trim() === p);
      expect(block, p).toBeDefined();
      expect(block).toContain('Cache-Control: no-store');
      expect(block).toContain(NOINDEX_HEADER);
    }
    // 운영 공개 페이지에는 noindex 를 걸지 않는다
    expect(headers).not.toMatch(/^\/\*\s*$/m);
  });

  it('publicRoutesExcludeAdmin — sitemap·공개 라우트에 admin 없음', () => {
    expect(read('public/sitemap.xml')).not.toContain('/admin');
    expect(read('src/config/routes.js')).not.toContain('/admin');
  });
});

describe('admin 셸 빌드', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(['production', 'staging'])('clientBuildIncludesAdminHtml — %s client 빌드 입력에 admin.html', (mode) => {
    // test mode 가 넣어 둔 localhost API 값을 지워 mode 의 env 파일 값으로 검증한다
    vi.stubEnv('VITE_API_BASE_URL', undefined);
    const input = createViteConfig({ mode }).build.rolldownOptions.input;
    expect(Object.values(input).map((p) => path.relative(root, p)).sort()).toEqual(['admin.html', 'index.html']);
  });

  it('stagingHeadersAppendSiteWideNoindex — staging 은 admin 블록을 지우지 않고 /* noindex 를 덧붙인다', () => {
    const base = read('public/_headers');
    const merged = withNoindexHeaders(base);
    expect(merged.startsWith(base.trimEnd())).toBe(true);
    expect(merged).toMatch(new RegExp(`^/\\*\\n  ${NOINDEX_HEADER}\\n$`, 'm'));
    expect(withNoindexHeaders('')).toBe(`/*\n  ${NOINDEX_HEADER}\n`);
  });

  it.each([
    ['/admin', '/admin.html'],
    ['/admin/', '/admin.html'],
    ['/admin/partners', '/admin.html'],
    ['/admin/partners?x=1', '/admin.html'],
    ['/admin.html', '/admin.html'],
    ['/administrator', '/administrator'],
    ['/admin/assets/a.js', '/admin/assets/a.js'],
    ['/src/components/admin/PartnerAdmin.jsx', '/src/components/admin/PartnerAdmin.jsx'],
    ['/', '/'],
  ])('devServerServesAdminShell — %s → %s', (url, expected) => {
    expect(rewriteAdminUrl(url)).toBe(expected);
  });
});
