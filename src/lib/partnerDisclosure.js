// 제휴 카드 광고 표시(승인 G4·조율자 H3, 쿠팡식): 모든 지면 카드 오른쪽 아래 작은 「광고 ⓘ」를 항상 보이고,
// ⓘ 버튼(마우스 hover·키보드 포커스·탭)으로 안내 말풍선을 연다. 큰 「광고 · 제휴 업체」 배지·섹션 안내 문장은 두지 않는다.
// 문구는 서버 disclosure·disclosureNotice 를 쓰고, 없거나 이상하면 아래 같은 상수로 폴백한다(partnerFeed.toCard).

export const AD_LABEL = '광고';
export const AD_NOTICE = '웨딩챌린저가 선정해 노출하는 제휴 업체입니다.';
// 「광고」 글자색. 흰 카드·크림 바탕 모두 4.5:1 이상(partnerDisclosure.test.js 로 고정)
export const AD_LABEL_COLOR = '#6B6B6B';

const MAX_LABEL = 20;
const MAX_NOTICE = 120;

const cleanText = (value, max) => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  // 제어 문자·과도한 길이는 서버 오류로 보고 상수로 돌린다
  return text && text.length <= max && !/\p{Cc}/u.test(text) ? text : null;
};

export const disclosureLabel = (value) => cleanText(value, MAX_LABEL) ?? AD_LABEL;
export const disclosureNotice = (value) => cleanText(value, MAX_NOTICE) ?? AD_NOTICE;

// ---- WCAG 대비 ----

function luminance(hex) {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? [...n].map((c) => c + c).join('') : n;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) =>
    (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---- ⓘ 말풍선 상태 ----
// hover(마우스만)·focus(키보드·탭)·pinned(탭으로 고정) 중 하나라도 있으면 연다.
// 탭(click)은 열려 있으면 모두 닫고, 닫혀 있으면 고정해서 연다. 포커스가 빠지거나 Esc 면 닫는다.

export const initialDisclosure = { hover: false, focus: false, pinned: false };

export const isDisclosureOpen = (s) => s.hover || s.focus || s.pinned;

export function disclosureReducer(s, action) {
  switch (action.type) {
    case 'HOVER':
      return { ...s, hover: action.value };
    case 'FOCUS':
      return action.value ? { ...s, focus: true } : { ...s, focus: false, pinned: false };
    case 'TOGGLE':
      // 터치는 포커스와 click 이 같이 온다. 포커스로 막 열렸으면(아직 고정 안 됨) 첫 탭은 고정만 한다
      if (s.pinned) return initialDisclosure;
      return { ...s, pinned: true };
    case 'ESCAPE':
      return initialDisclosure;
    default:
      return s;
  }
}

// ---- 말풍선 위치 ----
// 기본은 「광고 ⓘ」 오른쪽 끝에 맞춰 왼쪽으로 펼친다(카드 오른쪽 아래). 화면 왼쪽을 넘으면 왼쪽 끝에 맞춰 오른쪽으로,
// 그래도 넘치면 화면 안(여백 8px)으로 민다. anchor 는 「광고 ⓘ」 묶음의 화면 좌표.
export const TOOLTIP_WIDTH = 240;
const EDGE = 8;

export function tooltipAlign(anchor, viewportWidth) {
  const width = Math.min(TOOLTIP_WIDTH, viewportWidth - EDGE * 2);
  if (anchor.right - width >= EDGE) return { side: 'right', shift: 0 };
  if (anchor.left + width <= viewportWidth - EDGE) return { side: 'left', shift: 0 };
  const shift = Math.max(viewportWidth - EDGE - width - anchor.left, EDGE - anchor.left);
  return { side: 'left', shift: Math.round(shift) };
}
