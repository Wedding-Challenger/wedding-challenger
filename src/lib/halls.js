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

// area 가 null 이면 전체. query 는 이름(원래·표시)과 위치에서 공백 무시하고 찾는다
export function filterHalls(halls, { area = null, query = '' } = {}) {
  const q = query.replace(/\s+/g, '').toLowerCase();
  return halls.filter((h) => {
    if (area && hallArea(h) !== area) return false;
    if (!q) return true;
    return [h.name, displayName(h.name), h.location]
      .some((v) => v?.replace(/\s+/g, '').toLowerCase().includes(q));
  });
}

export const hasPhoto = (hall) => !!hall.image && hall.image !== DEFAULT_HALL_IMAGE;
