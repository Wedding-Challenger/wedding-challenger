// 관리 화면의 상태 전이·입력 검증·KST 변환·순서 계산 (순수 함수). 화면은 src/components/admin/PartnerAdmin.jsx.
// 서버가 최종 검증한다. 여기서는 저장 전에 잘못된 입력을 막고, 409·재로그인 같은 흐름을 한곳에서 정한다.
import { PARTNER_CATEGORIES, safeImageUrl, safeLinkUrl } from './partnerFeed';

export const SLOTS = [
  { value: 'HOME_MAIN', label: '홈 메인 제휴 노출' },
  { value: 'BUDGET_PARTNERS', label: '예산 계산 제휴 업체' },
];

// 업종 목록은 공개 카드와 같이 쓴다(새 PartnerCategory, 계획서 §3.1)
export const CATEGORIES = PARTNER_CATEGORIES;

export const BILLING_UNITS = [
  { value: 'DAY', label: '일' },
  { value: 'MONTH', label: '월' },
  { value: 'CAMPAIGN', label: '해당 기간 전체' },
];

export const CURRENCIES = ['KRW'];

// 노출 상태는 서버가 enabled·기간으로 파생해 내려 준다
export const PLACEMENT_STATUS = { SCHEDULED: '예약', ACTIVE: '노출 중', ENDED: '종료', DISABLED: '중지' };

const has = (list, value) => list.some((o) => (o.value ?? o) === value);
const blank = (v) => v == null || String(v).trim() === '';
const isWholeNumber = (v) => /^\d+$/.test(String(v).trim());

// ---- 입력 검증 ({ 필드: 메시지 }, 비어 있으면 통과) ----

export function validatePartner(form) {
  const errors = {};
  const name = (form.name ?? '').trim();
  if (!name) errors.name = '업체명을 입력하세요';
  else if (name.length > 120) errors.name = '업체명은 120자 이하';
  if (!has(CATEGORIES, form.category)) errors.category = '업종을 고르세요';
  if (!blank(form.imageUrl) && !safeImageUrl(form.imageUrl)) {
    errors.imageUrl = '이미지는 배포된 /images/partners/ 아래 경로만 쓸 수 있습니다';
  }
  if (!safeLinkUrl(form.destinationUrl)) errors.destinationUrl = '업체 홈페이지는 https:// 주소만 쓸 수 있습니다';
  if (!blank(form.vendorId) && !blank(form.weddingHallId)) errors.catalog = '카탈로그 연결은 업체·웨딩홀 중 하나만';
  return errors;
}

export function validatePlacement(form) {
  const errors = {};
  if (blank(form.partnerId)) errors.partnerId = '제휴사를 고르세요';
  if (!has(SLOTS, form.slot)) errors.slot = '노출 위치를 고르세요';
  const starts = kstInputToIso(form.startsAt);
  const ends = kstInputToIso(form.endsAt);
  if (!starts) errors.startsAt = '시작 시각을 입력하세요';
  if (!ends) errors.endsAt = '끝 시각을 입력하세요';
  else if (starts && Date.parse(ends) <= Date.parse(starts)) errors.endsAt = '끝 시각은 시작보다 뒤여야 합니다';
  if (!isWholeNumber(form.displayOrder)) errors.displayOrder = '순서는 0 이상의 정수';
  if (!blank(form.unitPrice) && !isWholeNumber(form.unitPrice)) errors.unitPrice = '단가는 0 이상의 원 단위 정수';
  if (!blank(form.currency) && !CURRENCIES.includes(form.currency)) errors.currency = '통화는 원(KRW)만';
  if (!blank(form.billingUnit) && !has(BILLING_UNITS, form.billingUnit)) errors.billingUnit = '과금 단위를 고르세요';
  // 초안은 비워 둘 수 있지만, 사용하려면 사람이 정한 단가·통화·과금 단위가 모두 있어야 한다(0원도 명시 입력)
  if (form.enabled) {
    if (blank(form.unitPrice)) errors.unitPrice = '사용하려면 광고 노출 단가를 입력하세요';
    if (blank(form.currency)) errors.currency = '사용하려면 통화를 고르세요';
    if (blank(form.billingUnit)) errors.billingUnit = '사용하려면 과금 단위를 고르세요';
  }
  return errors;
}

// ---- KST 시각 (입력: <input type="datetime-local"> 값을 KST 로 해석, 전송: +09:00 ISO) ----

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstInputToIso(value) {
  if (blank(value) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  return `${value}:00+09:00`;
}

export function isoToKstInput(iso) {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return '';
  return new Date(t + KST_OFFSET_MS).toISOString().slice(0, 16);
}

// 목록 표시용 'YYYY-MM-DD HH:mm KST'
export const formatKst = (iso) => {
  const v = isoToKstInput(iso);
  return v ? `${v.replace('T', ' ')} KST` : '-';
};

// ---- 순서 ----

export function reorder(list, index, direction) {
  const target = index + direction;
  const next = [...list];
  if (target >= 0 && target < list.length) [next[index], next[target]] = [next[target], next[index]];
  return next.map((p, i) => ({ ...p, displayOrder: i }));
}

export const orderPayload = (slot, list) => ({
  slot,
  items: list.map(({ id, displayOrder, version }) => ({ id, displayOrder, version })),
});

// ---- 화면 상태 ----
// 불러오기는 요청 세대(seq)·슬롯을 함께 싣고, 같은 seq 의 응답만 반영한다(늦게 온 이전 슬롯 응답 무시).
// 쓰기는 「선택 슬롯 = 받은 데이터 슬롯」이고, 저장·충돌 뒤 다시 읽기가 성공한 상태(stale 아님)일 때만 허용한다.
// 409 가 난 폼은 폼 종류+id 별로 잠그고(conflicts), 그 폼의 「최신 불러오기」 성공이나 닫기만 그 잠금을 푼다.
// 순서 409 는 순서 편집 영역만 따로 잠근다(orderConflict). 최신 읽기 요청 상태(latestPending)는 저장 상태와 따로 둔다.

export const initialAdminState = {
  auth: 'unknown', // unknown | ok | login | forbidden | disabled
  slot: SLOTS[1].value, // 선택한 노출 위치
  dataSlot: null, // placements 가 어느 슬롯 응답인지
  pendingSeq: null,
  loading: false,
  saving: false,
  stale: false, // 저장·충돌 뒤 다시 읽기 성공 전
  reloadRequested: false, // 자동으로 한 번 다시 읽기
  conflicts: {}, // 409 가 난 폼: { 'partner:1': true, 'placement:10': true }
  orderConflict: false,
  latestPending: null, // 최신 불러오기 진행 중인 폼 키
  me: null,
  partners: [],
  placements: [],
  notice: null,
  error: null,
};

const CONFLICT_NOTICE = '다른 곳에서 바뀐 내용이 있어 최신 상태를 다시 불러왔습니다. 「최신 불러오기」로 최신 내용을 받은 뒤 바꿀 내용을 다시 적용해 저장하세요.';
const AUTH_BY_KIND = { login: 'login', forbidden: 'forbidden', notFound: 'disabled' };

function errorMessage(error) {
  if (error?.kind === 'network') return '네트워크 오류로 처리하지 못했습니다. 연결을 확인하고 다시 시도하세요.';
  return error?.message || '처리하지 못했습니다. 잠시 뒤 다시 시도하세요.';
}

export function adminReducer(state, action) {
  switch (action.type) {
    case 'SELECT_SLOT':
      return { ...state, slot: action.slot };
    case 'LOAD_START':
      // stale 은 다시 읽기가 성공할 때만 푼다
      return { ...state, loading: true, pendingSeq: action.seq, reloadRequested: false, error: null };
    case 'LOAD_OK':
      if (action.seq !== state.pendingSeq) return state;
      return {
        ...state,
        loading: false,
        pendingSeq: null,
        stale: false,
        auth: 'ok',
        dataSlot: action.slot,
        me: action.me,
        partners: action.partners,
        placements: action.placements,
      };
    case 'LOAD_FAIL': {
      if (action.seq !== state.pendingSeq) return state;
      const auth = AUTH_BY_KIND[action.error?.kind];
      return { ...state, loading: false, pendingSeq: null, ...(auth ? { auth } : { error: errorMessage(action.error) }) };
    }
    case 'SAVE_START':
      if (state.saving) return state;
      return { ...state, saving: true, notice: null, error: null };
    case 'SAVE_OK':
      return { ...state, saving: false, stale: true, reloadRequested: true, notice: action.message ?? '저장했습니다' };
    case 'SAVE_FAIL': {
      const kind = action.error?.kind;
      if (kind === 'conflict') {
        const locked = { ...state, saving: false, stale: true, reloadRequested: true, notice: CONFLICT_NOTICE };
        if (action.target === 'order') return { ...locked, orderConflict: true };
        if (action.target) return { ...locked, conflicts: { ...state.conflicts, [formKey(action.target, action.id)]: true } };
        return locked;
      }
      if (kind === 'login' || kind === 'forbidden') return { ...state, saving: false, auth: AUTH_BY_KIND[kind] };
      return { ...state, saving: false, error: errorMessage(action.error) };
    }
    case 'FORM_REFRESHED':
      return {
        ...unlock(state, formKey(action.target, action.id)),
        notice: '최신 내용으로 바꿨습니다. 바꿀 내용을 다시 적용해 저장하세요.',
      };
    case 'FORM_CLOSED':
      return unlock(state, formKey(action.target, action.id));
    case 'ORDER_REFRESHED':
      return { ...state, orderConflict: false };
    case 'LATEST_START':
      return { ...state, latestPending: formKey(action.target, action.id), error: null };
    case 'LATEST_CANCEL':
      return state.latestPending ? { ...state, latestPending: null } : state;
    case 'LATEST_FAIL':
      // 저장 상태(saving)는 건드리지 않는다
      return { ...state, latestPending: null, error: errorMessage(action.error) };
    case 'DISMISS':
      return { ...state, notice: null, error: null };
    default:
      return state;
  }
}

export const formKey = (target, id) => `${target}:${id ?? 'new'}`;

function unlock(state, key) {
  const pending = state.latestPending === key ? null : state.latestPending;
  if (!state.conflicts[key]) return pending === state.latestPending ? state : { ...state, latestPending: pending };
  const conflicts = { ...state.conflicts };
  delete conflicts[key];
  return { ...state, conflicts, latestPending: pending };
}

export const canSave = (state) =>
  state.auth === 'ok' && !state.loading && !state.saving && !state.stale && state.dataSlot === state.slot;
// 409 가 난 폼(종류+id)은 최신 불러오기 전까지 잠근다
export const canSubmit = (state, target, id) => canSave(state) && !state.conflicts[formKey(target, id)];
export const canEditOrder = (state) => canSave(state) && !state.orderConflict;
export const isLatestPending = (state, target, id) => state.latestPending === formKey(target, id);
export const needsReload = (state) => state.reloadRequested && !state.loading;
// 선택 슬롯의 데이터가 아니면 보이지 않는다(이전 슬롯 목록을 현재 슬롯처럼 다루지 않게)
export const visiblePlacements = (state) => (state.dataSlot === state.slot ? state.placements : []);

// ---- 카탈로그 검색 ----
// 결과는 검색 당시 종류(kind)와 함께 둔다. 종류를 바꾸면 결과·진행 중 검색을 무효로 하고, 마지막 검색 응답만 받는다.

export const initialCatalog = { kind: 'VENDOR', activeSeq: null, results: null, error: null };

export function catalogReducer(state, action) {
  switch (action.type) {
    case 'SET_KIND':
      return { ...state, kind: action.kind, activeSeq: null, results: null, error: null };
    case 'SEARCH_START':
      return { ...state, activeSeq: action.seq, results: null, error: null };
    case 'SEARCH_OK':
      if (action.seq !== state.activeSeq || action.kind !== state.kind) return state;
      return { ...state, activeSeq: null, results: { kind: action.kind, items: action.items } };
    case 'SEARCH_FAIL':
      if (action.seq !== state.activeSeq) return state;
      return { ...state, activeSeq: null, error: action.message };
    case 'PICKED':
      return { ...state, results: null };
    default:
      return state;
  }
}

export const catalogLinkPatch = (results, item) =>
  results.kind === 'VENDOR' ? { vendorId: item.id, weddingHallId: null } : { vendorId: null, weddingHallId: item.id };

// ---- 화면 폼 ↔ API body ----

const text = (v) => (blank(v) ? null : String(v).trim());
const num = (v) => (blank(v) ? null : Number(v));

export const emptyPartnerForm = () => ({
  name: '', category: '', region: '', summary: '', imageUrl: '', destinationUrl: '', enabled: false,
  vendorId: null, weddingHallId: null,
});

export const partnerToForm = (p) => ({
  id: p.id,
  version: p.version,
  name: p.name ?? '',
  category: p.category ?? '',
  region: p.region ?? '',
  summary: p.summary ?? '',
  imageUrl: p.imageUrl ?? '',
  destinationUrl: p.destinationUrl ?? '',
  enabled: p.enabled === true,
  vendorId: p.vendorId ?? null,
  weddingHallId: p.weddingHallId ?? null,
});

export const toPartnerBody = (f) => ({
  ...(f.id == null ? {} : { id: f.id, version: f.version }),
  name: f.name.trim(),
  category: f.category,
  region: text(f.region),
  summary: text(f.summary),
  imageUrl: text(f.imageUrl),
  destinationUrl: f.destinationUrl.trim(),
  enabled: f.enabled === true,
  vendorId: num(f.vendorId),
  weddingHallId: num(f.weddingHallId),
});

export const emptyPlacementForm = (slot) => ({
  partnerId: '', slot, startsAt: '', endsAt: '', displayOrder: '0', enabled: false,
  contractReference: '', unitPrice: '', currency: 'KRW', billingUnit: '',
});

export const placementToForm = (p) => ({
  id: p.id,
  version: p.version,
  partnerId: p.partnerId == null ? '' : String(p.partnerId),
  slot: p.slot,
  startsAt: isoToKstInput(p.startsAt),
  endsAt: isoToKstInput(p.endsAt),
  displayOrder: String(p.displayOrder ?? 0),
  enabled: p.enabled === true,
  contractReference: p.contractReference ?? '',
  unitPrice: p.unitPrice == null ? '' : String(p.unitPrice),
  currency: p.currency ?? '',
  billingUnit: p.billingUnit ?? '',
});

export const toPlacementBody = (f) => ({
  ...(f.id == null ? {} : { id: f.id, version: f.version }),
  partnerId: Number(f.partnerId),
  slot: f.slot,
  startsAt: kstInputToIso(f.startsAt),
  endsAt: kstInputToIso(f.endsAt),
  displayOrder: Number(f.displayOrder),
  enabled: f.enabled === true,
  contractReference: text(f.contractReference),
  unitPrice: num(f.unitPrice),
  currency: text(f.currency),
  billingUnit: text(f.billingUnit),
});

// 노출 목록 정렬: displayOrder ASC, id ASC (서버 공개 정렬과 같은 두 번째 키)
export const sortPlacements = (list) =>
  [...list].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);

// 409 뒤 「최신 불러오기」: 다시 읽은 목록에서 같은 노출 항목의 최신 값·version 으로 폼을 만든다(없으면 삭제된 것)
export function latestPlacementForm(placements, id) {
  const latest = placements.find((p) => p.id === id);
  return latest ? placementToForm(latest) : null;
}

// 409 뒤 업체 「최신 불러오기」 요청. 저장과 별개의 요청 상태이며, 마지막 요청만 반영한다.
// 폼을 닫거나 다른 항목으로 바꾸거나 화면이 사라지면 invalidate() 로 진행 중 응답을 버린다.
export function createLatestLoader({ load, onApply, onFail }) {
  let seq = 0;
  let current = null;
  return {
    start(target, id) {
      const my = { seq: ++seq, target, id };
      current = my;
      let request;
      try {
        request = Promise.resolve(load(target, id));
      } catch (error) {
        request = Promise.reject(error);
      }
      request.then(
        (value) => {
          if (current !== my) return;
          current = null;
          onApply(target, id, value);
        },
        (error) => {
          if (current !== my) return;
          current = null;
          onFail(target, id, error);
        },
      );
    },
    invalidate() {
      current = null;
    },
  };
}
