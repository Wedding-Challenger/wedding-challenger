import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminMe, getAllAdminPartners } from '../../api/adminPartners';
import {
  downloadPartnerReportCsv, getPartnerReport, getPlacementTracking, savePlacementTracking, saveReportMemo,
} from '../../api/adminPartnerReports';
import { SLOTS } from '../../lib/partnerAdmin';
import {
  DEVICE_CLASSES, MEMO_MAX, dayText, mergePartnerOptions, UTM_FIELDS, canSaveTracking, initialTracking, normalizeReport, retentionMonths,
  trackingDraft, trackingReducer, trackingView, validateMemo, validateReportFilter, validateUtm,
} from '../../lib/partnerReports';
import { AuthNotice, Banner, Field, input, primary, secondary } from './adminUi';

// 월별 제휴 리포트 (관리 셸 /admin/partner-reports, 계획서 §3.3). 표·CSV·월별 메모·배치별 UTM.
// 수치·0/게재 외/집계 전 합성·삭제 표시는 서버가 정한다. 화면은 필터 검증·가중 CTR·합계·CSV 파일명·409 잠금만 맡는다.
// 월초 전달은 사람이 이 화면에서 지난 달 CSV 를 내려받아 측정 정의·이상 의심·제한 누락·메모를 확인한 뒤 보낸다.

const AUTH_BY_KIND = { login: 'login', forbidden: 'forbidden', notFound: 'disabled' };
const errorText = (error) => (error?.kind === 'network'
  ? '네트워크 오류로 처리하지 못했습니다. 연결을 확인하고 다시 시도하세요.'
  : error?.message || '처리하지 못했습니다. 잠시 뒤 다시 시도하세요.');
const num = (n) => n.toLocaleString('ko-KR');

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// 한 행의 일별 상태(0·게재 외·게재 외 실측·집계 전). 집계 전은 0 이 아니므로 요약에 일수를 따로 적는다
export function ReportDays({ row }) {
  if (row.days.length === 0) return null;
  return (
    <details className="mt-1 text-xs text-charcoal/60">
      <summary className="cursor-pointer">{`일별${row.notYetDays ? ` (집계 전 ${row.notYetDays}일)` : ''}`}</summary>
      <ul className="mt-1 space-y-0.5">
        {row.days.map((d) => <li key={d.date}>{dayText(d)}</li>)}
      </ul>
    </details>
  );
}

// 저장된 설정 기준 지면별 공개 링크 미리보기(서버 previews 맵). 입력을 바꾼 뒤에는 저장해야 갱신된다
export function UtmPreviewList({ view }) {
  return (
    <div className="space-y-2">
      {view.contentWarning && (
        <Banner tone="warn">
          업체 링크에 이미 다른 utm_content 가 있어 지면별 비교가 흐려집니다. 지면별로 나눠 보려면 utm_content 를 직접 정하거나 업체 링크를 고치세요.
        </Banner>
      )}
      <p className="text-xs text-charcoal/60">
        {view.utmEnabled ? '저장된 설정 기준 지면별 링크 미리보기' : '저장된 설정: UTM 꺼짐 — 업체 링크를 UTM 없이 그대로 씁니다'}
      </p>
      {view.previews.length > 0 && (
        <dl className="grid gap-1 text-xs sm:grid-cols-[max-content_1fr] sm:gap-x-3">
          {view.previews.map((p) => (
            <div key={p.slot} className="contents">
              <dt className="font-semibold text-charcoal/70">{p.label}</dt>
              <dd className="text-charcoal/60 break-all">{p.url}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

// 한 배치의 UTM·이 월 메모. trackingVersion 으로 동시 수정을 막고, 409 면 「최신 불러오기」 전까지 잠근다.
function TrackingPanel({ placement, month, onSaved, onClose, onAuth }) {
  const [state, dispatch] = useReducer(trackingReducer, { ...initialTracking, loading: true });
  // 입력 초안은 그것을 만든 tracking 응답에만 붙는다(최신 불러오기·저장 응답이 오면 서버 값으로 돌아간다)
  const [draft, setDraft] = useState({ base: null, utm: null, memo: '' });
  const seq = useRef(0);

  // 읽기만(시작 표시는 부르는 쪽). 마지막 요청의 응답만 반영한다
  const fetchTracking = useCallback(async (notice) => {
    const my = ++seq.current;
    try {
      const tracking = await getPlacementTracking(placement.placementId);
      if (my !== seq.current) return;
      dispatch({ type: 'LOAD_OK', tracking, notice });
    } catch (error) {
      if (my !== seq.current) return;
      if (AUTH_BY_KIND[error.kind]) onAuth(AUTH_BY_KIND[error.kind]);
      dispatch({ type: 'LOAD_FAIL', message: errorText(error) });
    }
  }, [placement.placementId, onAuth]);

  const load = (notice) => {
    dispatch({ type: 'LOAD_START' });
    fetchTracking(notice);
  };

  useEffect(() => {
    fetchTracking();
    return () => { seq.current += 1; };
  }, [fetchTracking]);

  const save = async (task, notice) => {
    if (!canSaveTracking(state)) return;
    dispatch({ type: 'SAVE_START' });
    try {
      // 행이 없으면 null → 요청에서 trackingVersion 을 빼 최초 생성으로 보낸다
      const tracking = await task(trackingView(state.tracking).trackingVersion);
      dispatch({ type: 'SAVE_OK', tracking, notice });
      onSaved();
    } catch (error) {
      if (AUTH_BY_KIND[error.kind] && error.kind !== 'notFound') onAuth(AUTH_BY_KIND[error.kind]);
      dispatch({ type: 'SAVE_FAIL', error, message: errorText(error) });
    }
  };

  const current = state.tracking;
  const own = draft.base === current;
  const utm = own ? draft.utm : current && trackingDraft(current);
  const view = current && trackingView(current);
  const memo = own ? draft.memo : current?.reportMemos?.[month] ?? '';
  const setUtm = (next) => setDraft({ base: current, utm: next, memo });
  const setMemo = (next) => setDraft({ base: current, utm, memo: next });
  const utmErrors = utm ? validateUtm(utm) : {};
  const memoError = validateMemo(memo);
  const locked = !canSaveTracking(state);
  const id = (k) => `tracking-${placement.placementId}-${k}`;

  return (
    <section className="rounded-2xl border border-warm-beige/40 bg-white p-4 space-y-4" aria-labelledby={id('title')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={id('title')} className="font-bold text-charcoal">{placement.placementLabel} · {placement.partnerLabel} — 메모·UTM</h3>
        <button type="button" className={secondary} onClick={onClose}>닫기</button>
      </div>
      {state.notice && <Banner>{state.notice}</Banner>}
      {state.error && <Banner tone="warn">{state.error}</Banner>}
      {state.conflict && (
        <button type="button" className={secondary} disabled={state.loading} onClick={() => load('최신 내용으로 바꿨습니다. 바꿀 값을 다시 저장하세요.')}>
          최신 불러오기
        </button>
      )}
      {state.loading && <p className="text-sm text-charcoal/40" role="status">불러오는 중…</p>}
      {state.tracking && utm && (
        <>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (Object.keys(utmErrors).length) return;
              save((trackingVersion) => savePlacementTracking(placement.placementId, { ...utm, trackingVersion }), 'UTM 을 저장했습니다');
            }}
          >
            <label htmlFor={id('utm-enabled')} className="flex items-center gap-2 text-sm text-charcoal">
              <input
                id={id('utm-enabled')}
                type="checkbox"
                checked={utm.utmEnabled}
                disabled={locked}
                onChange={(e) => setUtm({ ...utm, utmEnabled: e.target.checked })}
              />
              업체 링크에 UTM 붙이기
            </label>
            <p className="text-xs text-charcoal/50">
              {utm.utmEnabled
                ? '비우면 자동값을 씁니다. 우선순위: 여기 입력 > 업체 링크에 이미 있는 UTM > 자동값.'
                : '끄면 업체 링크를 그대로 씁니다. 아래 입력값은 지우지 않고 보관하며, 다시 켜면 적용됩니다.'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {UTM_FIELDS.map(({ key, label }) => (
                <Field key={key} id={id(key)} title={label} hint={`자동값: ${view.defaults[key]}`} error={utmErrors[key]}>
                  <input
                    id={id(key)}
                    className={input}
                    value={utm[key]}
                    maxLength={100}
                    placeholder={view.defaults[key]}
                    disabled={locked}
                    onChange={(e) => setUtm({ ...utm, [key]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
            <UtmPreviewList view={view} />
            <button type="submit" className={primary} disabled={locked || Object.keys(utmErrors).length > 0}>UTM 저장</button>
          </form>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (memoError) return;
              save((trackingVersion) => saveReportMemo(placement.placementId, month, { memo: memo.trim(), trackingVersion }),
                memo.trim() ? `${month} 메모를 저장했습니다` : `${month} 메모를 지웠습니다`);
            }}
          >
            <Field id={id('memo')} title={`${month} 운영 메모`} hint={`기간·사유(장애·슬롯 off·집계 off 등). 최대 ${num(MEMO_MAX)}자, 비우고 저장하면 이 월 메모를 지웁니다. 다른 월은 그대로입니다.`} error={memoError}>
              <textarea id={id('memo')} className={`${input} min-h-24`} value={memo} disabled={locked} onChange={(e) => setMemo(e.target.value)} />
            </Field>
            <button type="submit" className={primary} disabled={locked || Boolean(memoError)}>메모 저장</button>
          </form>
        </>
      )}
    </section>
  );
}

export default function PartnerReports() {
  const months = retentionMonths();
  const [filter, setFilter] = useState({ month: months[1], partnerId: '', slot: '', deviceClass: '' });
  const [auth, setAuth] = useState('unknown');
  const [partners, setPartners] = useState([]);
  const [reportPartners, setReportPartners] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [tracking, setTracking] = useState(null); // 메모·UTM 을 여는 행
  const seq = useRef(0);
  const errors = validateReportFilter(filter);
  const valid = Object.keys(errors).length === 0;

  const fail = (err) => {
    const next = AUTH_BY_KIND[err?.kind];
    if (next) setAuth(next);
    else setError(errorText(err));
  };

  // 읽기만(시작 표시는 부르는 쪽 load). 마지막 요청의 응답만 반영한다
  const fetchReport = useCallback(async (query) => {
    const my = ++seq.current;
    try {
      const [, partnerList, result] = await Promise.all([getAdminMe(), getAllAdminPartners(), getPartnerReport(query)]);
      if (my !== seq.current) return;
      setAuth('ok');
      setPartners(partnerList);
      const next = normalizeReport(result);
      setReport({ query, ...next });
      // 리포트에 나온 업체(관리 목록에서 빠진 삭제 업체 포함)는 필터 선택지에 계속 남긴다
      setReportPartners((prev) => {
        const map = new Map(prev.map((p) => [p.partnerId, p]));
        next.rows.forEach((r) => map.set(r.partnerId, { partnerId: r.partnerId, partnerLabel: r.partnerLabel }));
        return [...map.values()];
      });
    } catch (err) {
      if (my !== seq.current) return;
      const next = AUTH_BY_KIND[err?.kind];
      if (next) setAuth(next);
      else setError(errorText(err));
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, []);

  const load = (query) => {
    setLoading(true);
    setError(null);
    fetchReport(query);
  };

  // 처음 열면 지난 달(월초 보고 기본) 전체를 읽는다
  const [initialQuery] = useState(() => ({ month: months[1] }));
  useEffect(() => {
    fetchReport(initialQuery);
  }, [fetchReport, initialQuery]);

  const download = async () => {
    if (!valid) return;
    setNotice(null);
    try {
      const { blob, filename } = await downloadPartnerReportCsv(filter);
      saveBlob(blob, filename);
      setNotice(`${filename} 을 내려받았습니다. 보내기 전에 측정 정의·이상 의심·제한으로 누락·운영 메모를 확인하세요.`);
    } catch (err) {
      fail(err);
    }
  };

  const set = (key) => (e) => setFilter({ ...filter, [key]: e.target.value });
  const onAuth = useCallback((next) => setAuth(next), []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-charcoal">월별 제휴 리포트</h1>
          <p className="text-xs text-charcoal/50 mt-1">지면·월·기기군별 가시 노출·최초 클릭·CTR (KST 월, 수신 시각 기준)</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/partners" className={secondary}>제휴 업체 관리</Link>
          <Link to="/" reloadDocument className={secondary}>공개 사이트</Link>
        </div>
      </header>

      <AuthNotice auth={auth} />
      {notice && <Banner>{notice}</Banner>}
      {error && <Banner tone="warn">{error}</Banner>}

      <form
        className="rounded-2xl border border-warm-beige/40 bg-white p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) load({ ...filter });
        }}
      >
        <Field id="report-month" title="월" error={errors.month}>
          <select id="report-month" className={input} value={filter.month} onChange={set('month')}>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field id="report-partner" title="업체" error={errors.partnerId}>
          <select id="report-partner" className={input} value={filter.partnerId} onChange={set('partnerId')}>
            <option value="">전체 업체</option>
            {mergePartnerOptions(partners, reportPartners, filter.partnerId).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field id="report-partner-id" title="업체 ID 직접" hint="목록에 없는 업체(삭제 등)는 ID 로">
          <input
            id="report-partner-id"
            className={input}
            inputMode="numeric"
            value={filter.partnerId}
            placeholder="예: 12"
            onChange={(e) => setFilter({ ...filter, partnerId: e.target.value.trim() })}
          />
        </Field>
        <Field id="report-slot" title="지면" error={errors.slot}>
          <select id="report-slot" className={input} value={filter.slot} onChange={set('slot')}>
            <option value="">전체 지면</option>
            {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field id="report-device" title="기기군" error={errors.deviceClass}>
          <select id="report-device" className={input} value={filter.deviceClass} onChange={set('deviceClass')}>
            <option value="">전체 기기</option>
            {DEVICE_CLASSES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </Field>
        <div className="flex gap-2">
          <button type="submit" className={primary} disabled={!valid || loading}>조회</button>
          <button type="button" className={secondary} disabled={!valid || auth !== 'ok'} onClick={download}>CSV 내려받기</button>
        </div>
      </form>

      {loading && <p className="text-sm text-charcoal/40" role="status">불러오는 중…</p>}

      {auth === 'ok' && report && (
        <section className="space-y-3" aria-labelledby="report-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="report-title" className="text-lg font-bold text-charcoal">{report.month ?? report.query.month} 리포트</h2>
            <p className="text-xs text-charcoal/50">생성 {report.generatedAtKst}</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-warm-beige/40 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-cream text-xs text-charcoal/60">
                <tr>
                  {['업체', '배치', '지면', '기기군', '노출', '클릭', 'CTR', '제한으로 누락', '이상 의심', '운영 메모', ''].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.length === 0 && (
                  <tr><td colSpan={11} className="px-3 py-6 text-center text-charcoal/40">이 조건의 집계가 없습니다.</td></tr>
                )}
                {report.rows.map((r) => (
                  <tr key={r.key} className="border-t border-warm-beige/30 align-top">
                    <td className="px-3 py-2">{r.partnerLabel}</td>
                    <td className="px-3 py-2">
                      {r.placementLabel}
                      {r.servingLabel && <p className="text-xs text-charcoal/50">{r.servingLabel}</p>}
                      <ReportDays row={r} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.slotLabel}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.deviceLabel}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(r.impressions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(r.clicks)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.ctr}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.rateLimited ? `${num(r.rateLimited)}건` : '-'}</td>
                    <td className="px-3 py-2 text-deep-rose">{r.anomaly}</td>
                    <td className="px-3 py-2 text-xs text-charcoal/70 whitespace-pre-wrap break-words max-w-56">{r.memo}</td>
                    <td className="px-3 py-2">
                      <button type="button" className={secondary} onClick={() => setTracking(r)}>메모·UTM</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {report.rows.length > 0 && (
                <tfoot className="border-t-2 border-warm-beige/50 font-semibold">
                  <tr>
                    <th scope="row" colSpan={4} className="px-3 py-2 text-left">전체 합계</th>
                    <td className="px-3 py-2 text-right tabular-nums">{num(report.totals.impressions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(report.totals.clicks)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{report.totals.ctr}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{report.totals.rateLimited ? `${num(report.totals.rateLimited)}건` : '-'}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs text-charcoal/50">
            {report.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      )}

      {auth === 'ok' && tracking && report && (
        <TrackingPanel
          key={`${tracking.placementId}:${report.query.month}`}
          placement={tracking}
          month={report.query.month}
          onSaved={() => load(report.query)}
          onClose={() => setTracking(null)}
          onAuth={onAuth}
        />
      )}
    </div>
  );
}
