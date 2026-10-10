import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

// 홈 슬롯 on/off·0건·실패·만료는 서버 응답 + partnerFeed 판정(빈 목록)으로 들어온다. 여기서는 결과만 주입한다.
const feed = vi.hoisted(() => ({ items: {} }));
vi.mock('../../hooks/usePartnerFeed', () => ({
  default: (slot) => ({ items: feed.items[slot] ?? [], prepareSend: async () => null }),
}));

const { default: PublicLanding } = await import('../PublicLanding');

const item = (id) => ({
  placementId: id,
  partnerId: id,
  name: `샘플 업체 ${id}`,
  category: 'WEDDING_HALL',
  region: '서울',
  summary: '승인받은 소개 문구',
  imageUrl: null,
  destinationUrl: `https://example.com/${id}`,
});

const render = () => renderToString(<StaticRouter location="/"><PublicLanding adsEnabled={false} /></StaticRouter>);

afterEach(() => { feed.items = {}; });

describe('홈 제휴 업체 줄', () => {
  it('fallsBackToHallRowWithoutPartners — 제휴 없음(슬롯 off·0건·실패)이면 지금 웨딩홀 줄 그대로', () => {
    const html = render();
    expect(html).toContain('예식장 비교');
    expect(html).not.toContain('광고 · 제휴 업체');
  });

  it('replacesHallRowWithPartnerRow — 제휴가 있으면 웨딩홀 줄을 제휴 업체 줄로 바꾼다(일반 업체·필터 없음)', () => {
    feed.items.HOME_MAIN = [item(1), item(2), item(3)];
    const html = render();
    expect(html).toMatch(/<h2[^>]*>제휴 업체<\/h2>/);
    // 승인 G4: 섹션 안내 문장·큰 배지 대신 카드마다 「광고 ⓘ」 하나(접근성 이름에도 「광고」가 들어간다)
    expect(html).not.toContain('광고료를 받고 노출하는 제휴 업체입니다');
    expect(html).not.toContain('예식장 비교');
    expect(html.match(/aria-label="광고 안내 보기"/g)).toHaveLength(3);
    expect(html.match(/ — 광고, 업체 홈페이지 보기/g)).toHaveLength(3);
    // 다른 카테고리 줄은 그대로
    expect(html).toContain('스튜디오');
  });

  it('firstRenderHasNoClonesOrAutoplayControls — 측정 전(사전 렌더링·첫 렌더)은 정지 목록, 복제 트랙 없음', () => {
    feed.items.HOME_MAIN = [item(1), item(2), item(3)];
    const html = render();
    expect(html).not.toContain('inert');
    expect(html).not.toContain('일시정지');
    // 원본 카드는 한 번만
    expect(html.match(/href="https:\/\/example.com\/1"/g)).toHaveLength(1);
  });

  it('budgetSlotDoesNotLeakToHome — 예산 슬롯 항목은 홈에 나오지 않는다', () => {
    feed.items.BUDGET_PARTNERS = [item(9)];
    const html = render();
    expect(html).toContain('예식장 비교');
    expect(html).not.toContain('샘플 업체 9');
  });
});
