import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../api/client';
import {
  adminLoginUrl, deletePartner, deletePlacement, getAdminAudit, getAdminMe, getAdminPartner, getAdminPartners, getAdminPlacements,
  listItems, savePartner, savePlacement, savePlacementOrder, searchCatalog,
} from '../../api/adminPartners';
import { stage } from '../../config/environment';
import { safeImageUrl, safeLinkUrl } from '../../lib/partnerFeed';
import {
  BILLING_UNITS, CATEGORIES, CURRENCIES, PLACEMENT_STATUS, SLOTS, adminReducer, canSave, canSubmit, catalogLinkPatch,
  catalogReducer, emptyPartnerForm, emptyPlacementForm, formatKst, initialAdminState, initialCatalog, latestPlacementForm,
  needsReload, partnerToForm, placementToForm, reorder, sortPlacements, toPartnerBody, toPlacementBody, validatePartner,
  validatePlacement, visiblePlacements,
} from '../../lib/partnerAdmin';
import PartnerCard from '../PartnerCard';

// 제휴 업체 관리 (관리 셸 /admin/partners). 상태 전이·검증은 src/lib/partnerAdmin.js, API 는 src/api/adminPartners.js.
// 실제 접근 통제는 Cloudflare Access + BE JWT 검증이다. 이 화면은 저장 중 잠금·409 재조회·재로그인 안내만 맡는다.

const input = 'w-full rounded-lg border border-warm-beige/60 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold/60';
const button = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const primary = `${button} bg-soft-gold text-white hover:bg-soft-gold/90`;
const secondary = `${button} border border-warm-beige/60 bg-white text-charcoal/70 hover:text-charcoal`;
const danger = `${button} border border-deep-rose/30 bg-white text-deep-rose hover:bg-deep-rose/5`;

const label = (list, value) => list.find((o) => o.value === value)?.label ?? value ?? '-';

function Field({ id, title, hint, error, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-charcoal/70">{title}</label>
      {children}
      {hint && <p className="text-[11px] text-charcoal/40">{hint}</p>}
      {error && <p className="text-[11px] text-deep-rose" role="alert">{error}</p>}
    </div>
  );
}

function Banner({ tone = 'info', children }) {
  const tones = {
    info: 'border-soft-gold/30 bg-soft-gold/10 text-charcoal',
    warn: 'border-deep-rose/30 bg-deep-rose/5 text-deep-rose',
  };
  return <div role={tone === 'warn' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

function AuthNotice({ auth }) {
  if (auth === 'login') {
    return (
      <Banner tone="warn">
        관리 API 로그인이 필요합니다(처음 접속했거나 세션이 끝났습니다).{' '}
        <a href={adminLoginUrl()} className="underline font-semibold">관리 API 로그인</a> 뒤 이 화면으로 돌아옵니다.
      </Banner>
    );
  }
  if (auth === 'forbidden') return <Banner tone="warn">이 계정은 관리 권한이 없거나 허용되지 않은 주소에서 접속했습니다.</Banner>;
  if (auth === 'disabled') return <Banner tone="warn">관리 기능이 꺼져 있습니다(서버 설정). 운영 담당자에게 확인하세요.</Banner>;
  return null;
}

function CatalogLink({ form, onChange, disabled }) {
  // 결과는 검색 당시 종류와 함께 둔다. 종류를 바꾸면 결과·진행 중 검색을 버린다(src/lib/partnerAdmin.js catalogReducer)
  const [catalog, dispatch] = useReducer(catalogReducer, initialCatalog);
  const [query, setQuery] = useState('');
  const seq = useRef(0);
  const { kind, results, error } = catalog;
  const linked = form.vendorId != null ? `업체 #${form.vendorId}` : form.weddingHallId != null ? `웨딩홀 #${form.weddingHallId}` : null;

  const search = async () => {
    const id = ++seq.current;
    const searchedKind = kind;
    dispatch({ type: 'SEARCH_START', seq: id });
    try {
      const items = listItems(await searchCatalog(searchedKind, query.trim()));
      dispatch({ type: 'SEARCH_OK', seq: id, kind: searchedKind, items });
    } catch (e) {
      dispatch({ type: 'SEARCH_FAIL', seq: id, message: e.kind === 'login' ? '관리 API 로그인이 필요합니다' : '검색하지 못했습니다' });
    }
  };

  const pick = (item) => {
    onChange(catalogLinkPatch(results, item));
    dispatch({ type: 'PICKED' });
  };

  return (
    <fieldset className="space-y-2 rounded-xl border border-warm-beige/40 p-3">
      <legend className="px-1 text-xs font-semibold text-charcoal/70">카탈로그 연결 (선택)</legend>
      <p className="text-xs text-charcoal/60">
        {linked ? <>연결: {linked} </> : '연결 없음(독립 제휴사)'}
        {linked && (
          <button type="button" className={`${secondary} ml-2`} disabled={disabled} onClick={() => onChange({ vendorId: null, weddingHallId: null })}>
            연결 해제
          </button>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <select aria-label="카탈로그 종류" className={`${input} w-auto`} value={kind} onChange={(e) => dispatch({ type: 'SET_KIND', kind: e.target.value })}>
          <option value="VENDOR">업체</option>
          <option value="WEDDING_HALL">웨딩홀</option>
        </select>
        <input aria-label="카탈로그 검색어" className={`${input} flex-1 min-w-0`} value={query} maxLength={60} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" className={secondary} disabled={disabled || !query.trim()} onClick={search}>검색</button>
      </div>
      {error && <p className="text-[11px] text-deep-rose">{error}</p>}
      {results && (
        <ul className="max-h-40 overflow-y-auto divide-y divide-warm-beige/30 text-sm">
          {results.items.length === 0 && <li className="py-1 text-charcoal/40">결과 없음</li>}
          {results.items.map((r) => (
            <li key={r.id} className="py-1 flex items-center justify-between gap-2">
              <span className="truncate">#{r.id} {r.name}{r.region ? ` · ${r.region}` : ''}</span>
              <button type="button" className={secondary} disabled={disabled} onClick={() => pick(r)}>
                {results.kind === 'VENDOR' ? '업체로 연결' : '웨딩홀로 연결'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

// 409 가 난 폼: 저장을 잠그고 최신 내용을 받아 다시 적용하게 한다
function ConflictBox({ onRefresh, disabled }) {
  return (
    <div role="alert" className="rounded-xl border border-deep-rose/30 bg-deep-rose/5 px-3 py-2 text-sm text-deep-rose space-y-2">
      <p>다른 곳에서 먼저 바뀌어 저장하지 못했습니다. 최신 내용을 불러온 뒤 바꿀 내용을 다시 적용하세요.</p>
      <button type="button" className={secondary} disabled={disabled} onClick={onRefresh}>최신 불러오기</button>
    </div>
  );
}

function PartnerForm({ form, setForm, onSubmit, onCancel, locked, conflict, onRefresh, refreshDisabled }) {
  const errors = validatePartner(form);
  const set = (patch) => setForm({ ...form, ...patch });
  const preview = {
    placementId: 'preview',
    name: form.name.trim() || '업체명',
    category: form.category,
    region: form.region.trim(),
    summary: form.summary.trim(),
    imageUrl: safeImageUrl(form.imageUrl),
    destinationUrl: safeLinkUrl(form.destinationUrl) ?? 'https://example.com/',
  };

  return (
    <form
      className="grid gap-4 lg:grid-cols-[1fr_280px] rounded-2xl border border-warm-beige/40 bg-white p-4"
      onSubmit={(e) => { e.preventDefault(); if (Object.keys(errors).length === 0) onSubmit(toPartnerBody(form)); }}
    >
      <div className="space-y-3 min-w-0">
        <h3 className="font-bold text-charcoal">{form.id == null ? '새 제휴사 등록' : `제휴사 수정 #${form.id}`}</h3>
        {conflict && <ConflictBox onRefresh={onRefresh} disabled={refreshDisabled} />}
        <Field id="p-name" title="업체명" error={errors.name}>
          <input id="p-name" className={input} value={form.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field id="p-category" title="업종" error={errors.category}>
          <select id="p-category" className={input} value={form.category} onChange={(e) => set({ category: e.target.value })}>
            <option value="">선택</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field id="p-region" title="지역 (선택)">
          <input id="p-region" className={input} value={form.region} maxLength={40} onChange={(e) => set({ region: e.target.value })} />
        </Field>
        <Field id="p-summary" title="소개 문구 (업체가 승인한 문구만, 선택)">
          <textarea id="p-summary" className={input} rows={2} maxLength={200} value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
        </Field>
        <Field id="p-image" title="이미지 경로 (선택)" hint="배포된 /images/partners/… 경로만. 새 이미지는 프론트 배포가 필요합니다." error={errors.imageUrl}>
          <input id="p-image" className={input} value={form.imageUrl} placeholder="/images/partners/파일.webp" onChange={(e) => set({ imageUrl: e.target.value })} />
        </Field>
        <Field id="p-link" title="업체 홈페이지" hint="https:// 주소만" error={errors.destinationUrl}>
          <input id="p-link" className={input} value={form.destinationUrl} placeholder="https://" onChange={(e) => set({ destinationUrl: e.target.value })} />
        </Field>
        <CatalogLink form={form} onChange={set} disabled={locked} />
        {errors.catalog && <p className="text-[11px] text-deep-rose">{errors.catalog}</p>}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          사용 (끄면 이 업체의 모든 노출이 공개에서 빠집니다)
        </label>
        <div className="flex gap-2">
          <button type="submit" className={primary} disabled={locked || Object.keys(errors).length > 0}>저장</button>
          <button type="button" className={secondary} onClick={onCancel}>취소</button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-charcoal/60">공개 카드 미리보기</p>
        <div inert className="pointer-events-none">
          <PartnerCard item={preview} />
        </div>
      </div>
    </form>
  );
}

function PlacementForm({ form, setForm, partners, onSubmit, onCancel, locked, conflict, onRefresh, refreshDisabled }) {
  const errors = validatePlacement(form);
  const set = (patch) => setForm({ ...form, ...patch });

  return (
    <form
      className="space-y-3 rounded-2xl border border-warm-beige/40 bg-white p-4"
      onSubmit={(e) => { e.preventDefault(); if (Object.keys(errors).length === 0) onSubmit(toPlacementBody(form)); }}
    >
      <h3 className="font-bold text-charcoal">{form.id == null ? '새 노출 항목' : `노출 항목 수정 #${form.id}`}</h3>
      {conflict && <ConflictBox onRefresh={onRefresh} disabled={refreshDisabled} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pl-partner" title="제휴사" error={errors.partnerId}>
          <select id="pl-partner" className={input} value={form.partnerId} onChange={(e) => set({ partnerId: e.target.value })}>
            <option value="">선택</option>
            {partners.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
        </Field>
        <Field id="pl-slot" title="노출 위치" error={errors.slot}>
          <select id="pl-slot" className={input} value={form.slot} onChange={(e) => set({ slot: e.target.value })}>
            {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field id="pl-start" title="시작 (KST, 이 시각부터 노출)" error={errors.startsAt}>
          <input id="pl-start" type="datetime-local" className={input} value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </Field>
        <Field id="pl-end" title="끝 (KST, 이 시각 전까지 노출)" hint="예: 10/31까지 노출 → 11/01 00:00 입력" error={errors.endsAt}>
          <input id="pl-end" type="datetime-local" className={input} value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
        </Field>
        <Field id="pl-order" title="순서 (0부터, 작을수록 앞)" error={errors.displayOrder}>
          <input id="pl-order" inputMode="numeric" className={input} value={form.displayOrder} onChange={(e) => set({ displayOrder: e.target.value })} />
        </Field>
        <Field id="pl-contract" title="계약 번호 (관리자 전용, 선택)">
          <input id="pl-contract" className={input} value={form.contractReference} maxLength={80} onChange={(e) => set({ contractReference: e.target.value })} />
        </Field>
        <Field id="pl-price" title="광고 노출 단가 (원)" hint="업체 서비스 가격과 다릅니다. 공개 화면·예산 합계에 쓰지 않습니다." error={errors.unitPrice}>
          <input id="pl-price" inputMode="numeric" className={input} value={form.unitPrice} onChange={(e) => set({ unitPrice: e.target.value })} />
        </Field>
        <Field id="pl-currency" title="통화" error={errors.currency}>
          <select id="pl-currency" className={input} value={form.currency} onChange={(e) => set({ currency: e.target.value })}>
            <option value="">선택</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>원 ({c})</option>)}
          </select>
        </Field>
        <Field id="pl-unit" title="과금 단위" error={errors.billingUnit}>
          <select id="pl-unit" className={input} value={form.billingUnit} onChange={(e) => set({ billingUnit: e.target.value })}>
            <option value="">선택</option>
            {BILLING_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        사용 (단가·통화·과금 단위가 모두 있어야 켤 수 있습니다)
      </label>
      <div className="flex gap-2">
        <button type="submit" className={primary} disabled={locked || Object.keys(errors).length > 0}>저장</button>
        <button type="button" className={secondary} onClick={onCancel}>취소</button>
      </div>
    </form>
  );
}

function AuditList({ partner, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    getAdminAudit(partner.id)
      .then((r) => alive && setRows(listItems(r)))
      .catch(() => alive && setError('변경 기록을 불러오지 못했습니다'));
    return () => { alive = false; };
  }, [partner.id]);

  return (
    <section className="rounded-2xl border border-warm-beige/40 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-charcoal">변경 기록 — {partner.name}</h3>
        <button type="button" className={secondary} onClick={onClose}>닫기</button>
      </div>
      {error && <p className="text-sm text-deep-rose">{error}</p>}
      {!rows && !error && <p className="text-sm text-charcoal/40">불러오는 중…</p>}
      {rows?.length === 0 && <p className="text-sm text-charcoal/40">기록 없음</p>}
      {rows?.length > 0 && (
        <ul className="divide-y divide-warm-beige/30 text-xs">
          {rows.map((r, i) => (
            <li key={r.id ?? i} className="py-1.5 break-words">
              {formatKst(r.at ?? r.createdAt)} · {r.action} · {r.entityType ?? ''} #{r.entityId ?? ''}
              {Array.isArray(r.changedFields) && r.changedFields.length > 0 && ` · ${r.changedFields.join(', ')}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PartnerAdmin() {
  const [state, dispatch] = useReducer(adminReducer, initialAdminState);
  const [partnerForm, setPartnerForm] = useState(null);
  const [placementForm, setPlacementForm] = useState(null);
  const [auditPartner, setAuditPartner] = useState(null);
  // 순서 초안은 그것을 만든 목록에만 붙는다(다시 읽으면 버린다)
  const [orderDraft, setOrderDraft] = useState(null);
  const loadSeq = useRef(0);
  const { slot } = state;
  const locked = !canSave(state);

  // 요청 세대·슬롯을 응답에 묶는다. 나중에 시작한 불러오기가 있으면 이 응답은 reducer 가 버린다
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    dispatch({ type: 'LOAD_START', seq, slot });
    try {
      const me = await getAdminMe();
      const [partners, placements] = await Promise.all([getAdminPartners(), getAdminPlacements(slot)]);
      dispatch({ type: 'LOAD_OK', seq, slot, me, partners: listItems(partners), placements: listItems(placements) });
    } catch (error) {
      dispatch({ type: 'LOAD_FAIL', seq, error });
    }
  }, [slot]);

  useEffect(() => {
    load();
  }, [load]);

  // 저장 성공·409 충돌 뒤에는 최신 상태를 다시 읽는다(덮어쓰지 않음)
  useEffect(() => {
    if (needsReload(state)) load();
  }, [state, load]);

  // target: 409 가 났을 때 잠글 폼('partner' | 'placement' | 'order')
  const run = async (task, message, target) => {
    if (!(target ? canSubmit(state, target) : canSave(state))) return false;
    dispatch({ type: 'SAVE_START' });
    try {
      await task();
      dispatch({ type: 'SAVE_OK', message });
      return true;
    } catch (error) {
      dispatch({ type: 'SAVE_FAIL', error, target });
      return false;
    }
  };

  const partners = state.partners;
  const partnerName = (id) => partners.find((p) => p.id === id)?.name ?? `#${id}`;
  // 선택 슬롯의 데이터만 보이고 다룬다
  const current = visiblePlacements(state);
  const placements = orderDraft?.base === current ? orderDraft.list : sortPlacements(current);
  const orderChanged = orderDraft?.base === current && current.length > 0;

  const move = (index, direction) => setOrderDraft({ base: current, list: reorder(placements, index, direction) });

  // 폼을 닫거나 다른 항목으로 바꾸면 그 폼의 충돌 잠금도 끝난다
  const openPartnerForm = (form) => {
    setPartnerForm(form);
    dispatch({ type: 'FORM_CLOSED', target: 'partner' });
  };
  const openPlacementForm = (form) => {
    setPlacementForm(form);
    dispatch({ type: 'FORM_CLOSED', target: 'placement' });
  };
  const closePartnerForm = () => openPartnerForm(null);
  const closePlacementForm = () => openPlacementForm(null);

  // 409 뒤 「최신 불러오기」: 최신 상세·version 으로 폼을 바꾼다(사용자가 바꿀 내용을 다시 적용)
  const refreshPartnerForm = async () => {
    try {
      if (partnerForm.id != null) setPartnerForm(partnerToForm(await getAdminPartner(partnerForm.id)));
      dispatch({ type: 'FORM_REFRESHED' });
    } catch (error) {
      if (error.kind === 'notFound') {
        closePartnerForm();
        dispatch({ type: 'SAVE_FAIL', error: { kind: 'validation', message: '이 제휴사는 이미 삭제됐습니다.' } });
      } else {
        dispatch({ type: 'SAVE_FAIL', error, target: 'partner' });
      }
    }
  };
  const refreshPlacementForm = () => {
    const latest = latestPlacementForm(current, placementForm.id);
    if (latest) {
      setPlacementForm(latest);
      dispatch({ type: 'FORM_REFRESHED' });
    } else {
      closePlacementForm();
    }
  };
  const refreshDisabled = state.loading || state.stale;

  const removePartner = (p) => {
    if (!window.confirm(`'${p.name}' 제휴사를 삭제할까요? 관련 노출이 모두 공개에서 빠집니다(변경 기록은 남습니다).`)) return;
    run(() => deletePartner(p.id, p.version), '삭제했습니다');
  };

  const removePlacement = (pl) => {
    if (!window.confirm(`'${partnerName(pl.partnerId)}' 노출 항목 #${pl.id} 을 삭제할까요?`)) return;
    run(() => deletePlacement(pl.id, pl.version), '삭제했습니다');
  };

  const stopPlacement = (pl) => {
    if (!window.confirm(`'${partnerName(pl.partnerId)}' 노출을 중지할까요? 열린 화면에서는 최대 60초 안에 내려갑니다.`)) return;
    run(() => savePlacement(toPlacementBody({ ...placementToForm(pl), enabled: false })), '중지했습니다');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-charcoal">제휴 업체 관리</h1>
          <p className="text-xs text-charcoal/50 mt-1 break-all">
            API {API_BASE_URL} · 빌드 {stage}{state.me?.environment ? ` · 서버 ${state.me.environment}` : ''}
          </p>
          <p className="text-xs text-charcoal/50 break-all">
            운영자 {state.me ? (state.me.email ?? state.me.subject ?? '확인됨') : '확인 전'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={secondary} disabled={state.loading} onClick={load}>새로고침</button>
          <Link to="/" reloadDocument className={secondary}>공개 사이트</Link>
        </div>
      </header>

      <AuthNotice auth={state.auth} />
      {state.notice && <Banner>{state.notice}</Banner>}
      {state.error && <Banner tone="warn">{state.error}</Banner>}
      {state.loading && <p className="text-sm text-charcoal/40" role="status">불러오는 중…</p>}

      {state.auth === 'ok' && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-charcoal">제휴사</h2>
              <button type="button" className={primary} disabled={locked} onClick={() => openPartnerForm(emptyPartnerForm())}>새 제휴사</button>
            </div>
            {partnerForm && (
              <PartnerForm
                form={partnerForm}
                setForm={setPartnerForm}
                locked={!canSubmit(state, 'partner')}
                conflict={state.conflict === 'partner'}
                onRefresh={refreshPartnerForm}
                refreshDisabled={refreshDisabled}
                onCancel={closePartnerForm}
                onSubmit={async (body) => { if (await run(() => savePartner(body), '저장했습니다', 'partner')) setPartnerForm(null); }}
              />
            )}
            <div className="overflow-x-auto rounded-2xl border border-warm-beige/40 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-warm-beige/20 text-xs text-charcoal/60">
                  <tr>
                    <th className="px-3 py-2 text-left">업체</th>
                    <th className="px-3 py-2 text-left">업종·지역</th>
                    <th className="px-3 py-2 text-left">사용</th>
                    <th className="px-3 py-2 text-left">연결</th>
                    <th className="px-3 py-2 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-beige/30">
                  {partners.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-charcoal/40">등록된 제휴사가 없습니다</td></tr>}
                  {partners.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-medium break-words">{p.name}</td>
                      <td className="px-3 py-2 text-charcoal/60">{[label(CATEGORIES, p.category), p.region].filter(Boolean).join(' · ')}</td>
                      <td className="px-3 py-2">{p.enabled ? '사용' : '중지'}</td>
                      <td className="px-3 py-2 text-charcoal/60">{p.vendorId != null ? `업체 #${p.vendorId}` : p.weddingHallId != null ? `웨딩홀 #${p.weddingHallId}` : '-'}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                        <button type="button" className={secondary} disabled={locked} onClick={() => openPartnerForm(partnerToForm(p))}>수정</button>
                        <button type="button" className={secondary} onClick={() => setAuditPartner(p)}>기록</button>
                        <button type="button" className={danger} disabled={locked} onClick={() => removePartner(p)}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {auditPartner && <AuditList partner={auditPartner} onClose={() => setAuditPartner(null)} />}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-charcoal">노출 항목</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="노출 위치">
                {SLOTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={slot === s.value}
                    className={slot === s.value ? primary : secondary}
                    onClick={() => dispatch({ type: 'SELECT_SLOT', slot: s.value })}
                  >
                    {s.label}
                  </button>
                ))}
                <button type="button" className={primary} disabled={locked || partners.length === 0} onClick={() => openPlacementForm(emptyPlacementForm(slot))}>새 노출 항목</button>
              </div>
            </div>
            <p className="text-xs text-charcoal/50">
              시각은 KST, 시작 포함·끝 미포함. 상태(예약·노출 중·종료·중지)는 서버가 사용 여부와 기간으로 정합니다. 단가는 광고 노출 단가이며 업체 서비스 가격과 다릅니다.
            </p>
            {placementForm && (
              <PlacementForm
                form={placementForm}
                setForm={setPlacementForm}
                partners={partners}
                locked={!canSubmit(state, 'placement')}
                conflict={state.conflict === 'placement'}
                onRefresh={refreshPlacementForm}
                refreshDisabled={refreshDisabled}
                onCancel={closePlacementForm}
                onSubmit={async (body) => { if (await run(() => savePlacement(body), '저장했습니다', 'placement')) setPlacementForm(null); }}
              />
            )}
            <div className="overflow-x-auto rounded-2xl border border-warm-beige/40 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-warm-beige/20 text-xs text-charcoal/60">
                  <tr>
                    <th className="px-3 py-2 text-left">순서</th>
                    <th className="px-3 py-2 text-left">업체</th>
                    <th className="px-3 py-2 text-left">상태</th>
                    <th className="px-3 py-2 text-left">기간 (KST)</th>
                    <th className="px-3 py-2 text-left">광고 노출 단가</th>
                    <th className="px-3 py-2 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-beige/30">
                  {placements.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-charcoal/40">이 위치의 노출 항목이 없습니다</td></tr>}
                  {placements.map((pl, i) => (
                    <tr key={pl.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-block w-6">{pl.displayOrder}</span>
                        <button type="button" className={secondary} aria-label={`${partnerName(pl.partnerId)} 위로`} disabled={locked || i === 0} onClick={() => move(i, -1)}>↑</button>
                        <button type="button" className={`${secondary} ml-1`} aria-label={`${partnerName(pl.partnerId)} 아래로`} disabled={locked || i === placements.length - 1} onClick={() => move(i, 1)}>↓</button>
                      </td>
                      <td className="px-3 py-2 break-words">{pl.partnerName ?? partnerName(pl.partnerId)}</td>
                      <td className="px-3 py-2">{PLACEMENT_STATUS[pl.status] ?? (pl.enabled ? '사용' : '중지')}</td>
                      <td className="px-3 py-2 text-xs text-charcoal/60 whitespace-nowrap">{formatKst(pl.startsAt)} ~<br />{formatKst(pl.endsAt)} 전</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {pl.unitPrice == null ? '미입력' : `${Number(pl.unitPrice).toLocaleString('ko-KR')}원 / ${label(BILLING_UNITS, pl.billingUnit)}`}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                        <button type="button" className={secondary} disabled={locked} onClick={() => openPlacementForm(placementToForm(pl))}>수정</button>
                        {pl.enabled && <button type="button" className={secondary} disabled={locked} onClick={() => stopPlacement(pl)}>중지</button>}
                        <button type="button" className={danger} disabled={locked} onClick={() => removePlacement(pl)}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orderChanged && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className={primary}
                  disabled={!canSubmit(state, 'order')}
                  onClick={async () => { if (await run(() => savePlacementOrder(state.dataSlot, placements), '순서를 저장했습니다', 'order')) setOrderDraft(null); }}
                >
                  순서 저장
                </button>
                <button type="button" className={secondary} onClick={() => setOrderDraft(null)}>되돌리기</button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
