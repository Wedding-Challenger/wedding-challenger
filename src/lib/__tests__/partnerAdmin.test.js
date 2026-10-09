import { describe, expect, it } from 'vitest';
import {
  adminReducer, canSave, initialAdminState, isoToKstInput, kstInputToIso, needsReload, orderPayload, reorder,
  validatePartner, validatePlacement,
} from '../partnerAdmin';

const err = (kind, message = '') => ({ kind, message });

describe('관리 화면 reducer', () => {
  const loaded = adminReducer(
    adminReducer(initialAdminState, { type: 'LOAD_START' }),
    { type: 'LOAD_OK', me: { subject: 'op', environment: 'dev' }, partners: [{ id: 1 }], placements: [] },
  );

  it('loadOkUnlocksSave — 불러오기 전·중에는 저장 잠금', () => {
    expect(canSave(initialAdminState)).toBe(false);
    expect(canSave(adminReducer(initialAdminState, { type: 'LOAD_START' }))).toBe(false);
    expect(loaded.auth).toBe('ok');
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
    const reloading = adminReducer(done, { type: 'LOAD_START' });
    expect(needsReload(reloading)).toBe(false);
  });

  it('conflictReloadsLatestAndKeepsWarning — 409 는 최신 상태를 다시 받고 덮어쓰지 않는다', () => {
    const conflict = adminReducer(adminReducer(loaded, { type: 'SAVE_START' }), { type: 'SAVE_FAIL', error: err('conflict') });
    expect(conflict.saving).toBe(false);
    expect(needsReload(conflict)).toBe(true);
    expect(conflict.notice).toMatch(/다른 곳에서 바뀐/);
    const reloaded = adminReducer(adminReducer(conflict, { type: 'LOAD_START' }), {
      type: 'LOAD_OK', me: loaded.me, partners: [{ id: 1, version: 9 }], placements: [],
    });
    expect(reloaded.partners).toEqual([{ id: 1, version: 9 }]);
    expect(reloaded.notice).toMatch(/다른 곳에서 바뀐/);
    expect(needsReload(reloaded)).toBe(false);
  });

  it.each([
    ['login', 'login'],
    ['forbidden', 'forbidden'],
    ['notFound', 'disabled'],
  ])('loadFailureSetsAuthState — %s → %s', (kind, auth) => {
    const s = adminReducer(adminReducer(initialAdminState, { type: 'LOAD_START' }), { type: 'LOAD_FAIL', error: err(kind) });
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
