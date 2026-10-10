import { adminDownload, adminRequest } from './adminPartners';
import { reportCsvFilename, reportQuery } from '../lib/partnerReports';

// 관리 월별 리포트·tracking API (계획서 §3.3·§3.4, 백엔드 #28 ADR-016 AdminPartnerReportResponse·AdminTrackingResponse 계약.
// 테스트는 그 모양의 mock fixture — src/lib/__tests__/fixtures/).
// 모두 Access 관리 체인 안이며 adminPartners.js 와 같은 규칙(credentials include·redirect manual·표지 헤더·no-store)으로 부른다.
//   GET /admin/partner-reports?month=YYYY-MM[&partnerId][&slot][&deviceClass=MOBILE|DESKTOP|UNKNOWN]
//     → { month, generatedAt(ISO KST offset), notes: [측정 정의·한계 문장],
//          rows: [{ placementId, placementName(「배치 #id」), placementDeleted, partnerId, partnerName(원문), partnerDeleted,
//            slot, deviceClass(MOBILE|DESKTOP|UNKNOWN|null — null = 기기 필터 없이 그 월 실측 없는 배치의 기기 합계 행),
//            impressions, clicks, ctr('1.50'|null), rateLimited, suspectedAnomalyDates: ['YYYY-MM-DD'], memo(그 월 운영 메모|null),
//            servingFrom|null, servingUntil|null(ISO offset),
//            days: [{ date, status: MEASURED|ZERO|OUT_OF_SCHEDULE|OUT_OF_SCHEDULE_MEASURED|NOT_YET, impressions, clicks, rateLimited,
//                     suspectedAnomaly }] — 그 월 1일~말일 전부 }],
//          totals: { impressions, clicks, ctr|null, rateLimited, suspectedAnomalyDates } }
//     rows 는 placement × 기기 행, 순서 partnerId·placementId·기기(MOBILE→DESKTOP→UNKNOWN). NOT_YET(오늘 KST 이후) 은 0 이 아니다.
//   GET /admin/partner-reports.csv?… → text/csv(UTF-8 BOM·CRLF·RFC4180, 수식 무력화는 서버). 파일명은 FE 가 만든다(B14).
//   GET /admin/placements/{id}/tracking → { placementId, partnerId, placementVersion, trackingVersion?(행 없으면 키 없음), utmEnabled,
//          utmSource, utmMedium, utmCampaign, utmContent(null = 자동값), defaults: { source, medium, campaign, content },
//          previews: { HOME_MAIN|BUDGET_PARTNERS|GUIDE_SIDEBAR|CHECKLIST_SIDEBAR: url }, contentWarning, reportMemos: { 'YYYY-MM': 메모 } }
//   PUT /admin/placements/{id}/tracking  { utmEnabled, utm*(null = 자동값), trackingVersion? } — UTM 만 바꾼다.
//     utmEnabled 를 빼면 BE 가 true 로 저장하므로 늘 보낸다. trackingVersion 이 없으면(행 없음) 키를 빼 최초 생성으로 보낸다.
//   PUT /admin/placements/{id}/report-memos/{YYYY-MM}  { memo, trackingVersion? } — 그 월만 부분 갱신(빈 memo = 그 월 삭제)
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const placementPath = (id) => {
  if (!/^[1-9]\d*$/.test(String(id))) throw new Error('placement id 는 양의 정수');
  return `/placements/${id}`;
};

export async function getPartnerReport(filter) {
  return adminRequest(`/partner-reports?${reportQuery(filter)}`);
}

export async function downloadPartnerReportCsv(filter) {
  const filename = reportCsvFilename(filter);
  const blob = await adminDownload(`/partner-reports.csv?${reportQuery(filter)}`, 'text/csv');
  return { blob, filename };
}

export async function getPlacementTracking(id) {
  return adminRequest(`${placementPath(id)}/tracking`);
}

const utmValue = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const withVersion = (body, trackingVersion) => (Number.isFinite(trackingVersion) ? { ...body, trackingVersion } : body);

export async function savePlacementTracking(id, { utmEnabled, utmSource, utmMedium, utmCampaign, utmContent, trackingVersion }) {
  if (typeof utmEnabled !== 'boolean') throw new Error('utmEnabled 는 true/false 로 늘 보냅니다');
  return adminRequest(`${placementPath(id)}/tracking`, {
    method: 'PUT',
    body: withVersion({
      utmEnabled,
      utmSource: utmValue(utmSource),
      utmMedium: utmValue(utmMedium),
      utmCampaign: utmValue(utmCampaign),
      utmContent: utmValue(utmContent),
    }, trackingVersion),
  });
}

export async function saveReportMemo(id, month, { memo, trackingVersion }) {
  if (!MONTH_RE.test(month)) throw new Error('월은 YYYY-MM 형식');
  return adminRequest(`${placementPath(id)}/report-memos/${month}`, {
    method: 'PUT',
    body: withVersion({ memo: memo ?? '' }, trackingVersion),
  });
}
