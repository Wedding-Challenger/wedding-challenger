import { describe, expect, it } from 'vitest';
import {
  formatCtr, initialTracking, normalizeReport, reportCsvFilename, reportQuery, retentionMonths, trackingReducer, canSaveTracking,
  validateMemo, validateReportFilter, validateUtm, withDeletedLabel,
} from '../partnerReports';

// 월별 제휴 리포트(계획서 §3.3·B6·B7·B14·C5·C9). 서버 응답은 계획서 계약의 mock — 실제 업체·값 아님.
const NOW = Date.parse('2026-10-10T12:00:00+09:00');

describe('CSV 파일명(B14)', () => {
  it('filenameFromValidatedFilter — 전체 업체 partner-report-YYYY-MM.csv, 단일 업체 -<partnerId> 를 붙인다', () => {
    expect(reportCsvFilename({ month: '2026-10' })).toBe('partner-report-2026-10.csv');
    expect(reportCsvFilename({ month: '2026-10', partnerId: '' })).toBe('partner-report-2026-10.csv');
    expect(reportCsvFilename({ month: '2026-10', partnerId: 12 })).toBe('partner-report-2026-10-12.csv');
    expect(reportCsvFilename({ month: '2026-10', partnerId: '12' })).toBe('partner-report-2026-10-12.csv');
  });

  it.each([
    ['월 형식', { month: '2026-1' }],
    ['13월', { month: '2026-13' }],
    ['경로 문자', { month: '2026-10/../x' }],
    ['업체 id 음수', { month: '2026-10', partnerId: '-1' }],
    ['업체 id 문자', { month: '2026-10', partnerId: '12a' }],
    ['업체 id 0', { month: '2026-10', partnerId: 0 }],
  ])('rejectsUnvalidatedFilter — %s', (_, filter) => {
    expect(() => reportCsvFilename(filter)).toThrow();
  });
});

describe('리포트 필터', () => {
  it('retentionIs13MonthsIncludingCurrent — 현재 월 포함 13개월(2026-10 기준 2025-10 이후)', () => {
    const months = retentionMonths(NOW);
    expect(months).toHaveLength(13);
    expect(months[0]).toBe('2026-10');
    expect(months.at(-1)).toBe('2025-10');
  });

  it('validateFilter — 보관 범위 밖·미래 월·잘못된 슬롯/기기는 오류', () => {
    expect(validateReportFilter({ month: '2026-10' }, NOW)).toEqual({});
    expect(validateReportFilter({ month: '2025-10', partnerId: '3', slot: 'GUIDE_SIDEBAR', deviceClass: 'MOBILE' }, NOW)).toEqual({});
    expect(validateReportFilter({ month: '2025-09' }, NOW)).toHaveProperty('month');
    expect(validateReportFilter({ month: '2026-11' }, NOW)).toHaveProperty('month');
    expect(validateReportFilter({ month: '2026-10', slot: 'FOOTER' }, NOW)).toHaveProperty('slot');
    expect(validateReportFilter({ month: '2026-10', deviceClass: 'TV' }, NOW)).toHaveProperty('deviceClass');
    expect(validateReportFilter({ month: '2026-10', partnerId: 'x' }, NOW)).toHaveProperty('partnerId');
  });

  it('queryHasOnlySetFilters — 선택한 필터만 query 로', () => {
    expect(reportQuery({ month: '2026-10' })).toBe('month=2026-10');
    expect(reportQuery({ month: '2026-10', partnerId: '12', slot: 'HOME_MAIN', deviceClass: '' }))
      .toBe('month=2026-10&partnerId=12&slot=HOME_MAIN');
  });
});

describe('표 계산', () => {
  it.each([
    [1, 3, '33.33%'],
    [2, 3, '66.67%'],
    [1, 8, '12.50%'],
    [1, 800, '0.13%'], // HALF_UP
    [0, 5, '0.00%'],
    [7, 5, '140.00%'], // 노출 전 클릭·전송 손실로 100% 초과 가능 — 상한 보정 없음
    [3, 0, '—'], // 노출 0 이면 숫자 0 대신 —
  ])('weightedCtrHalfUp — 클릭 %i / 노출 %i → %s', (clicks, impressions, expected) => {
    expect(formatCtr(clicks, impressions)).toBe(expected);
  });

  it('deletedLabel — 삭제된 업체·배치 이름 뒤 (삭제됨), 두 번 붙이지 않는다', () => {
    expect(withDeletedLabel('샘플 업체', true)).toBe('샘플 업체 (삭제됨)');
    expect(withDeletedLabel('샘플 업체 (삭제됨)', true)).toBe('샘플 업체 (삭제됨)');
    expect(withDeletedLabel('샘플 업체', false)).toBe('샘플 업체');
  });

  it('normalizeReportSumsCountersExcludingRateLimitedFromCtr — 합계 행은 가중 CTR, 누락 N은 분자·분모 밖', () => {
    const report = normalizeReport({
      month: '2026-10',
      generatedAt: '2026-10-10T03:00:00Z',
      rows: [
        {
          placementId: 10, placementName: '홈 시범', placementDeleted: false, partnerId: 1, partnerName: '샘플 청첩장', partnerDeleted: true,
          slot: 'HOME_MAIN', deviceClass: 'MOBILE', impressions: 200, clicks: 3, rateLimited: 4, suspectedAnomalyDates: ['2026-10-03'],
        },
        {
          placementId: 11, placementName: '예산 시범', placementDeleted: true, partnerId: 1, partnerName: '샘플 청첩장', partnerDeleted: true,
          slot: 'BUDGET_PARTNERS', deviceClass: 'DESKTOP', impressions: 0, clicks: 1, rateLimited: 0, suspectedAnomalyDates: [],
        },
      ],
    });
    expect(report.rows[0]).toMatchObject({
      partnerLabel: '샘플 청첩장 (삭제됨)', placementLabel: '홈 시범', slotLabel: '홈 메인 제휴 노출', deviceLabel: '모바일 계열(태블릿 포함)',
      ctr: '1.50%', rateLimited: 4, anomaly: '이상 의심 2026-10-03',
    });
    expect(report.rows[1]).toMatchObject({ placementLabel: '예산 시범 (삭제됨)', ctr: '—', anomaly: '' });
    expect(report.totals).toEqual({ impressions: 200, clicks: 4, rateLimited: 4, ctr: '2.00%' });
    expect(report.generatedAtKst).toBe('2026-10-10 12:00 KST');
  });

  it('dailyStatusZeroVsOutOfSchedule — 일별 0 과 「게재 외」를 구분(서버 합성값 그대로)', () => {
    const report = normalizeReport({
      month: '2026-10', generatedAt: '2026-10-10T03:00:00Z',
      rows: [{
        placementId: 10, placementName: '홈', partnerId: 1, partnerName: '샘플', slot: 'HOME_MAIN', deviceClass: 'UNKNOWN',
        impressions: 5, clicks: 0, rateLimited: 0,
        days: [
          { date: '2026-10-01', status: 'OUT_OF_SCHEDULE', impressions: 0, clicks: 0, rateLimited: 0 },
          { date: '2026-10-02', status: 'SERVED', impressions: 0, clicks: 0, rateLimited: 0 },
          { date: '2026-10-03', status: 'OUT_OF_SCHEDULE', impressions: 5, clicks: 0, rateLimited: 0 },
        ],
      }],
    });
    expect(report.rows[0].days.map((d) => d.statusLabel)).toEqual(['게재 외', '0', '게재 외(실측 이력 있음)']);
    expect(report.rows[0].deviceLabel).toBe('분류 불가');
  });
});

describe('월별 메모·UTM(C9)', () => {
  it('memoMax2000 — 메모는 2,000자 이하, 빈 메모는 그 월 삭제', () => {
    expect(validateMemo('')).toBeNull();
    expect(validateMemo('가'.repeat(2000))).toBeNull();
    expect(validateMemo('가'.repeat(2001))).toMatch(/2,000/);
  });

  it('utmOverrideRules — 비우면 자동값, 값은 영문·숫자·._- 100자 이하(이메일·전화번호 같은 개인정보 차단)', () => {
    expect(validateUtm({ utmSource: '', utmMedium: '', utmCampaign: 'invitation_pilot_2026', utmContent: 'home_main' })).toEqual({});
    expect(validateUtm({ utmCampaign: 'a'.repeat(101) })).toHaveProperty('utmCampaign');
    expect(validateUtm({ utmCampaign: 'me@example.com' })).toHaveProperty('utmCampaign');
    expect(validateUtm({ utmContent: '010 1234 5678' })).toHaveProperty('utmContent');
    expect(validateUtm({ utmSource: 'line\nbreak' })).toHaveProperty('utmSource');
  });

  it('trackingConflictLocksUntilReload — 409 면 메모·UTM 저장을 잠그고 최신 불러오기 성공만 푼다', () => {
    let s = trackingReducer(initialTracking, { type: 'LOAD_OK', tracking: { placementId: 10, trackingVersion: 2, reportMemos: {} } });
    expect(canSaveTracking(s)).toBe(true);
    s = trackingReducer(s, { type: 'SAVE_START' });
    expect(canSaveTracking(s)).toBe(false);
    s = trackingReducer(s, { type: 'SAVE_FAIL', error: { kind: 'conflict' } });
    expect(s.conflict).toBe(true);
    expect(canSaveTracking(s)).toBe(false);
    s = trackingReducer(s, { type: 'LOAD_START' });
    s = trackingReducer(s, { type: 'LOAD_OK', tracking: { placementId: 10, trackingVersion: 3, reportMemos: { '2026-10': '장애 메모' } } });
    expect(s.conflict).toBe(false);
    expect(canSaveTracking(s)).toBe(true);
    s = trackingReducer(s, { type: 'SAVE_START' });
    s = trackingReducer(s, { type: 'SAVE_OK', tracking: { placementId: 10, trackingVersion: 4, reportMemos: {} } });
    expect(s.tracking.trackingVersion).toBe(4);
  });
});
