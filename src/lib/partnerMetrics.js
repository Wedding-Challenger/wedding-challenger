// 제휴 노출·클릭 측정의 순수 판정 (계획서 §3.2 C1·B4·C11). React·DOM 연결은 src/hooks/usePartnerMetrics.js.
// - 가시 노출: 카드 면적 50% 이상이 가림을 뺀 뷰포트 안에 연속 1,000ms + 문서 visible + 전체 화면 모달 닫힘 → 1회.
//   원본·inert 복제 DOM 은 같은 카드로 합치고 비율은 최댓값(합산 금지). 조건이 끊기면 처음부터 다시 잰다.
// - 페이지뷰(공개 route 진입) 안에서 (slot, placementId, eventType) 마다 최대 1회. 페이지뷰 ID 는 만들거나 보내지 않는다.
// - 클릭: 링크 기본 활성화(좌클릭·터치·Enter)와 중간 버튼 새 탭만. 우클릭 메뉴는 세지 않는다.
// - 전송 본문은 {placementId, slot, eventType, measurementToken} 하나뿐. 토큰 남은 시간 11초 이하면 전송 전에 재조회한다
//   (hidden·타이머 지연 대비. 정상 최대 50초 재조회 주기에서는 여유가 충분하다).

export const VIEW_RATIO = 0.5;
export const VIEW_MS = 1000;
export const TOKEN_REFRESH_MS = 11000;
export const EVENT_TYPES = ['IMPRESSION', 'CLICK'];
export const METRIC_SLOTS = ['HOME_MAIN', 'BUDGET_PARTNERS', 'GUIDE_SIDEBAR', 'CHECKLIST_SIDEBAR'];

export function createImpressionTracker() {
  const cards = new Map(); // key → { ratios: Map(element → ratio), since: number|null, done: boolean }
  let documentVisible = true;
  let suspended = false;

  const card = (key) => {
    if (!cards.has(key)) cards.set(key, { ratios: new Map(), since: null, done: false });
    return cards.get(key);
  };
  const maxRatio = (c) => Math.max(0, ...c.ratios.values());
  const update = (c, t) => {
    const eligible = documentVisible && !suspended && maxRatio(c) >= VIEW_RATIO;
    if (!eligible) c.since = null;
    else if (c.since == null) c.since = t;
  };
  const updateAll = (t) => cards.forEach((c) => update(c, t));

  return {
    observe(key, element, ratio, t) {
      const c = card(key);
      c.ratios.set(element, ratio);
      update(c, t);
    },
    forget(key, element, t) {
      const c = cards.get(key);
      if (!c) return;
      c.ratios.delete(element);
      update(c, t);
    },
    setDocumentVisible(value, t) {
      documentVisible = value;
      updateAll(t);
    },
    setSuspended(value, t) {
      suspended = value;
      updateAll(t);
    },
    // observer 를 새로 만들 때: 이전 비율·연속 시간을 버린다(검증 안 된 시간을 잇지 않음). 이미 센 카드는 그대로.
    reset() {
      cards.forEach((c) => {
        c.ratios.clear();
        c.since = null;
      });
    },
    due(t) {
      const keys = [];
      cards.forEach((c, key) => {
        if (!c.done && c.since != null && t - c.since >= VIEW_MS) {
          c.done = true;
          keys.push(key);
        }
      });
      return keys;
    },
    nextDueAt() {
      let at = null;
      cards.forEach((c) => {
        if (!c.done && c.since != null && (at == null || c.since + VIEW_MS < at)) at = c.since + VIEW_MS;
      });
      return at;
    },
  };
}

// 한 페이지뷰의 측정 기록과 업종 순환 고정. 공개 레이아웃이 route(pathname)가 바뀔 때만 새로 만든다.
export function createPageViewLedger() {
  const marked = new Set();
  const pins = new Map();
  return {
    markOnce(slot, placementId, eventType) {
      const key = `${slot}:${placementId}:${eventType}`;
      if (marked.has(key)) return false;
      marked.add(key);
      return true;
    },
    pinsFor(slot) {
      return {
        read: () => pins.get(slot) ?? {},
        write: (next) => pins.set(slot, next),
      };
    },
  };
}

export function countableActivation(event) {
  if (event.type === 'click') return event.button === 0;
  if (event.type === 'auxclick') return event.button === 1;
  return false;
}

export function tokenNeedsRefresh(item, now) {
  if (!item?.measurementToken || item.measurementTokenExpiresAt == null) return true;
  return item.measurementTokenExpiresAt - now <= TOKEN_REFRESH_MS;
}

// 엄격한 단일 이벤트 본문. 알려진 필드·enum·양의 정수 ID·비어 있지 않은 토큰만.
export function metricBody({ placementId, slot, eventType, measurementToken }) {
  if (!Number.isSafeInteger(placementId) || placementId <= 0) throw new Error('placementId 는 양의 정수');
  if (!METRIC_SLOTS.includes(slot)) throw new Error(`알 수 없는 제휴 슬롯: ${slot}`);
  if (!EVENT_TYPES.includes(eventType)) throw new Error(`알 수 없는 측정 이벤트: ${eventType}`);
  if (typeof measurementToken !== 'string' || !measurementToken) throw new Error('측정 토큰 없음');
  return JSON.stringify({ placementId, slot, eventType, measurementToken });
}
