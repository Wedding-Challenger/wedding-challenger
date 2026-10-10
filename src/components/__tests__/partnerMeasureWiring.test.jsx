import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

// 리뷰 2판 지적 3: 헤더 가림이 Header ref → provider → usePartnerMetrics → observer 옵션까지 실제로 이어지는지 고정한다.
// jsdom 없이 renderToString·엘리먼트 트리와 모듈 mock 으로 본다(effect·실제 IntersectionObserver 는 브라우저 수락).
// 조립 함수 자체(buildObserverOptions·createSlotObserver)는 src/lib/__tests__/partnerOverlay.test.js.
const probe = vi.hoisted(() => ({ registered: false }));

vi.mock('../../lib/partnerOverlay', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    buildObserverOptions: vi.fn(actual.buildObserverOptions),
    // provider 가 Header·배너 높이가 이미 등록된 상태로 시작하게(SSR 에는 ref 콜백이 없다)
    get initialOverlay() {
      return probe.registered ? { modals: {}, banners: { 'banner:1': 120 }, headers: { 'header:1': 64 } } : actual.initialOverlay;
    },
  };
});

vi.mock('../../context/partnerMeasureShared', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useOverlayHeader: vi.fn(actual.useOverlayHeader) };
});

const { buildObserverOptions } = await import('../../lib/partnerOverlay');
const shared = await import('../../context/partnerMeasureShared');
const { default: PartnerMeasureProvider } = await import('../../context/PartnerMeasureProvider');
const { default: usePartnerMetrics } = await import('../../hooks/usePartnerMetrics');
const { Header } = await import('../../App');

afterEach(() => {
  probe.registered = false;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function MetricsProbe() {
  usePartnerMetrics({ slot: 'HOME_MAIN', items: [], prepareSend: async () => null });
  return null;
}

describe('헤더 가림 연결', () => {
  it('headerAttachesOverlayRef — 공개 Header 요소에 useOverlayHeader 의 ref 를 붙인다', () => {
    const ref = () => {};
    shared.useOverlayHeader.mockReturnValueOnce(ref);
    const tree = Header();
    expect(tree.type).toBe('header');
    expect(tree.props.ref).toBe(ref);
  });

  it('overlayHeaderRefRegistersHeight — ref 가 붙으면 실측 높이를 HEADER_HEIGHT 로 provider 에 등록, 떨어지면 0', () => {
    const dispatch = vi.fn();
    let ref;
    function RefProbe() {
      ref = shared.useOverlayHeader();
      return null;
    }
    renderToString(
      <shared.PartnerMeasureContext.Provider value={{ ledger: null, overlay: {}, dispatch }}>
        <RefProbe />
      </shared.PartnerMeasureContext.Provider>,
    );
    ref({ getBoundingClientRect: () => ({ height: 72 }) });
    expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'HEADER_HEIGHT', height: 72 }));
    ref(null);
    expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'HEADER_HEIGHT', height: 0 }));
  });

  it('providerHeightsReachObserverOptions — provider 의 Header·배너 높이와 뷰포트가 buildObserverOptions 로 간다', () => {
    probe.registered = true;
    vi.stubGlobal('window', { innerHeight: 700 });
    renderToString(
      <StaticRouter location="/">
        <PartnerMeasureProvider>
          <MetricsProbe />
        </PartnerMeasureProvider>
      </StaticRouter>,
    );
    expect(buildObserverOptions).toHaveBeenCalledWith(64, 120, 700);
  });

  it('noProviderStillBuildsUncoveredOptions — 공급자 밖이면 가림 0 으로 조립', () => {
    vi.stubGlobal('window', { innerHeight: 700 });
    renderToString(<MetricsProbe />);
    expect(buildObserverOptions).toHaveBeenCalledWith(0, 0, 700);
  });
});
