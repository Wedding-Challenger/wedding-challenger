// 관리 화면 월별 제휴 리포트·월별 메모·UTM 설정의 순수 함수 (계획서 §3.3·§3.4, B6·B7·B14·C5·C9).
// 화면은 src/components/admin/PartnerReports.jsx, API 는 src/api/adminPartnerReports.js.
// - 표 수치(노출·클릭·제한으로 누락 N)·0/「게재 외」 합성·삭제 여부는 서버가 정한다. FE 는 표시·가중 CTR·합계·파일명만 만든다.
// - CTR = Σ클릭 / Σ노출 × 100, 소수 둘째 자리 HALF_UP, 노출 0 이면 「—」. 누락 N 은 분자·분모에 넣지 않는다.
// - CSV 파일명은 검증된 필터로 FE 가 만든다: partner-report-<YYYY-MM>[-<partnerId>].csv (Content-Disposition 에 기대지 않음).
import { formatKst, SLOTS } from './partnerAdmin';

export const DEVICE_CLASSES = [
  { value: 'MOBILE', label: '모바일 계열(태블릿 포함)' },
  { value: 'DESKTOP', label: 'PC 계열' },
  { value: 'UNKNOWN', label: '분류 불가' },
];

export const RETENTION_MONTHS = 13;
export const MEMO_MAX = 2000;
export const UTM_MAX = 100;
export const UTM_FIELDS = [
  { key: 'utmSource', label: 'utm_source', auto: 'wedding-challenger' },
  { key: 'utmMedium', label: 'utm_medium', auto: 'display' },
  { key: 'utmCampaign', label: 'utm_campaign', auto: 'partner_<업체 ID>' },
  { key: 'utmContent', label: 'utm_content', auto: '<지면 이름 소문자>' },
];

// 리포트에 늘 붙이는 측정 정의·한계 주석(계획서 §3.2·§3.3, 조율자 H1)
export const REPORT_NOTES = [
  '노출은 카드 면적 50% 이상이 가림을 뺀 화면 안에 연속 1초 이상 보인 경우, 클릭은 같은 페이지뷰의 최초 링크 활성화입니다(페이지뷰·배치마다 최대 1회).',
  '집계는 이용자 식별자 없는 일별 합계이며 전송 손실(네트워크·종료·추적 차단)이 있을 수 있습니다. 실제 이용자 수·인증된 가시성 수치가 아닙니다.',
  '「제한으로 누락 N건」은 검증을 통과한 뒤 앱 요청 제한으로 거절한 요청 시도 수입니다. edge 차단·전송 손실·처리 전 종료 손실은 포함하지 않습니다.',
  '같은 업종 업체는 한 화면에 하나만 보이며 페이지를 열 때마다 돌아가며 노출됩니다. 노출 배분은 기대값 기준 균등이며 정확히 같지는 않습니다.',
  '기기군은 브라우저 정보로 추정합니다. 데스크톱 화면을 요청하는 iPad 는 PC 계열로 분류될 수 있습니다.',
  '0 과 「게재 외」는 조회 시점의 게재 기간·삭제 시각으로 다시 계산합니다. 비활성·슬롯 off·집계 off·장애 기간은 운영 메모로만 표시합니다.',
];

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const blank = (v) => v == null || String(v).trim() === '';
const isMonth = (v) => typeof v === 'string' && MONTH_RE.test(v);
const isPositiveId = (v) => /^[1-9]\d{0,17}$/.test(String(v ?? '').trim());

// KST 기준 이번 달부터 거꾸로 13개월 ['2026-10', '2026-09', …, '2025-10']
export function retentionMonths(now = Date.now()) {
  const kst = new Date(now + 9 * 60 * 60 * 1000);
  let year = kst.getUTCFullYear();
  let month = kst.getUTCMonth() + 1;
  const months = [];
  for (let i = 0; i < RETENTION_MONTHS; i++) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return months;
}

export function validateReportFilter(filter, now = Date.now()) {
  const errors = {};
  if (!isMonth(filter.month)) errors.month = '월은 YYYY-MM 형식';
  else if (!retentionMonths(now).includes(filter.month)) errors.month = '보관 범위(현재 월 포함 13개월) 안의 월만 조회할 수 있습니다';
  if (!blank(filter.partnerId) && !isPositiveId(filter.partnerId)) errors.partnerId = '업체 ID 는 양의 정수';
  if (!blank(filter.slot) && !SLOTS.some((s) => s.value === filter.slot)) errors.slot = '알 수 없는 지면';
  if (!blank(filter.deviceClass) && !DEVICE_CLASSES.some((d) => d.value === filter.deviceClass)) errors.deviceClass = '알 수 없는 기기군';
  return errors;
}

// 형식만 검사해 query 를 만든다(보관 범위는 서버가 최종 판정). 잘못된 값이면 요청하지 않는다.
export function reportQuery(filter) {
  if (!isMonth(filter.month)) throw new Error('월은 YYYY-MM 형식');
  const params = [['month', filter.month]];
  if (!blank(filter.partnerId)) {
    if (!isPositiveId(filter.partnerId)) throw new Error('업체 ID 는 양의 정수');
    params.push(['partnerId', String(filter.partnerId).trim()]);
  }
  if (!blank(filter.slot)) params.push(['slot', filter.slot]);
  if (!blank(filter.deviceClass)) params.push(['deviceClass', filter.deviceClass]);
  return params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

export function reportCsvFilename(filter) {
  if (!isMonth(filter.month)) throw new Error('월은 YYYY-MM 형식');
  if (blank(filter.partnerId)) return `partner-report-${filter.month}.csv`;
  if (!isPositiveId(filter.partnerId)) throw new Error('업체 ID 는 양의 정수');
  return `partner-report-${filter.month}-${String(filter.partnerId).trim()}.csv`;
}

// 정수 연산으로 HALF_UP(부동소수 오차 없이)
export function formatCtr(clicks, impressions) {
  if (!impressions) return '—';
  const scaled = clicks * 10000;
  let hundredths = Math.floor(scaled / impressions);
  if ((scaled % impressions) * 2 >= impressions) hundredths += 1;
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, '0')}%`;
}

const DELETED = ' (삭제됨)';
export const withDeletedLabel = (name, deleted) =>
  (deleted && !String(name).endsWith(DELETED) ? `${name}${DELETED}` : String(name));

const count = (v) => (Number.isFinite(v) && v > 0 ? Math.trunc(v) : 0);
const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? value ?? '-';

function dayStatus(day) {
  const measured = count(day.impressions) + count(day.clicks) + count(day.rateLimited) > 0;
  if (day.status === 'OUT_OF_SCHEDULE') return measured ? '게재 외(실측 이력 있음)' : '게재 외';
  return measured ? null : '0';
}

export function normalizeReport(result) {
  const rows = (Array.isArray(result?.rows) ? result.rows : []).map((r) => {
    const impressions = count(r.impressions);
    const clicks = count(r.clicks);
    const dates = Array.isArray(r.suspectedAnomalyDates) ? r.suspectedAnomalyDates.filter(isDate) : [];
    return {
      key: `${r.placementId}:${r.slot}:${r.deviceClass}`,
      placementId: r.placementId,
      partnerId: r.partnerId,
      partnerLabel: withDeletedLabel(r.partnerName ?? `업체 #${r.partnerId}`, r.partnerDeleted === true),
      placementLabel: withDeletedLabel(r.placementName ?? `배치 #${r.placementId}`, r.placementDeleted === true),
      slotLabel: labelOf(SLOTS, r.slot),
      deviceLabel: labelOf(DEVICE_CLASSES, r.deviceClass),
      impressions,
      clicks,
      rateLimited: count(r.rateLimited),
      ctr: formatCtr(clicks, impressions),
      anomaly: dates.length ? `이상 의심 ${dates.join(', ')}` : '',
      // 그 월·배치의 운영 메모(장애·off 기간 등). 자동 판정이 아니라 담당자가 쓴 설명이다
      memo: typeof r.memo === 'string' ? r.memo : '',
      days: (Array.isArray(r.days) ? r.days : []).filter((d) => isDate(d?.date)).map((d) => ({
        date: d.date,
        impressions: count(d.impressions),
        clicks: count(d.clicks),
        rateLimited: count(d.rateLimited),
        statusLabel: dayStatus(d),
      })),
    };
  });
  const sum = (k) => rows.reduce((acc, r) => acc + r[k], 0);
  const impressions = sum('impressions');
  const clicks = sum('clicks');
  return {
    month: result?.month ?? null,
    generatedAtKst: formatKst(result?.generatedAt),
    rows,
    totals: { impressions, clicks, rateLimited: sum('rateLimited'), ctr: formatCtr(clicks, impressions) },
  };
}

function isDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// ---- 월별 메모·UTM ----

export function validateMemo(memo) {
  return (memo ?? '').length > MEMO_MAX ? `메모는 ${MEMO_MAX.toLocaleString('en-US')}자 이하` : null;
}

// 비우면 자동값. 값은 영문·숫자·._- 만(공백·@·한글 등 개인정보·계약 정보가 들어가기 쉬운 문자를 막는다)
export function validateUtm(form) {
  const errors = {};
  for (const { key } of UTM_FIELDS) {
    const value = (form[key] ?? '').trim();
    if (!value) continue;
    if (value.length > UTM_MAX) errors[key] = `${UTM_MAX}자 이하`;
    else if (!/^[A-Za-z0-9._-]+$/.test(value)) errors[key] = '영문·숫자·. _ - 만 쓸 수 있습니다(이름·연락처·계약번호 금지)';
  }
  return errors;
}

// tracking(UTM·월별 메모) 한 배치의 화면 상태. 409 는 최신 불러오기 성공 전까지 저장을 잠근다(자체 trackingVersion).
export const initialTracking = { tracking: null, loading: false, saving: false, conflict: false, error: null, notice: null };

export function trackingReducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_OK':
      return { ...state, loading: false, conflict: false, tracking: action.tracking, notice: action.notice ?? null };
    case 'LOAD_FAIL':
      return { ...state, loading: false, error: action.message };
    case 'SAVE_START':
      return state.saving ? state : { ...state, saving: true, error: null, notice: null };
    case 'SAVE_OK':
      return { ...state, saving: false, tracking: action.tracking, notice: action.notice ?? '저장했습니다' };
    case 'SAVE_FAIL':
      if (action.error?.kind === 'conflict') {
        return {
          ...state,
          saving: false,
          conflict: true,
          notice: '다른 곳에서 바뀌었습니다. 「최신 불러오기」로 최신 내용을 받은 뒤 해당 월·값만 다시 저장하세요.',
        };
      }
      return { ...state, saving: false, error: action.message ?? action.error?.message ?? '저장하지 못했습니다' };
    default:
      return state;
  }
}

export const canSaveTracking = (s) => s.tracking != null && !s.loading && !s.saving && !s.conflict;
