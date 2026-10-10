// 공개 제휴 목록(GET /api/v1/partners) 응답 → 화면에 보일 카드 목록 (순수 함수).
// 시각은 모두 이 브라우저 시계의 ms. 서버 시각과의 차이(serverOffset)로 visibleUntil 을 맞춘다.
// - 슬롯 off·0건·실패·60초 넘게 재조회 못 함 → 빈 목록 (예산은 섹션 숨김, 홈은 일반 웨딩홀 줄로 폴백)
// - 재조회는 서버 refreshAt 을 따르되 신선도 만료 전에 다시 받도록 최대 50초, 최소 1초
// - 카드 링크는 https 만, 이미지는 /images/partners/ 아래 상대 경로만(아니면 이미지 없이 표시)

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

// 화면에 필요한 공개 필드만 옮긴다(단가·계약 필드가 섞여 와도 싣지 않는다)
function toCard(item, serverOffset) {
  const destinationUrl = safeLinkUrl(item?.destinationUrl);
  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  if (!destinationUrl || !name || item.placementId == null) return null;
  const until = parseTime(item.visibleUntil);
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
