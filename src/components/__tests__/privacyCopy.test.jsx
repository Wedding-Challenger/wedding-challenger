import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import PrivacyPolicy from '../PrivacyPolicy';
import PrivacyPolicyPrevious from '../PrivacyPolicyPrevious';
import { ROUTES } from '../../config/routes';
import { readFileSync } from 'node:fs';
import About from '../About';
import ConsentBanner from '../ConsentBanner';

// 개인정보처리방침·소개 문구(계획서 B17, 승인 G4·G5). 시행일 실제 값은 운영 개통 전 사람이 정한다.
const raw = renderToString(<StaticRouter location="/privacy"><PrivacyPolicy /></StaticRouter>);
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"');

describe('개인정보처리방침 v1.1 문구', () => {
  const html = text(renderToString(<StaticRouter location="/privacy"><PrivacyPolicy /></StaticRouter>));

  it('section1DescribesAggregateMeasurement — 1항: 선정 안내·「광고」 표시·자체 합계 측정·식별자 없음·UTM, 예전 「추적 없음·클릭 미수집」 제거', () => {
    const section1 = html.slice(html.indexOf('1. 수집하는 개인정보 항목'), html.indexOf('2. 개인정보의 이용 목적'));
    expect(section1).toContain('웨딩챌린저가 선정해 노출하는 제휴 업체');
    expect(section1).toContain('「광고」를 표시');
    expect(section1).toContain('자체 측정 코드로 지면·날짜·기기군·광고 배치별 노출 수와 클릭 수의 합계');
    expect(section1).toContain('광고 쿠키나 이용자 식별자를 사용하지 않으며');
    expect(section1).toContain('UTM');
    expect(section1).not.toContain('추적 스크립트 없이');
    expect(section1).not.toContain('이동하는 정보를 서비스가 수집하지 않습니다');
    expect(section1).not.toContain('유료 제휴 업체');
    // 개인정보가 전혀 처리되지 않는다는 단정은 쓰지 않는다
    expect(section1).not.toContain('개인정보를 전혀');
  });

  it('section4Retention13MonthsAnd90Days — 4항: 제휴 합계·메모 13개월, 관리자 감사 90일', () => {
    expect(html).toContain('현재 월을 포함한 13개월');
    expect(html).toContain('90일');
  });

  it('effectiveDateAndComparison — 시행일 표기와 변경 전후 비교(이전 문구 보존)', () => {
    expect(html).toContain('시행일 공지 예정');
    expect(html).toContain('변경 전후 비교');
    expect(html).toContain('추적 스크립트 없이 제공되며'); // 이전 문구는 비교표에만
  });
});

// 리뷰 1판 지적 7: 이전 방침 전체를 보존한 페이지와 현재 방침 상단 변경 안내(비교·이전 버전 링크)
describe('변경 안내·이전 방침', () => {
  it('noticeLinksComparisonAndPrevious — 현재 방침 상단 「변경 안내」에 비교표·이전 방침 링크', () => {
    const notice = raw.indexOf('변경 안내');
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(raw.indexOf('1. 수집하는 개인정보 항목'));
    expect(raw).toContain('href="#privacy-changes"');
    expect(raw).toContain('id="privacy-changes"');
    expect(raw).toContain('href="/privacy/previous"');
  });

  it('previousPolicyKeptInFull — /privacy/previous 는 이전 방침 전문을 그대로 보존하고 현재 방침으로 연결', () => {
    const prev = text(renderToString(<StaticRouter location="/privacy/previous"><PrivacyPolicyPrevious /></StaticRouter>));
    expect(prev).toContain('이전 개인정보처리방침');
    expect(prev).toContain('제휴 업체 카드는 광고 쿠키나 추적 스크립트 없이 제공되며, 카드를 눌러 업체 홈페이지로 이동하는 정보를 서비스가 수집하지 않습니다.');
    expect(prev).toContain('이 기록은 90일간 보관한 뒤 파기합니다');
    for (const n of ['1.', '2.', '3.', '4.', '5.', '6.', '7.']) expect(prev).toContain(`${n} `);
    expect(renderToString(<StaticRouter location="/privacy/previous"><PrivacyPolicyPrevious /></StaticRouter>)).toContain('href="/privacy"');
  });

  it('previousRouteIsPrerenderedAndInSitemap — 사전 렌더 라우트·sitemap 목록에 같이 있다', () => {
    const paths = ROUTES.map((r) => r.path);
    expect(paths).toContain('/privacy/previous');
    const sitemap = readFileSync(new URL('../../../public/sitemap.xml', import.meta.url), 'utf8');
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    expect([...locs].sort()).toEqual([...paths].sort());
  });
});

describe('소개·동의 배너', () => {
  it('aboutUsesSharedNotice — 소개는 유료 한정 문구 대신 선정 안내·「광고」 표시', () => {
    const html = text(renderToString(<About />));
    expect(html).not.toContain('유료 제휴 업체');
    expect(html).toContain('웨딩챌린저가 선정해 노출');
    expect(html).toContain('「광고」');
  });

  it('consentBannerCopyUnchanged — 동의 배너 문구는 바꾸지 않는다(쿠키 중심)', () => {
    const html = text(renderToString(<StaticRouter location="/"><ConsentBanner open onDecide={() => {}} /></StaticRouter>));
    expect(html).toContain('웨딩챌린저는 서비스 운영(필수)과 맞춤 광고(선택)를 위해 쿠키를 사용합니다.');
  });
});
