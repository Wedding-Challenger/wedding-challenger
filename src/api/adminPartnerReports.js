import { adminDownload, adminRequest } from './adminPartners';
import { reportCsvFilename, reportQuery } from '../lib/partnerReports';

// 관리 월별 리포트·tracking API (계획서 §3.3·§3.4, 백엔드 #28 와 맞춘 계약 — 백엔드 구현 전이라 테스트는 mock).
// 모두 Access 관리 체인 안이며 adminPartners.js 와 같은 규칙(credentials include·redirect manual·표지 헤더·no-store)으로 부른다.
//   GET /admin/partner-reports?month=YYYY-MM[&partnerId][&slot][&deviceClass]
//     → { month, generatedAt, rows: [{ placementId, placementName, placementDeleted, partnerId, partnerName, partnerDeleted,
//          slot, deviceClass, impressions, clicks, rateLimited, suspectedAnomalyDates, days? }], memos? }
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
