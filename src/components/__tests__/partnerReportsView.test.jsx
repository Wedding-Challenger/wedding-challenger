import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { ReportDays, UtmPreviewList } from '../admin/PartnerReports';
import { normalizeReport, trackingView } from '../../lib/partnerReports';

// FE #35: 관리 리포트 일별 상태·UTM 지면별 미리보기 표시(BE #28 계약 fixture, mock 값)
const fixture = (name) => JSON.parse(readFileSync(new URL(`../../lib/__tests__/fixtures/${name}`, import.meta.url), 'utf8'));
const text = (html) => html.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').split('\n').map((s) => s.trim()).filter(Boolean);

describe('리포트 일별 표시', () => {
  it('reportDaysShowNotYetAndMeasuredOutOfSchedule — 집계 전·게재 외(실측 이력 있음)을 그대로, 집계 전 일수를 요약에', () => {
    const [row, nullDevice] = normalizeReport(fixture('partner-report-response.json')).rows;
    const lines = text(renderToString(<ReportDays row={row} />));
    expect(lines[0]).toBe('일별 (집계 전 1일)');
    expect(lines).toContain('2026-10-04 · 게재 외(실측 이력 있음) · 노출 5 · 클릭 1 · 제한으로 누락 2건');
    expect(lines).toContain('2026-10-11 · 집계 전');
    expect(lines).not.toContain('2026-10-11 · 노출 0 · 클릭 0');
    expect(text(renderToString(<ReportDays row={nullDevice} />))).toContain('2026-10-01 · 게재 외');
  });
});

describe('UTM 지면별 미리보기', () => {
  it('previewsPerSlotWithWarning — 네 지면 URL·utm_content 경고를 보이고 단일 previewUrl 은 쓰지 않는다', () => {
    const tracking = fixture('placement-tracking-response.json');
    const lines = text(renderToString(<UtmPreviewList view={trackingView({ ...tracking, previewUrl: 'https://legacy.example' })} />));
    expect(lines).toContain('홈 메인 제휴 노출');
    expect(lines).toContain(tracking.previews.CHECKLIST_SIDEBAR);
    expect(lines.filter((l) => l.startsWith('https://partner.example/'))).toHaveLength(4);
    expect(lines.join(' ')).toMatch(/utm_content/);
    expect(lines.join(' ')).not.toContain('legacy.example');
  });

  it('utmOffNotice — 저장된 설정이 UTM 꺼짐이면 원본 링크 그대로라고 알린다', () => {
    const tracking = fixture('placement-tracking-response.json');
    const html = renderToString(<UtmPreviewList view={trackingView({ ...tracking, utmEnabled: false, contentWarning: false })} />);
    expect(html).toContain('UTM 꺼짐');
    expect(html).not.toContain('utm_content 가');
  });
});
