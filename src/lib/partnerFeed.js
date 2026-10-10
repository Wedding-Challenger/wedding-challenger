// 공개 제휴 목록(GET /api/v1/partners) 응답 → 화면에 보일 카드 목록 (순수 함수).
// 시각은 모두 이 브라우저 시계의 ms. 서버 시각과의 차이(serverOffset)로 visibleUntil 을 맞춘다.
// - 슬롯 off·0건·실패·60초 넘게 재조회 못 함 → 빈 목록 (예산은 섹션 숨김, 홈은 일반 웨딩홀 줄로 폴백)
// - 재조회는 서버 refreshAt 을 따르되 신선도 만료 전에 다시 받도록 최대 50초, 최소 1초
// - 카드 링크는 https 만, 이미지는 /images/partners/ 아래 상대 경로만(아니면 이미지 없이 표시)
// - 업종 단위 순환(승인 G2·조율자 H1): 피드는 살아 있는 후보 전부를 주고 item 마다 rotationGroup·rotationPick 을 단다.
//   화면에는 그룹당 1개만(pickRotation). 페이지뷰 첫 pick 을 그룹별로 고정하고, 고정한 placement 가 사라질 때만 바꾼다.
// - 측정 토큰·만료(measurementToken·measurementTokenExpiresAt)는 item 별 필드(C11). 집계 off 면 토큰이 없어 측정하지 않는다.
// - 광고 표시 문구는 서버 disclosure·disclosureNotice(H3), 없거나 이상하면 같은 상수(src/lib/partnerDisclosure.js).
import { disclosureLabel, disclosureNotice } from './partnerDisclosure';

export const FRESH_MS = 60000;
export const REFETCH_MAX_MS = 50000;
export const REFETCH_MIN_MS = 1000;
const RETRY_MS = 30000;

const IMAGE_PREFIX = '/images/partners/';

// 새 PartnerCategory (VendorCategory 와 별개, 계획서 §3.1)
export const PARTNER_CATEGORIES = [
  { value: 'WEDDING_HALL', label: '웨딩홀' },
  { value: 'STUDIO', label: '스튜디오' },
  { value: 'DRESS', label: '드레스' },
  { value: 'MAKEUP', label: '메이크업' },
  { value: 'SNAP', label: '스냅' },
  { value: 'RING', label: '반지' },
  { value: 'BOUQUET', label: '부케' },
  { value: 'HANBOK', label: '혼주한복' },
  { value: 'INVITATION', label: '청첩장' },
  { value: 'OTHER', label: '기타' },
];

export function safeImageUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(IMAGE_PREFIX)) return null;
  // 파일 이름은 영문·숫자·-_. 와 하위 폴더만. 경로 순회·빈 경로 조각을 막는다(제어 문자·query·역슬래시는 허용 문자 밖)
  if (!/^[A-Za-z0-9._/-]+$/.test(url) || url.includes('..') || url.includes('//') || url.endsWith('/')) return null;
  return url;
}

export function safeLinkUrl(url) {
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}

const parseTime = (s) => {
  const t = typeof s === 'string' ? Date.parse(s) : NaN;
  return Number.isFinite(t) ? t : null;
};

const nonEmpty = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// 순환 그룹은 서버 rotationGroup(업종 이름, 사이드 슬롯은 SLOT). 없으면(순환 전 서버) 그 배치 혼자 — 지금처럼 모두 보인다
const rotationGroupOf = (item) => nonEmpty(item.rotationGroup) ?? `PLACEMENT:${item.placementId}`;

// 화면에 필요한 공개 필드만 옮긴다(단가·계약 필드가 섞여 와도 싣지 않는다)
function toCard(item, serverOffset) {
  const destinationUrl = safeLinkUrl(item?.destinationUrl);
  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  if (!destinationUrl || !name || item.placementId == null) return null;
  const until = parseTime(item.visibleUntil);
  const token = nonEmpty(item.measurementToken);
  const tokenUntil = token ? parseTime(item.measurementTokenExpiresAt) : null;
  return {
    placementId: item.placementId,
    partnerId: item.partnerId,
    name,
    category: item.category ?? null,
    region: item.region ?? null,
    summary: item.summary ?? null,
    imageUrl: safeImageUrl(item.imageUrl),
    destinationUrl,
    // 서버 시각 → 이 시계
    visibleUntil: until == null ? null : until - serverOffset,
    rotationGroup: rotationGroupOf(item),
    rotationPick: item.rotationPick === true,
    measurementToken: token,
    measurementTokenExpiresAt: tokenUntil == null ? null : tokenUntil - serverOffset,
    disclosure: disclosureLabel(item.disclosure),
    disclosureNotice: disclosureNotice(item.disclosureNotice),
  };
}

export function toFeed(result, now) {
  const server = parseTime(result?.serverTime);
  const serverOffset = server == null ? 0 : server - now;
  const refresh = parseTime(result?.refreshAt);
  return {
    ok: true,
    slotEnabled: result?.slotEnabled === true,
    fetchedAt: now,
    refreshAt: refresh == null ? null : refresh - serverOffset,
    items: (Array.isArray(result?.items) ? result.items : []).map((i) => toCard(i, serverOffset)).filter(Boolean),
  };
}

export const failedFeed = (now) => ({ ok: false, slotEnabled: false, fetchedAt: now, refreshAt: null, items: [] });

export function visibleItems(feed, now) {
  if (!feed?.ok || !feed.slotEnabled) return [];
  if (now > feed.fetchedAt + FRESH_MS) return [];
  return feed.items.filter((i) => i.visibleUntil == null || i.visibleUntil > now);
}

export function refetchAt(feed) {
  if (!feed.ok) return feed.fetchedAt + RETRY_MS;
  const wanted = feed.refreshAt == null ? REFETCH_MAX_MS : feed.refreshAt - feed.fetchedAt;
  return feed.fetchedAt + Math.min(Math.max(wanted, REFETCH_MIN_MS), REFETCH_MAX_MS);
}

// 그룹마다 1개만 고른다(서버 순서 유지). pins = { 그룹: placementId } 는 이 페이지뷰에서 이미 보인 선택.
// 고정한 placement 가 아직 보이면 유지, 아니면 이번 응답의 rotationPick, pick 이 안 보이면 그 그룹의 첫 후보.
export function pickRotation(items, pins = {}) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.rotationGroup)) groups.set(item.rotationGroup, []);
    groups.get(item.rotationGroup).push(item);
  }
  const next = {};
  for (const [group, candidates] of groups) {
    const chosen = candidates.find((i) => i.placementId === pins[group])
      ?? candidates.find((i) => i.rotationPick)
      ?? candidates[0];
    next[group] = chosen.placementId;
  }
  return { items: items.filter((i) => next[i.rotationGroup] === i.placementId), pins: next };
}
