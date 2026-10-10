// 제휴 노출 측정의 가림 신호 (계획서 §3.2 C1·C8·D1). 공개 레이아웃의 작은 context 가 이 상태를 들고, 측정 훅이 구독한다.
// - 전체 화면 모달(Onboarding): 마운트/언마운트로 등록·해제. 열려 있는 동안 모든 노출 타이머를 멈추고 초기화한다.
// - 동의 배너(ConsentBanner): open=true 로 렌더된 배너 div 에 ref 가 붙을 때 실측 높이를 등록하고, 떨어지면 0 으로 해제.
//   전체 정지가 아니라 IntersectionObserver rootMargin 아래쪽을 그 높이만큼 줄여 가린 영역만 뺀다.
// - 상단 sticky Header: 같은 방식으로 실측 높이를 등록해 rootMargin 위쪽에서 뺀다(헤더 뒤로 들어간 카드를 보인 것으로 세지 않게).
// 소유자 키(useId)로 등록하므로 StrictMode 의 cleanup→재실행 뒤에도 남는 등록이 없다. 공개 화면 메모리만 쓴다.

export const initialOverlay = { modals: {}, banners: {}, headers: {} };

export function overlayReducer(state, action) {
  switch (action.type) {
    case 'MODAL_OPEN':
      return state.modals[action.owner] ? state : { ...state, modals: { ...state.modals, [action.owner]: true } };
    case 'MODAL_CLOSE': {
      if (!state.modals[action.owner]) return state;
      const modals = { ...state.modals };
      delete modals[action.owner];
      return { ...state, modals };
    }
    case 'BANNER_HEIGHT':
      return setHeight(state, 'banners', action);
    case 'HEADER_HEIGHT':
      return setHeight(state, 'headers', action);
    default:
      return state;
  }
}

// 소유자별 높이 등록(0 이면 해제). 배너(하단)·Header(상단 sticky) 공통
function setHeight(state, key, action) {
  const height = Math.max(0, Math.ceil(action.height || 0));
  const map = state[key] ?? {};
  if ((map[action.owner] ?? 0) === height) return state;
  const next = { ...map };
  if (height > 0) next[action.owner] = height;
  else delete next[action.owner];
  return { ...state, [key]: next };
}

export const overlaySummary = (state) => ({
  suspended: Object.keys(state.modals).length > 0,
  bannerHeight: Math.max(0, ...Object.values(state.banners)),
  headerHeight: Math.max(0, ...Object.values(state.headers ?? {})),
});

const px = (n) => `${n ? `-${n}` : 0}px`;

// 위쪽은 sticky Header, 아래쪽은 하단 배너가 가린 높이만큼 뷰포트에서 뺀다(둘의 합은 뷰포트 높이까지, Header 먼저)
export function overlayRootMargin({ headerHeight = 0, bannerHeight = 0 }, viewportHeight) {
  const vh = Math.max(0, Math.floor(viewportHeight || 0));
  const top = Math.min(Math.max(0, Math.ceil(headerHeight || 0)), vh);
  const bottom = Math.min(Math.max(0, Math.ceil(bannerHeight || 0)), vh - top);
  return `${px(top)} 0px ${px(bottom)} 0px`;
}

export const bannerRootMargin = (bannerHeight, viewportHeight) => overlayRootMargin({ bannerHeight }, viewportHeight);

// 슬롯 측정 IntersectionObserver 옵션(usePartnerMetrics 가 provider 의 Header·배너 높이와 뷰포트 높이로 부른다).
// Header+배너 합산이 뷰포트 이상이거나 뷰포트를 아직 못 쟀으면 null — observer 를 만들지 않아 노출이 0 이다
// (높이 0 root 의 경계 교차를 브라우저마다 다르게 세지 않게).
export const OBSERVER_THRESHOLDS = [0, 0.25, 0.5, 0.75, 1];

export function buildObserverOptions(headerHeight, bannerHeight, viewportHeight) {
  const vh = Math.max(0, Math.floor(viewportHeight || 0));
  const covered = Math.max(0, Math.ceil(headerHeight || 0)) + Math.max(0, Math.ceil(bannerHeight || 0));
  if (!vh || covered >= vh) return null;
  return { rootMargin: overlayRootMargin({ headerHeight, bannerHeight }, vh), threshold: OBSERVER_THRESHOLDS };
}

// 옵션이 바뀔 때마다 새로 만드는 슬롯 observer. 만들 때 tracker 의 비율·연속 시간을 버려 연속 1초를 처음부터 잰다.
// elements 는 지금 붙은 카드 DOM → placementId Map(이후 붙는 카드는 observe 로). 옵션이 없거나 IntersectionObserver 가
// 없으면 아무것도 관찰하지 않는다. onChange 는 비율이 바뀔 때마다(타이머 재예약).
const NO_OBSERVER = { observe() {}, unobserve() {}, disconnect() {} };

export function createSlotObserver({ options, tracker, elements, onChange, IntersectionObserverImpl, now = () => performance.now() }) {
  tracker.reset();
  if (!options || !IntersectionObserverImpl) {
    onChange();
    return NO_OBSERVER;
  }
  const io = new IntersectionObserverImpl((entries) => {
    const t = now();
    for (const entry of entries) {
      const placementId = elements.get(entry.target);
      if (placementId == null) continue;
      tracker.observe(placementId, entry.target, entry.isIntersecting ? entry.intersectionRatio : 0, t);
    }
    onChange();
  }, options);
  elements.forEach((_, el) => io.observe(el));
  onChange();
  return {
    observe: (el) => io.observe(el),
    unobserve: (el) => io.unobserve(el),
    disconnect: () => io.disconnect(),
  };
}

// 배너·Header 요소의 ref 콜백 대상. attach(node) 는 붙을 때, attach(null) 은 떨어질 때(닫힘·언마운트) 부른다.
export function createBannerObserver({ onHeight, ResizeObserverImpl }) {
  let observer = null;
  const heightOf = (entry, node) => entry?.borderBoxSize?.[0]?.blockSize ?? node.getBoundingClientRect().height;
  return {
    attach(node) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (!node) {
        onHeight(0);
        return;
      }
      onHeight(node.getBoundingClientRect().height);
      if (!ResizeObserverImpl) return;
      const mine = new ResizeObserverImpl((entries) => {
        if (observer !== mine) return; // 해제된 observer 의 늦은 콜백
        const entry = entries[entries.length - 1];
        onHeight(heightOf(entry, node));
      });
      observer = mine;
      mine.observe(node);
    },
  };
}
