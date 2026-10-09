import { describe, expect, it } from 'vitest';
import {
  adminReducer, canEditOrder, canSave, canSubmit, catalogLinkPatch, createLatestLoader, isLatestPending, catalogReducer, initialAdminState, initialCatalog, isoToKstInput,
  kstInputToIso, latestPlacementForm, needsReload, orderPayload, reorder, validatePartner, validatePlacement,
  visiblePlacements,
} from '../partnerAdmin';

const err = (kind, message = '') => ({ kind, message });

// 불러오기는 요청 세대(seq)와 슬롯을 함께 싣는다. 응답도 같은 seq·slot 으로 돌아와야 반영된다.
const SLOT = 'BUDGET_PARTNERS';
const start = (s, seq, slot = SLOT) => adminReducer(s, { type: 'LOAD_START', seq, slot });
const loadOk = (s, seq, slot = SLOT, data = {}) => adminReducer(s, {
  type: 'LOAD_OK', seq, slot, me: { subject: 'op', environment: 'dev' }, partners: [{ id: 1 }], placements: [], ...data,
});

describe('관리 화면 reducer', () => {
  const loaded = loadOk(start(initialAdminState, 1), 1);

  it('loadOkUnlocksSave — 불러오기 전·중에는 저장 잠금', () => {
    expect(canSave(initialAdminState)).toBe(false);
    expect(canSave(start(initialAdminState, 1))).toBe(false);
    expect(loaded.auth).toBe('ok');
    expect(loaded.dataSlot).toBe(SLOT);
    expect(canSave(loaded)).toBe(true);
  });

  it('savingLocksAndIgnoresSecondSubmit — 저장 중에는 잠그고 두 번째 저장 시작을 무시', () => {
    const saving = adminReducer(loaded, { type: 'SAVE_START' });
    expect(canSave(saving)).toBe(false);
    expect(adminReducer(saving, { type: 'SAVE_START' })).toBe(saving);
  });

  it('saveOkReloadsInsteadOfRetrying — 성공하면 다시 읽고, 자동 재시도는 없다', () => {
    const done = adminReducer(adminReducer(loaded, { type: 'SAVE_START' }), { type: 'SAVE_OK', message: '저장했습니다' });
    expect(done.saving).toBe(false);
    expect(needsReload(done)).toBe(true);
    expect(done.notice).toBe('저장했습니다');
    // 다시 읽기 전에는 옛 version 으로 또 저장하지 못한다
    expect(canSave(done)).toBe(false);
    const reloading = start(done, 2);
    expect(needsReload(reloading)).toBe(false);
    expect(canSave(loadOk(reloading, 2))).toBe(true);
  });

  it('conflictReloadsLatestAndKeepsWarning — 409 는 최신 상태를 다시 받고 덮어쓰지 않는다', () => {
    const conflict = adminReducer(adminReducer(loaded, { type: 'SAVE_START' }), { type: 'SAVE_FAIL', error: err('conflict'), target: 'partner' });
    expect(conflict.saving).toBe(false);
    expect(needsReload(conflict)).toBe(true);
    expect(conflict.notice).toMatch(/다른 곳에서 바뀐/);
    const reloaded = loadOk(start(conflict, 2), 2, SLOT, { partners: [{ id: 1, version: 9 }] });
    expect(reloaded.partners).toEqual([{ id: 1, version: 9 }]);
    expect(reloaded.notice).toMatch(/다른 곳에서 바뀐/);
    expect(needsReload(reloaded)).toBe(false);
  });

  it.each([
    ['login', 'login'],
    ['forbidden', 'forbidden'],
    ['notFound', 'disabled'],
  ])('loadFailureSetsAuthState — %s → %s', (kind, auth) => {
    const s = adminReducer(start(initialAdminState, 1), { type: 'LOAD_FAIL', seq: 1, error: err(kind) });
    expect(s.auth).toBe(auth);
    expect(canSave(s)).toBe(false);
  });

  it('sessionExpiryDuringSaveAsksRelogin — 저장 중 Access 만료면 재로그인 안내', () => {
    const s = adminReducer(adminReducer(loaded, { type: 'SAVE_START' }), { type: 'SAVE_FAIL', error: err('login') });
    expect(s.auth).toBe('login');
    expect(s.saving).toBe(false);
  });

  it('validationAndNetworkKeepData — 400·네트워크 실패는 데이터 유지, 메시지만', () => {
    const s = adminReducer(adminReducer(loaded, { type: 'SAVE_START' }), { type: 'SAVE_FAIL', error: err('validation', '기간이 잘못됐습니다') });
    expect(s.error).toBe('기간이 잘못됐습니다');
    expect(s.partners).toBe(loaded.partners);
    expect(needsReload(s)).toBe(false);
    const n = adminReducer(adminReducer(loaded, { type: 'SAVE_START' }), { type: 'SAVE_FAIL', error: err('network') });
    expect(n.error).toMatch(/네트워크/);
    expect(canSave(n)).toBe(true);
  });
});

describe('슬롯 전환과 늦은 응답 (리뷰 지적 2)', () => {
  const loaded = loadOk(start(initialAdminState, 1), 1);

  it('olderSlotResponseArrivingLateIsIgnored — 먼저 시작한 이전 슬롯 응답이 늦게 와도 현재 슬롯을 덮지 않는다', () => {
    // BUDGET(seq 2) 요청 중 HOME_MAIN 으로 바꿔 seq 3 요청 → 3 이 먼저, 2 가 나중에 도착
    let s = start(loaded, 2, 'BUDGET_PARTNERS');
    s = adminReducer(s, { type: 'SELECT_SLOT', slot: 'HOME_MAIN' });
    s = start(s, 3, 'HOME_MAIN');
    s = loadOk(s, 3, 'HOME_MAIN', { placements: [{ id: 30, slot: 'HOME_MAIN' }] });
    expect(canSave(s)).toBe(true);
    const late = loadOk(s, 2, 'BUDGET_PARTNERS', { placements: [{ id: 20, slot: 'BUDGET_PARTNERS' }] });
    expect(late).toBe(s);
    expect(late.dataSlot).toBe('HOME_MAIN');
    expect(late.placements).toEqual([{ id: 30, slot: 'HOME_MAIN' }]);
    // 늦은 실패도 무시
    expect(adminReducer(s, { type: 'LOAD_FAIL', seq: 2, error: err('network') })).toBe(s);
  });

  it('lateOkDoesNotUnlockWhileNewerLoadPending — 오래된 응답이 저장 잠금을 풀지 않는다', () => {
    let s = start(loaded, 2, 'BUDGET_PARTNERS');
    s = adminReducer(s, { type: 'SELECT_SLOT', slot: 'HOME_MAIN' });
    s = start(s, 3, 'HOME_MAIN');
    s = loadOk(s, 2, 'BUDGET_PARTNERS');
    expect(s.loading).toBe(true);
    expect(canSave(s)).toBe(false);
  });

  it('writesOnlyWhenSelectedSlotMatchesData — 선택 슬롯과 받은 데이터 슬롯이 같을 때만 쓰기', () => {
    const switched = adminReducer(loaded, { type: 'SELECT_SLOT', slot: 'HOME_MAIN' });
    expect(switched.dataSlot).toBe('BUDGET_PARTNERS');
    expect(canSave(switched)).toBe(false);
    expect(visiblePlacements(switched)).toEqual([]);
    const back = adminReducer(switched, { type: 'SELECT_SLOT', slot: 'BUDGET_PARTNERS' });
    expect(canSave(back)).toBe(true);
  });
});

describe('409 충돌 폼 잠금 (리뷰 1판 4·2판 2)', () => {
  const loaded = loadOk(start(initialAdminState, 1), 1, SLOT, {
    placements: [{ id: 10, partnerId: 1, slot: SLOT, startsAt: '2026-10-01T00:00:00+09:00', endsAt: '2026-11-01T00:00:00+09:00', displayOrder: 0, enabled: false, version: 2 }],
  });
  const conflictOn = (s, target, id) => adminReducer(adminReducer(s, { type: 'SAVE_START' }), { type: 'SAVE_FAIL', error: err('conflict'), target, id });
  const conflict = conflictOn(loaded, 'placement', 10);

  it('conflictLocksThatFormUntilLatestLoaded — 충돌한 폼은 최신 불러오기 전까지 저장 잠금', () => {
    const reloaded = loadOk(start(conflict, 2), 2, SLOT, {
      placements: [{ ...loaded.placements[0], displayOrder: 4, version: 5 }],
    });
    expect(canSave(reloaded)).toBe(true);
    expect(canSubmit(reloaded, 'placement', 10)).toBe(false);
    expect(canSubmit(reloaded, 'partner', 1)).toBe(true);
    const form = latestPlacementForm(reloaded.placements, 10);
    expect(form.version).toBe(5);
    expect(form.displayOrder).toBe('4');
    const refreshed = adminReducer(reloaded, { type: 'FORM_REFRESHED', target: 'placement', id: 10 });
    expect(canSubmit(refreshed, 'placement', 10)).toBe(true);
    expect(latestPlacementForm(reloaded.placements, 99)).toBeNull();
  });

  it('staleKeptUntilReloadSucceeds — 재조회가 실패하면 저장 잠금을 유지하고 자동 재시도로 돌지 않는다', () => {
    const reloading = start(conflict, 2);
    expect(canSave(reloading)).toBe(false);
    const failed = adminReducer(reloading, { type: 'LOAD_FAIL', seq: 2, error: err('network') });
    expect(canSave(failed)).toBe(false);
    expect(canSubmit(failed, 'partner', 1)).toBe(false);
    expect(needsReload(failed)).toBe(false);
    expect(canSave(loadOk(start(failed, 3), 3))).toBe(true);
  });

  it('closeClearsOnlyThatForm — 닫은 폼의 잠금만 풀린다', () => {
    const reloaded = loadOk(start(conflict, 2), 2);
    expect(canSubmit(adminReducer(reloaded, { type: 'FORM_CLOSED', target: 'partner', id: 1 }), 'placement', 10)).toBe(false);
    expect(canSubmit(adminReducer(reloaded, { type: 'FORM_CLOSED', target: 'placement', id: 10 }), 'placement', 10)).toBe(true);
  });

  it('twoFormsConflictInTurn — 업체 409 → 재조회 → 노출 409 → 재조회여도 업체 잠금이 남는다', () => {
    let s = conflictOn(loaded, 'partner', 1);
    s = loadOk(start(s, 2), 2);
    s = conflictOn(s, 'placement', 10);
    s = loadOk(start(s, 3), 3);
    expect(canSubmit(s, 'partner', 1)).toBe(false);
    expect(canSubmit(s, 'placement', 10)).toBe(false);
    // 노출 폼만 최신 불러오기 → 업체 폼은 여전히 잠금
    s = adminReducer(s, { type: 'FORM_REFRESHED', target: 'placement', id: 10 });
    expect(canSubmit(s, 'placement', 10)).toBe(true);
    expect(canSubmit(s, 'partner', 1)).toBe(false);
    s = adminReducer(s, { type: 'FORM_REFRESHED', target: 'partner', id: 1 });
    expect(canSubmit(s, 'partner', 1)).toBe(true);
    // 같은 종류의 다른 폼(다른 id)은 잠기지 않는다
    expect(canSubmit(conflictOn(loaded, 'partner', 1), 'partner', 2)).toBe(false); // stale 이라 전체 잠금
    expect(canSubmit(loadOk(start(conflictOn(loaded, 'partner', 1), 2), 2), 'partner', 2)).toBe(true);
  });

  it('orderConflictIsSeparateAndSurvivesReload — 순서 409 는 순서 편집 영역만 잠그고 재조회로 풀리지 않는다', () => {
    let s = conflictOn(loaded, 'partner', 1);
    s = loadOk(start(s, 2), 2);
    s = adminReducer(adminReducer(s, { type: 'SAVE_START' }), { type: 'SAVE_FAIL', error: err('conflict'), target: 'order' });
    s = loadOk(start(s, 3), 3);
    expect(canEditOrder(s)).toBe(false);
    expect(canSubmit(s, 'partner', 1)).toBe(false); // 이전 폼 잠금도 유지
    s = adminReducer(s, { type: 'ORDER_REFRESHED' });
    expect(canEditOrder(s)).toBe(true);
    expect(canSubmit(s, 'partner', 1)).toBe(false);
  });
});

describe('최신 불러오기 요청 (리뷰 2판 3)', () => {
  const loaded = loadOk(start(initialAdminState, 1), 1);
  const conflicted = loadOk(start(adminReducer(adminReducer(loaded, { type: 'SAVE_START' }), {
    type: 'SAVE_FAIL', error: err('conflict'), target: 'partner', id: 1,
  }), 2), 2);

  it('latestFailureDoesNotTouchOtherSave — 최신 읽기 실패는 진행 중인 다른 저장 상태를 바꾸지 않는다', () => {
    let s = adminReducer(conflicted, { type: 'LATEST_START', target: 'partner', id: 1 });
    expect(isLatestPending(s, 'partner', 1)).toBe(true);
    s = adminReducer(s, { type: 'SAVE_START' }); // 다른 폼 저장 진행
    s = adminReducer(s, { type: 'LATEST_FAIL', target: 'partner', id: 1, error: err('network') });
    expect(s.saving).toBe(true);
    expect(isLatestPending(s, 'partner', 1)).toBe(false);
    expect(s.error).toMatch(/네트워크/);
    expect(canSubmit(adminReducer(s, { type: 'SAVE_OK' }), 'partner', 1)).toBe(false);
  });
});

describe('카탈로그 검색 kind (리뷰 지적 3)', () => {
  const ok = (s, seq, kind, items) => catalogReducer(s, { type: 'SEARCH_OK', seq, kind, items });

  it('kindChangeClearsResults — 업체 결과를 띄운 뒤 웨딩홀로 바꾸면 결과를 지운다', () => {
    let s = catalogReducer(initialCatalog, { type: 'SEARCH_START', seq: 1 });
    s = ok(s, 1, 'VENDOR', [{ id: 7, name: '샘플 업체' }]);
    expect(s.results).toEqual({ kind: 'VENDOR', items: [{ id: 7, name: '샘플 업체' }] });
    s = catalogReducer(s, { type: 'SET_KIND', kind: 'WEDDING_HALL' });
    expect(s.results).toBeNull();
  });

  it('responseForPreviousKindIgnored — 종류를 바꾼 뒤 도착한 이전 검색 응답은 버린다', () => {
    let s = catalogReducer(initialCatalog, { type: 'SEARCH_START', seq: 1 });
    s = catalogReducer(s, { type: 'SET_KIND', kind: 'WEDDING_HALL' });
    expect(ok(s, 1, 'VENDOR', [{ id: 7 }])).toBe(s);
  });

  it('olderSearchIgnored — 나중 검색이 시작되면 먼저 검색 응답은 버린다', () => {
    let s = catalogReducer(initialCatalog, { type: 'SEARCH_START', seq: 1 });
    s = catalogReducer(s, { type: 'SEARCH_START', seq: 2 });
    expect(ok(s, 1, 'VENDOR', [{ id: 1 }])).toBe(s);
    expect(ok(s, 2, 'VENDOR', [{ id: 2 }]).results.items).toEqual([{ id: 2 }]);
  });

  it('pickUsesKindOfSearch — 연결은 검색 당시 종류로 해석한다', () => {
    expect(catalogLinkPatch({ kind: 'VENDOR', items: [] }, { id: 7 })).toEqual({ vendorId: 7, weddingHallId: null });
    expect(catalogLinkPatch({ kind: 'WEDDING_HALL', items: [] }, { id: 7 })).toEqual({ vendorId: null, weddingHallId: 7 });
  });
});

describe('제휴사 입력 검증', () => {
  const base = { name: '샘플 업체', category: 'SNAP', imageUrl: '/images/partners/a.webp', destinationUrl: 'https://example.com/' };

  it('acceptsStandalonePartner — 카탈로그 연결 없는 독립 제휴사', () => {
    expect(validatePartner(base)).toEqual({});
    expect(validatePartner({ ...base, imageUrl: '', vendorId: 3 })).toEqual({});
  });

  it.each([
    ['이름 없음', { name: ' ' }, 'name'],
    ['이름 120자 초과', { name: 'a'.repeat(121) }, 'name'],
    ['모르는 업종', { category: 'CATERING' }, 'category'],
    ['외부 이미지', { imageUrl: 'https://cdn.example/a.webp' }, 'imageUrl'],
    ['프로토콜 상대 이미지', { imageUrl: '//cdn.example/a.webp' }, 'imageUrl'],
    ['경로 순회', { imageUrl: '/images/partners/../secret.webp' }, 'imageUrl'],
    ['다른 폴더', { imageUrl: '/images/wedding/a.svg' }, 'imageUrl'],
    ['제어 문자', { imageUrl: '/images/partners/a\n.webp' }, 'imageUrl'],
    ['http 링크', { destinationUrl: 'http://example.com/' }, 'destinationUrl'],
    ['javascript 링크', { destinationUrl: 'javascript:alert(1)' }, 'destinationUrl'],
    ['카탈로그 둘 다 연결', { vendorId: 1, weddingHallId: 2 }, 'catalog'],
  ])('rejects — %s', (_, over, field) => {
    expect(validatePartner({ ...base, ...over })).toHaveProperty(field);
  });
});

describe('노출 항목 입력 검증', () => {
  const base = {
    partnerId: 1, slot: 'BUDGET_PARTNERS', startsAt: '2026-10-10T00:00', endsAt: '2026-11-01T00:00', displayOrder: '0',
    enabled: false, unitPrice: '', currency: '', billingUnit: '',
  };

  it('draftAllowsEmptyPrice — 초안(사용 안 함)은 단가 비워도 된다', () => {
    expect(validatePlacement(base)).toEqual({});
  });

  it('enabledNeedsPriceCurrencyUnit — 사용하려면 단가·통화·과금 단위 모두 필요, 0원은 명시 입력이면 허용', () => {
    expect(Object.keys(validatePlacement({ ...base, enabled: true })).sort()).toEqual(['billingUnit', 'currency', 'unitPrice']);
    expect(validatePlacement({ ...base, enabled: true, unitPrice: '0', currency: 'KRW', billingUnit: 'MONTH' })).toEqual({});
  });

  it.each([
    ['모르는 슬롯', { slot: 'FOOTER' }, 'slot'],
    ['제휴사 없음', { partnerId: '' }, 'partnerId'],
    ['시작 없음', { startsAt: '' }, 'startsAt'],
    ['끝이 시작보다 앞', { endsAt: '2026-10-09T00:00' }, 'endsAt'],
    ['끝 = 시작', { endsAt: '2026-10-10T00:00' }, 'endsAt'],
    ['음수 순서', { displayOrder: '-1' }, 'displayOrder'],
    ['소수 순서', { displayOrder: '1.5' }, 'displayOrder'],
    ['음수 단가', { unitPrice: '-100' }, 'unitPrice'],
    ['소수 단가', { unitPrice: '10.5' }, 'unitPrice'],
    ['KRW 아닌 통화', { currency: 'USD' }, 'currency'],
    ['모르는 과금 단위', { billingUnit: 'CPM' }, 'billingUnit'],
  ])('rejects — %s', (_, over, field) => {
    expect(validatePlacement({ ...base, ...over })).toHaveProperty(field);
  });
});

describe('KST 시각 변환', () => {
  it('inputIsKstAndSentWithOffset — 입력은 KST, 전송은 +09:00 ISO', () => {
    expect(kstInputToIso('2026-11-01T00:00')).toBe('2026-11-01T00:00:00+09:00');
    expect(kstInputToIso('')).toBeNull();
    expect(isoToKstInput('2026-10-31T15:00:00Z')).toBe('2026-11-01T00:00');
    expect(isoToKstInput('2026-11-01T00:00:00+09:00')).toBe('2026-11-01T00:00');
    expect(isoToKstInput(null)).toBe('');
  });
});

describe('순서 바꾸기', () => {
  const list = [
    { id: 10, displayOrder: 0, version: 1 },
    { id: 11, displayOrder: 0, version: 3 },
    { id: 12, displayOrder: 5, version: 2 },
  ];

  it('moveUpDownRenumbers — 위/아래로 옮기고 0부터 다시 번호를 매긴다', () => {
    expect(reorder(list, 2, -1).map((p) => [p.id, p.displayOrder])).toEqual([[10, 0], [12, 1], [11, 2]]);
    expect(reorder(list, 0, 1).map((p) => p.id)).toEqual([11, 10, 12]);
    // 끝에서 더 못 간다
    expect(reorder(list, 0, -1).map((p) => p.id)).toEqual([10, 11, 12]);
    expect(reorder(list, 2, 1).map((p) => p.id)).toEqual([10, 11, 12]);
  });

  it('orderPayloadKeepsVersions — 한 번에 보낼 {slot, items:[{id, displayOrder, version}]}', () => {
    expect(orderPayload('HOME_MAIN', reorder(list, 1, -1))).toEqual({
      slot: 'HOME_MAIN',
      items: [
        { id: 11, displayOrder: 0, version: 3 },
        { id: 10, displayOrder: 1, version: 1 },
        { id: 12, displayOrder: 2, version: 2 },
      ],
    });
  });
});

describe('폼 ↔ API body', () => {
  it('placementBodyUsesKstIsoAndNumbers — 시각은 +09:00, 단가·순서는 숫자, 빈 값은 null', async () => {
    const { placementToForm, toPlacementBody } = await import('../partnerAdmin');
    const form = placementToForm({
      id: 4, version: 2, partnerId: 1, slot: 'BUDGET_PARTNERS', startsAt: '2026-10-09T15:00:00Z', endsAt: '2026-11-01T00:00:00+09:00',
      displayOrder: 3, enabled: false, contractReference: null, unitPrice: null, currency: null, billingUnit: null,
    });
    expect(toPlacementBody({ ...form, unitPrice: '0', currency: 'KRW', billingUnit: 'MONTH' })).toEqual({
      id: 4, version: 2, partnerId: 1, slot: 'BUDGET_PARTNERS',
      startsAt: '2026-10-10T00:00:00+09:00', endsAt: '2026-11-01T00:00:00+09:00',
      displayOrder: 3, enabled: false, contractReference: null, unitPrice: 0, currency: 'KRW', billingUnit: 'MONTH',
    });
  });

  it('newPartnerBodyHasNoIdOrVersion — 새 등록은 id·version 없이, 운영자 정보는 body 에 넣지 않는다', async () => {
    const { emptyPartnerForm, toPartnerBody } = await import('../partnerAdmin');
    const body = toPartnerBody({ ...emptyPartnerForm(), name: ' 샘플 ', category: 'SNAP', destinationUrl: 'https://example.com/' });
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('version');
    expect(Object.keys(body).some((k) => /actor|operator|email|subject/i.test(k))).toBe(false);
    expect(body.name).toBe('샘플');
    expect(body.imageUrl).toBeNull();
  });
});

describe('최신 불러오기 로더 (리뷰 2판 3)', () => {
  function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }
  const setup = () => {
    const calls = [];
    const applied = [];
    const failed = [];
    const loader = createLatestLoader({
      load: (target, id) => { const d = deferred(); calls.push({ target, id, d }); return d.promise; },
      onApply: (target, id, value) => applied.push({ target, id, value }),
      onFail: (target, id, error) => failed.push({ target, id, error }),
    });
    return { loader, calls, applied, failed };
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it('lateResponseAfterFormReplacedIsIgnored — 업체 A 최신 요청 뒤 B 로 바꾸면 늦은 A 응답이 B 폼을 덮지 않는다', async () => {
    const { loader, calls, applied } = setup();
    loader.start('partner', 1);
    loader.invalidate(); // 폼 교체(업체 B 열기)·닫기·언마운트
    calls[0].d.resolve({ id: 1, version: 9 });
    await tick();
    expect(applied).toEqual([]);
  });

  it('onlyLatestRequestApplies — 같은 폼에서 다시 누르면 마지막 요청만 반영', async () => {
    const { loader, calls, applied } = setup();
    loader.start('partner', 1);
    loader.start('partner', 1);
    calls[1].d.resolve({ id: 1, version: 10 });
    calls[0].d.resolve({ id: 1, version: 9 });
    await tick();
    expect(applied).toEqual([{ target: 'partner', id: 1, value: { id: 1, version: 10 } }]);
  });

  it('failureAfterInvalidateIgnored — 닫은 폼의 실패도 무시, 살아 있는 요청 실패는 전용 콜백', async () => {
    const { loader, calls, failed } = setup();
    loader.start('partner', 1);
    loader.invalidate();
    calls[0].d.reject(new Error('x'));
    loader.start('partner', 2);
    calls[1].d.reject(new Error('y'));
    await tick();
    expect(failed.map((f) => f.id)).toEqual([2]);
  });
});
