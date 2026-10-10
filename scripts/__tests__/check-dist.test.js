import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_REDIRECT, checkDist, DEV_ROBOTS, NOINDEX_HEADER } from '../check-dist.mjs';
import { ORIGINS } from '../build-config.mjs';
import { ADSENSE_CLIENT, ADSENSE_PUBLISHER_ID } from '../../src/config/ads.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const publicFile = (f) => readFileSync(path.join(root, 'public', f), 'utf8');
const routes = [...publicFile('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

const ADMIN_HEADERS = ['/admin', '/admin/*', '/admin.html']
  .map((p) => `${p}\n  Cache-Control: no-store\n  X-Robots-Tag: noindex, nofollow\n`)
  .join('');

const ADMIN_HTML = (extraHead = '') => `<!doctype html>
<html lang="ko"><head><meta charset="UTF-8" /><meta name="robots" content="noindex, nofollow" />${extraHead}<title>제휴 업체 관리 - 웨딩챌린저</title></head>
<body><div id="root"></div><script type="module" src="/assets/admin.js"></script></body></html>`;

const SIDE_ROUTES = ['/guide', '/checklist'];

let dirs = [];
afterEach(() => {
  dirs.forEach((d) => rmSync(d, { recursive: true, force: true }));
  dirs = [];
});

// 정상 산출물 한 벌(사전 렌더링 7 라우트 + admin 셸 + rewrite·headers)을 임시 디렉터리에 만든다
function makeDist(mode) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wc-dist-'));
  dirs.push(dir);
  const production = mode === 'production';
  const site = ORIGINS[mode].site[0];
  const write = (f, s) => {
    mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    writeFileSync(path.join(dir, f), s);
  };
  for (const p of routes) {
    const url = site + p;
    const robots = production ? 'index, follow' : 'noindex, nofollow';
    const ads = production ? `<meta name="google-adsense-account" content="${ADSENSE_CLIENT}" />` : '';
    // /guide·/checklist 는 추적 mode 파일의 레이아웃 플래그(초기 false) 표식을 갖는다
    const side = SIDE_ROUTES.includes(p) ? '<div data-partner-side-layout="false"><section>본문</section></div>' : '';
    write(p === '/' ? 'index.html' : `${p.slice(1)}.html`,
      `<html><head><meta name="robots" content="${robots}" />${ads}<link rel="canonical" href="${url}" /><meta property="og:url" content="${url}" /></head><body><div id="root"><main>본문${side}</main></div></body></html>`);
  }
  write('admin.html', ADMIN_HTML());
  write('_redirects', `${ADMIN_REDIRECT}\n`);
  write('assets/index.js', `const api = "${ORIGINS[mode].api[0]}";`);
  if (production) {
    write('ads.txt', `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`);
    write('sitemap.xml', publicFile('sitemap.xml'));
    write('robots.txt', publicFile('robots.txt'));
    write('_headers', ADMIN_HEADERS);
  } else {
    write('robots.txt', DEV_ROBOTS);
    write('_headers', `${ADMIN_HEADERS}/*\n  ${NOINDEX_HEADER}\n`);
  }
  return { dir, write };
}

describe('check-dist admin 셸', () => {
  it.each(['production', 'staging'])('adminShellPassesInBothModes — %s 정상 산출물은 통과', (mode) => {
    const { dir } = makeDist(mode);
    expect(checkDist(mode, dir)).toEqual([]);
  });

  it.each([
    ['admin.html 없음', (d) => rmSync(path.join(d.dir, 'admin.html')), /admin\.html/],
    ['admin 셸에 사전 렌더링 본문', (d) => d.write('admin.html', ADMIN_HTML().replace('<div id="root"></div>', '<div id="root"><header>x</header></div>')), /admin\.html.*빈 root/],
    ['admin 셸 색인 허용', (d) => d.write('admin.html', ADMIN_HTML().replace('noindex, nofollow', 'index, follow')), /admin\.html.*noindex/],
    ['admin 셸 광고 계정 meta', (d) => d.write('admin.html', ADMIN_HTML(`<meta name="google-adsense-account" content="${ADSENSE_CLIENT}" />`)), /admin\.html.*광고/],
    ['admin 셸 광고 스크립트', (d) => d.write('admin.html', ADMIN_HTML('<script async src="https://pagead2.googlesyndication.com/x.js"></script>')), /admin\.html.*광고/],
    ['_redirects 없음', (d) => rmSync(path.join(d.dir, '_redirects')), /_redirects/],
    ['/admin 규칙 추가', (d) => d.write('_redirects', `${ADMIN_REDIRECT}\n/admin /admin.html 200\n`), /_redirects/],
    ['.html 대상 rewrite', (d) => d.write('_redirects', '/admin/* /admin.html 200\n'), /_redirects/],
    ['admin no-store 없음', (d) => d.write('_headers', ADMIN_HEADERS.replaceAll('Cache-Control: no-store', 'Cache-Control: max-age=60')), /_headers.*\/admin/],
    ['/admin.html 헤더 없음', (d) => d.write('_headers', ADMIN_HEADERS.split('/admin.html')[0]), /_headers.*\/admin\.html/],
  ])('adminShellViolationsFail — %s', (_, mutate, message) => {
    const d = makeDist('production');
    mutate(d);
    const problems = checkDist('production', d.dir);
    expect(problems.join('\n')).toMatch(message);
  });

  it('productionAllowsNoindexOnlyForAdminPaths — 운영 전체 X-Robots-Tag 는 여전히 실패', () => {
    const d = makeDist('production');
    d.write('_headers', `${ADMIN_HEADERS}/*\n  ${NOINDEX_HEADER}\n`);
    expect(checkDist('production', d.dir).join('\n')).toMatch(/X-Robots-Tag/);
  });

  it('stagingKeepsSiteWideNoindexWithAdminBlocks — staging 은 /* noindex 가 빠지면 실패', () => {
    const d = makeDist('staging');
    d.write('_headers', ADMIN_HEADERS);
    expect(checkDist('staging', d.dir).join('\n')).toMatch(/\/\*/);
  });
});

// 레이아웃 플래그 dist 계약(계획서 D3): mode 별 추적 파일의 값과 prerender /guide·/checklist 표식이 일치해야 한다.
// data-partner-side-layout 는 정확히 하나, data-partner-side-column 은 true 일 때만 정확히 하나.
describe('check-dist 제휴 사이드 레이아웃 표식', () => {
  const page = (layout, column) => `<html><head><meta name="robots" content="noindex, nofollow" /></head><body><div id="root"><main>${layout}${column}</main></div></body></html>`;
  const setSide = (d, mode, html) => {
    const site = ORIGINS[mode].site[0];
    for (const p of SIDE_ROUTES) {
      const url = site + p;
      d.write(`${p.slice(1)}.html`, html.replace('<head>', `<head><link rel="canonical" href="${url}" /><meta property="og:url" content="${url}" />`));
    }
  };

  it.each(['production', 'staging'])('trackedFalseMatchesPrerender — %s 추적 파일 false 와 표식 false 는 통과', (mode) => {
    const { dir } = makeDist(mode);
    expect(checkDist(mode, dir)).toEqual([]);
  });

  it('trueRequiresSingleSideColumn — true 면 사이드 열 표식 정확히 하나', () => {
    const d = makeDist('staging');
    setSide(d, 'staging', page('<div data-partner-side-layout="true">', '<aside data-partner-side-column></aside></div>'));
    expect(checkDist('staging', d.dir, { sideLayout: true })).toEqual([]);
    // 같은 산출물을 추적값 false 로 검사하면 불일치
    expect(checkDist('staging', d.dir).join('\n')).toMatch(/guide\.html.*data-partner-side-layout/);
  });

  it.each([
    ['표식 누락', page('<div>', '</div>'), false, /guide\.html.*data-partner-side-layout/],
    ['표식 중복', page('<div data-partner-side-layout="false"><div data-partner-side-layout="false">', '</div></div>'), false, /checklist\.html.*data-partner-side-layout/],
    ['역값', page('<div data-partner-side-layout="true">', '<aside data-partner-side-column></aside></div>'), false, /guide\.html.*data-partner-side-layout/],
    ['false 인데 빈 사이드 열', page('<div data-partner-side-layout="false">', '<aside data-partner-side-column></aside></div>'), false, /guide\.html.*data-partner-side-column/],
    ['true 인데 사이드 열 없음', page('<div data-partner-side-layout="true">', '</div>'), true, /guide\.html.*data-partner-side-column/],
    ['true 인데 사이드 열 둘', page('<div data-partner-side-layout="true">', '<aside data-partner-side-column></aside><aside data-partner-side-column></aside></div>'), true, /guide\.html.*data-partner-side-column/],
  ])('sideLayoutViolationsFail — %s', (_, html, sideLayout, message) => {
    const d = makeDist('production');
    setSide(d, 'production', html.replace('noindex, nofollow', 'index, follow').replace('<head>', `<head><meta name="google-adsense-account" content="${ADSENSE_CLIENT}" />`));
    const problems = checkDist('production', d.dir, { sideLayout });
    expect(problems.join('\n')).toMatch(message);
  });
});
