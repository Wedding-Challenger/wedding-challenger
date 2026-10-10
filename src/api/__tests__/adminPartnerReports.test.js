import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadPartnerReportCsv, getPartnerReport, getPlacementTracking, savePlacementTracking, saveReportMemo,
} from '../adminPartnerReports';

const json = (status, body, type = 'basic') => ({
  ok: status >= 200 && status < 300,
  status,
  type,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => body,
});
const ok = (result) => json(200, { code: 'COMMON200', message: '요청에 성공하였습니다.', result });
const csv = (text, contentType = 'text/csv;charset=UTF-8') => ({
  ok: true,
  status: 200,
  type: 'basic',
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? contentType : null) },
  blob: async () => new Blob([text], { type: contentType }),
});

afterEach(() => vi.unstubAllGlobals());

// 관리 리포트·tracking API (계획서 §3.3·§3.4 계약 mock). 관리 체인 안, Access 쿠키(credentials include)만.
describe('관리 리포트 API', () => {
  it('reportJsonUsesAdminFetch — 월 필수 query, 관리 요청 규칙 그대로', async () => {
    const fetch = vi.fn(async () => ok({ month: '2026-10', rows: [] }));
    vi.stubGlobal('fetch', fetch);
    await getPartnerReport({ month: '2026-10', partnerId: '12' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/admin/partner-reports?month=2026-10&partnerId=12');
    expect(init).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'manual' });
  });

  it('csvBlobWithFeFilename — CSV 는 blob 으로 받고 파일명은 FE 규칙(Content-Disposition 에 기대지 않음)', async () => {
    const fetch = vi.fn(async () => csv('﻿row_type,month\r\nDATA,2026-10\r\n'));
    vi.stubGlobal('fetch', fetch);
    const { blob, filename } = await downloadPartnerReportCsv({ month: '2026-10', partnerId: 12 });
    expect(filename).toBe('partner-report-2026-10-12.csv');
    expect(blob).toBeInstanceOf(Blob);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/admin/partner-reports.csv?month=2026-10&partnerId=12');
    expect(init).toMatchObject({
      method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'manual',
      headers: { Accept: 'text/csv', 'X-WC-Admin-Request': '1' },
    });
  });

  it('csvLoginHtmlIsLoginNotFile — Access 로그인 HTML·redirect 는 파일로 저장하지 않고 로그인 필요', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => csv('<html>login</html>', 'text/html')));
    await expect(downloadPartnerReportCsv({ month: '2026-10' })).rejects.toMatchObject({ kind: 'login' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 0, type: 'opaqueredirect', headers: { get: () => null } })));
    await expect(downloadPartnerReportCsv({ month: '2026-10' })).rejects.toMatchObject({ kind: 'login' });
    vi.stubGlobal('fetch', vi.fn(async () => json(403, { code: 'ADMIN403', message: '권한 없음' })));
    await expect(downloadPartnerReportCsv({ month: '2026-10' })).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('invalidFilterNotRequested — 검증 안 된 필터는 요청하지 않는다', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(downloadPartnerReportCsv({ month: '2026-1' })).rejects.toThrow();
    await expect(getPartnerReport({ month: 'x' })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('memoPutIsSingleMonthWithTrackingVersion — 메모는 월 하나만 PUT, trackingVersion 포함', async () => {
    const fetch = vi.fn(async () => ok({ placementId: 10, trackingVersion: 4 }));
    vi.stubGlobal('fetch', fetch);
    await saveReportMemo(10, '2026-10', { memo: '집계 off 기간 10/3~10/4', trackingVersion: 3 });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/admin/placements/10/report-memos/2026-10');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ memo: '집계 off 기간 10/3~10/4', trackingVersion: 3 });
    await expect(saveReportMemo(10, '2026/10', { memo: '', trackingVersion: 3 })).rejects.toThrow();
  });

  it('trackingGetAndUtmPut — tracking 조회·UTM 수정(빈 값은 null = 자동값)', async () => {
    const fetch = vi.fn(async () => ok({ placementId: 10, trackingVersion: 1 }));
    vi.stubGlobal('fetch', fetch);
    await getPlacementTracking(10);
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:8080/api/v1/admin/placements/10/tracking');
    await savePlacementTracking(10, { utmSource: '', utmMedium: ' ', utmCampaign: 'invitation_pilot_2026', utmContent: 'home_main', trackingVersion: 1 });
    const [url, init] = fetch.mock.calls[1];
    expect(url).toBe('http://localhost:8080/api/v1/admin/placements/10/tracking');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({
      utmSource: null, utmMedium: null, utmCampaign: 'invitation_pilot_2026', utmContent: 'home_main', trackingVersion: 1,
    });
  });
});
