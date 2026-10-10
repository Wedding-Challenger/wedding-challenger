import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  dayText, normalizeReport, REPORT_NOTES, trackingDraft, trackingView, UTM_FIELDS,
} from '../partnerReports';

// FE #35: BE #28(daef0c6) 최종 계약과 맞춘다. fixture 는 BE AdminPartnerReportResponse·AdminTrackingResponse 와 같은 모양의 mock.
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const report = fixture('partner-report-response.json');
const tracking = fixture('placement-tracking-response.json');

describe('리포트 응답 계약(BE fixture)', () => {
  it('fixtureHasBeContractKeys — fixture 가 BE 최종 계약 키·타입을 그대로 갖는다(옛 키 없음)', () => {
    expect(Object.keys(report).filter((k) => k !== '_source').sort()).toEqual(['generatedAt', 'month', 'notes', 'rows', 'totals']);
    for (const row of report.rows) {
      expect(Object.keys(row).sort()).toEqual([
        'clicks', 'ctr', 'days', 'deviceClass', 'impressions', 'memo', 'partnerDeleted', 'partnerId', 'partnerName', 'placementDeleted',
        'placementId', 'placementName', 'rateLimited', 'servingFrom', 'servingUntil', 'slot', 'suspectedAnomalyDates',
      ]);
      for (const d of row.days) {
        expect(Object.keys(d).sort()).toEqual(['clicks', 'date', 'impressions', 'rateLimited', 'status', 'suspectedAnomaly']);
        expect(['MEASURED', 'ZERO', 'OUT_OF_SCHEDULE', 'OUT_OF_SCHEDULE_MEASURED', 'NOT_YET']).toContain(d.status);
      }
    }
    expect(report).not.toHaveProperty('placements');
    expect(JSON.stringify(report)).not.toMatch(/placementLabel|suspectedDates|OUT_OF_SERVICE/);
  });

  it('dayStatusesFollowBeContract — MEASURED·ZERO·OUT_OF_SCHEDULE·OUT_OF_SCHEDULE_MEASURED·NOT_YET 을 각각 표시', () => {
    const [row] = normalizeReport(report).rows;
    expect(row.days.map((d) => d.statusLabel)).toEqual([
      '게재 외', '0', null, '게재 외(실측 이력 있음)', '0', '집계 전',
    ]);
    expect(row.days.map(dayText)).toEqual([
      '2026-10-01 · 게재 외',
      '2026-10-02 · 노출 0 · 클릭 0',
      '2026-10-03 · 이상 의심 · 노출 200 · 클릭 3 · 제한으로 누락 4건',
      '2026-10-04 · 게재 외(실측 이력 있음) · 노출 5 · 클릭 1 · 제한으로 누락 2건',
      '2026-10-10 · 노출 0 · 클릭 0',
      '2026-10-11 · 집계 전',
    ]);
  });

  it('notYetIsNotZero — 집계 전은 「0」이 아니며 카운터가 와도 표시·합계·CTR 에 넣지 않는다', () => {
    const res = normalizeReport({
      month: '2026-10',
      rows: [{
        placementId: 10, partnerId: 1, slot: 'HOME_MAIN', deviceClass: 'MOBILE', impressions: 0, clicks: 0, rateLimited: 0,
        days: [{ date: '2026-10-11', status: 'NOT_YET', impressions: 9, clicks: 9, rateLimited: 9, suspectedAnomaly: false }],
      }],
    });
    const [day] = res.rows[0].days;
    expect(day).toMatchObject({ statusLabel: '집계 전', impressions: null, clicks: null, rateLimited: null });
    expect(dayText(day)).toBe('2026-10-11 · 집계 전');
    expect(dayText(day)).not.toMatch(/노출|0$/);
    expect(res.rows[0].notYetDays).toBe(1);
    expect(res.totals).toEqual({ impressions: 0, clicks: 0, rateLimited: 0, ctr: '—' });
  });

  it('outOfScheduleMeasuredShowsCountersWithNote — 게재 외 실측은 주석과 수치를 함께, 행·합계에 포함', () => {
    const res = normalizeReport(report);
    const day = res.rows[0].days[3];
    expect(day).toMatchObject({ status: 'OUT_OF_SCHEDULE_MEASURED', impressions: 5, clicks: 1, rateLimited: 2 });
    expect(res.totals).toEqual({ impressions: 205, clicks: 4, rateLimited: 6, ctr: '1.95%' });
  });

  it('nullDeviceRow — deviceClass null(실측 없는 배치의 기기 합계) 행은 「-」, 키가 겹치지 않는다', () => {
    const res = normalizeReport(report);
    expect(res.rows[1]).toMatchObject({
      deviceLabel: '-', partnerLabel: '샘플 스튜디오', placementLabel: '배치 #11 (삭제됨)', ctr: '—', memo: '', anomaly: '', servingLabel: '',
    });
    expect(res.rows[0].servingLabel).toBe('게재 2026-10-02 00:00 KST ~ 2026-10-04 00:00 KST');
    expect(new Set(res.rows.map((r) => r.key)).size).toBe(res.rows.length);
  });

  it('serverNotesPreferred — 서버 notes 가 있으면 그것을, 없으면 FE 기본 주석', () => {
    expect(normalizeReport(report).notes).toEqual(report.notes);
    expect(normalizeReport({ month: '2026-10', rows: [] }).notes).toEqual(REPORT_NOTES);
    expect(normalizeReport({ month: '2026-10', rows: [], notes: [1, null] }).notes).toEqual(REPORT_NOTES);
  });
});

describe('tracking 응답 계약(BE fixture)', () => {
  it('previewsPerSlot — previews 맵을 지면 순서대로, 없는 지면은 빼고, 단일 previewUrl 은 읽지 않는다', () => {
    const view = trackingView(tracking);
    expect(view.previews).toEqual([
      { slot: 'HOME_MAIN', label: '홈 메인 제휴 노출', url: tracking.previews.HOME_MAIN },
      { slot: 'BUDGET_PARTNERS', label: '예산 계산 제휴 업체', url: tracking.previews.BUDGET_PARTNERS },
      { slot: 'GUIDE_SIDEBAR', label: '가이드 사이드 제휴', url: tracking.previews.GUIDE_SIDEBAR },
      { slot: 'CHECKLIST_SIDEBAR', label: '체크리스트 사이드 제휴', url: tracking.previews.CHECKLIST_SIDEBAR },
    ]);
    expect(trackingView({ previewUrl: 'https://x.example', previews: { HOME_MAIN: 'https://a.example', FOOTER: 'https://b.example' } }).previews)
      .toEqual([{ slot: 'HOME_MAIN', label: '홈 메인 제휴 노출', url: 'https://a.example' }]);
  });

  it('defaultsWarningVersion — 자동값은 서버 defaults, contentWarning·trackingVersion(없으면 null)', () => {
    const view = trackingView(tracking);
    expect(view).toMatchObject({ utmEnabled: true, contentWarning: true, trackingVersion: 2 });
    expect(UTM_FIELDS.map(({ key }) => view.defaults[key])).toEqual(['wedding-challenger', 'display', 'partner_1', 'home_main']);
    const { trackingVersion, ...fresh } = tracking;
    expect(trackingVersion).toBe(2);
    expect(trackingView({ ...fresh, utmEnabled: false, contentWarning: false })).toMatchObject({
      utmEnabled: false, contentWarning: false, trackingVersion: null,
    });
    expect(trackingView({ ...tracking, utmEnabled: false }).contentWarning).toBe(false);
    // defaults 가 없으면 FE 안내 문구로
    expect(trackingView({}).defaults.utmSource).toBe('wedding-challenger');
  });

  it('draftCarriesUtmEnabled — 입력 초안은 utmEnabled 와 override(null 은 빈칸)를 함께 갖는다', () => {
    expect(trackingDraft(tracking)).toEqual({
      utmEnabled: true, utmSource: '', utmMedium: '', utmCampaign: 'invitation_pilot_2026', utmContent: '',
    });
    expect(trackingDraft({ ...tracking, utmEnabled: false }).utmEnabled).toBe(false);
  });
});
