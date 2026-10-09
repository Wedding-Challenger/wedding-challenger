// 가로 스크롤 목록 아래 커스텀 스크롤바의 위치 계산 (순수 함수).
// 숫자는 모두 px. 결과의 left/width 는 트랙 대비 % (0~100).

// 썸이 너무 작아지지 않게 하는 최소 폭(트랙 대비 %)
export const MIN_THUMB_PCT = 8;

export function thumbGeometry({ scrollLeft, scrollWidth, clientWidth }) {
  if (!(scrollWidth > clientWidth + 1)) return null; // 넘치지 않으면 스크롤바 없음
  const width = Math.max((clientWidth / scrollWidth) * 100, MIN_THUMB_PCT);
  const maxScroll = scrollWidth - clientWidth;
  const ratio = Math.min(Math.max(scrollLeft / maxScroll, 0), 1);
  return { width, left: ratio * (100 - width) };
}

// 썸을 dx(px)만큼 끌었을 때의 새 scrollLeft
export function scrollFromThumbDrag({ startScrollLeft, dx, trackWidth, scrollWidth, clientWidth }) {
  const geo = thumbGeometry({ scrollLeft: startScrollLeft, scrollWidth, clientWidth });
  if (!geo || trackWidth <= 0) return startScrollLeft;
  const movable = trackWidth * (1 - geo.width / 100); // 썸이 움직일 수 있는 px
  const maxScroll = scrollWidth - clientWidth;
  if (movable <= 0) return startScrollLeft;
  return clamp(startScrollLeft + (dx / movable) * maxScroll, 0, maxScroll);
}

// 트랙의 x(px) 지점을 눌렀을 때 썸 가운데가 그 지점에 오도록 하는 scrollLeft
export function scrollFromTrackClick({ x, trackWidth, scrollWidth, clientWidth }) {
  const geo = thumbGeometry({ scrollLeft: 0, scrollWidth, clientWidth });
  if (!geo || trackWidth <= 0) return 0;
  const thumbPx = trackWidth * (geo.width / 100);
  const movable = trackWidth - thumbPx;
  const maxScroll = scrollWidth - clientWidth;
  if (movable <= 0) return 0;
  return clamp(((x - thumbPx / 2) / movable) * maxScroll, 0, maxScroll);
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
