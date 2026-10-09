// 웨딩홀 목록 표시용 순수 함수 (이름 다듬기, 지역 묶기, 필터).

const DEFAULT_HALL_IMAGE = '/images/wedding/hall-default.svg';

// 끝에 붙은 괄호 덩어리(중첩 포함)의 시작 위치. 없으면 -1
function trailingParenStart(s) {
  if (!s.endsWith(')')) return -1;
  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ')') depth++;
    else if (s[i] === '(' && --depth === 0) return i;
  }
  return -1;
}

// '서울신라호텔((주)호텔신라)' → '서울신라호텔', '(주)봄날앤' → '봄날앤'.
// 참가격 상호에는 운영 법인·지점명이 괄호로 붙어 있어 화면에서는 뗀다.
export function displayName(name) {
  if (!name) return '';
  let s = name.trim().replace(/^(\(주\)|㈜|주식회사)\s*/, '');
  const i = trailingParenStart(s);
  if (i > 0) s = s.slice(0, i).trim();
  return s || name.trim();
}

// 위치 첫 단어로 지역을 묶는다 ('서울 강남구' → '서울', '전남광주 여수시' → '전남광주')
export function hallArea(hall) {
  return hall.location?.trim().split(/\s+/)[0] || '기타';
}

// [{ area, count }] — 웨딩홀이 많은 지역부터
export function areaCounts(halls) {
  const counts = new Map();
  for (const h of halls) counts.set(hallArea(h), (counts.get(hallArea(h)) ?? 0) + 1);
  return [...counts].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count);
}

// 위치 둘째 단어가 시·군·구 ('서울 강남구' → '강남구'). '세종'처럼 한 단어면 null
export function hallDistrict(hall) {
  return hall.location?.trim().split(/\s+/)[1] || null;
}

// 시·군·구가 없는 웨딩홀을 묶는 칩 값
export const NO_DISTRICT = '기타';

// [{ district, count }] — area 안에서 많은 순(같으면 가나다), 시·군·구 없는 곳은 맨 뒤 NO_DISTRICT 로
export function districtCounts(halls, area) {
  const counts = new Map();
  let none = 0;
  for (const h of halls) {
    if (hallArea(h) !== area) continue;
    const d = hallDistrict(h);
    if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
    else none++;
  }
  const list = [...counts]
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count || a.district.localeCompare(b.district, 'ko'));
  return none ? [...list, { district: NO_DISTRICT, count: none }] : list;
}

// area 가 null 이면 전체. district 는 area 와 함께일 때만 본다(NO_DISTRICT 는 시·군·구 없는 곳).
// query 는 이름(원래·표시)과 위치에서 공백 무시하고 찾는다
export function filterHalls(halls, { area = null, district = null, query = '' } = {}) {
  const q = query.replace(/\s+/g, '').toLowerCase();
  return halls.filter((h) => {
    if (area && hallArea(h) !== area) return false;
    if (area && district && (hallDistrict(h) ?? NO_DISTRICT) !== district) return false;
    if (!q) return true;
    return [h.name, displayName(h.name), h.location]
      .some((v) => v?.replace(/\s+/g, '').toLowerCase().includes(q));
  });
}

export const hasPhoto = (hall) => !!hall.image && hall.image !== DEFAULT_HALL_IMAGE;

// 사진이 없는 웨딩홀에 쓰는 AI 일러스트 (원본: 레포 image/ 폴더). 실제 사진이 아니므로 화면에 '일러스트'로 표시한다.
const ILLUSTRATION_BASE = '/images/halls';

// 전용 일러스트가 있는 업체 (정규화 이름에 포함되면 사용)
const VENUE_ILLUSTRATIONS = [
  ['더파티움', 'the-partium'],
  ['제이케이아트', 'jk-art'],
  ['플로팅아일랜드', 'floating-island'],
  ['마리나파크웨딩홀', 'marina-park'],
  ['소노펠리체컨벤션', 'sono-felice'],
];

// 지역(hallArea) → 지역 일러스트
const AREA_ILLUSTRATIONS = {
  서울: 'seoul', 경기: 'gyeonggi', 인천: 'incheon', 부산: 'busan', 대구: 'daegu', 대전: 'daejeon',
  울산: 'ulsan', 광주: 'gwangju', 제주: 'jeju', 강원: 'gangwon',
  충북: 'chungcheong', 충남: 'chungcheong', 세종: 'chungcheong',
  전북: 'jeolla', 전남: 'jeolla', 전남광주: 'jeolla',
  경북: 'gyeongsang', 경남: 'gyeongsang',
};

const compact = (s) => displayName(s).replace(/\s+/g, '');

export function hallIllustration(hall) {
  const name = compact(hall.name ?? '');
  const venue = VENUE_ILLUSTRATIONS.find(([key]) => name.includes(key));
  if (venue) return `${ILLUSTRATION_BASE}/venues/${venue[1]}.webp`;
  // 참가격 지역 구분은 서울을 강남/강남 외로 나눈다
  if (hall.region === '서울(강남)') return `${ILLUSTRATION_BASE}/regions/seoul-gangnam.webp`;
  const key = AREA_ILLUSTRATIONS[hallArea(hall)] ?? 'nationwide';
  return `${ILLUSTRATION_BASE}/regions/${key}.webp`;
}

// ── 돈 조건 필터 (계산기 전용) ──────────────────────────────────────────
// 웨딩홀 가격 범위가 사용자 범위에 맞는지. user=null 은 상관없음.
// 'inside'(기본, 2026-10-02 확정): 웨딩홀 [min,max] 가 사용자 범위 안에 완전히 들어와야 통과
// 'overlap': 두 범위가 조금이라도 겹치면 통과 (써 보고 너무 빡빡하면 이걸로 바꾼다)
export function rangeMatches(hallRange, user, mode = 'inside') {
  if (!user) return true;
  const lo = hallRange.min;
  const hi = hallRange.max ?? hallRange.min;
  if (mode === 'overlap') {
    return (user.max == null || lo <= user.max) && (user.min == null || hi >= user.min);
  }
  return (user.min == null || lo >= user.min) && (user.max == null || hi <= user.max);
}

// 하객 수 기준 웨딩홀 최소 예상 총액 (식대 최저 × 하객 + 대관료 최저 + 데코 최저)
export function hallMinTotal(hall, guestCount) {
  const { food, rent, deco } = hall.priceBreakdown;
  return food.min * guestCount + (rent.min ?? 0) + (deco.min ?? 0);
}

// 대관료가 공개되지 않은 웨딩홀(조사 자료에 값 없음) — 대관료 조건과 상관없이 보여 준다
export const rentDisclosed = (hall) => hall.rentDisclosed !== false;

// hallBudget: 웨딩홀에 쓸 수 있는 남은 예산 (전체 예산 − 웨딩홀 외 바구니 항목 최소 금액). null 이면 예산 비교 안 함
// excludedBy 는 조건별로 걸린 수 (한 웨딩홀이 여러 조건에 걸리면 각각 센다)
export function budgetFilter(halls, { hallBudget = null, guestCount, rentRange = null, foodRange = null, mode = 'inside' } = {}) {
  const excludedBy = { total: 0, rent: 0, food: 0 };
  const passed = [];
  for (const h of halls) {
    let ok = true;
    if (!rangeMatches(h.priceBreakdown.food, foodRange, mode)) { excludedBy.food++; ok = false; }
    if (rentDisclosed(h) && !rangeMatches(h.priceBreakdown.rent, rentRange, mode)) { excludedBy.rent++; ok = false; }
    if (hallBudget !== null && hallMinTotal(h, guestCount) > hallBudget) { excludedBy.total++; ok = false; }
    if (ok) passed.push(h);
  }
  return { passed, excludedBy };
}
