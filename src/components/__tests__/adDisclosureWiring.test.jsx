import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

// 리뷰 2판 지적 3: AdDisclosure 가 portal 대상·hover 유예·Esc·언마운트 정리를 맡는 컨트롤러(src/lib/disclosureController.js)를
// 실제로 쓰는지 고정한다. jsdom 없이 사전 렌더링과 같은 renderToString + 모듈 mock 으로 본다. 컨트롤러 자체 동작은
// src/lib/__tests__/disclosureController.test.js, 실제 DOM(hover 이동·Esc·Shift+Tab)은 브라우저 수락이 맡는다.
const probe = vi.hoisted(() => ({ open: false, created: [], portals: [] }));

vi.mock('../../lib/disclosureController', () => ({
  createDisclosureController: vi.fn((options) => {
    const controller = {
      options,
      attachAnchor: () => {},
      portalTarget: () => 'PORTAL_TARGET',
      // 이벤트 핸들러는 HTML 에 나오지 않으므로 data 속성으로 어느 요소에 펼쳤는지 본다
      triggerProps: { 'data-ctl': 'trigger', onFocus: () => {} },
      tooltipProps: { 'data-ctl': 'tooltip' },
      opened: vi.fn(),
      dispose: vi.fn(),
    };
    probe.created.push(controller);
    return controller;
  }),
}));

vi.mock('../../lib/partnerDisclosure', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // 열린 상태로 그려 portal 연결을 본다(SSR 은 이벤트가 없다)
    get initialDisclosure() {
      return probe.open ? { ...actual.initialDisclosure, pinned: true } : actual.initialDisclosure;
    },
  };
});

// 서버 렌더러는 portal 을 그리지 못하므로 대상만 기록하고 그 자리에 그린다
vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  createPortal: (node, target) => {
    probe.portals.push(target);
    return node;
  },
}));

const { default: AdDisclosure } = await import('../AdDisclosure');

afterEach(() => {
  probe.open = false;
  probe.created.length = 0;
  probe.portals.length = 0;
});

describe('광고 ⓘ — 컨트롤러 연결', () => {
  it('usesControllerForTrigger — 컨트롤러를 한 번 만들고 트리거 버튼에 그 핸들러를 펼친다(닫힌 동안 말풍선 없음)', () => {
    const html = renderToString(<AdDisclosure notice="안내 문구" />);
    expect(probe.created).toHaveLength(1);
    const { options } = probe.created[0];
    expect(typeof options.dispatch).toBe('function');
    expect(typeof options.setPosition).toBe('function');
    expect(html).toMatch(/<button[^>]*data-ctl="trigger"[^>]*aria-label="광고 안내 보기"|<button[^>]*aria-label="광고 안내 보기"[^>]*data-ctl="trigger"/);
    expect(html).not.toContain('role="tooltip"');
    expect(probe.portals).toHaveLength(0);
  });

  it('tooltipPortalsToControllerTarget — 열리면 말풍선을 컨트롤러 portal 대상으로, 말풍선에 hover 핸들러를 펼친다', () => {
    probe.open = true;
    const html = renderToString(<AdDisclosure notice="안내 문구" />);
    expect(probe.portals).toEqual(['PORTAL_TARGET']);
    expect(html).toMatch(/role="tooltip"[^>]*data-ctl="tooltip"|data-ctl="tooltip"[^>]*role="tooltip"/);
    expect(html).toContain('안내 문구');
    expect(html).toContain('aria-expanded="true"');
  });
});
