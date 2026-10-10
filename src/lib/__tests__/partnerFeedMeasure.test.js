import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPartnerFeedController } from '../partnerFeedController';

// 측정 전송 전 토큰 재조회(계획서 B4·C11): 남은 시간 11초 이하·hidden 복귀 뒤에는 재조회가 끝난 다음에만 보낸다.
// 재조회 실패·placement 사라짐·정지면 측정만 포기(null). 순환 고정(H1)은 주입한 페이지뷰 저장소에 남는다.
const START = Date.parse('2026-10-10T12:00:00+09:00');
const at = (ms) => new Date(ms).toISOString();

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const item = (id, { group = `G${id}`, pick = true, token = `tok-${id}`, expiresIn = 120000 } = {}) => ({
  placementId: id, partnerId: id, name: `샘플 ${id}`, category: 'SNAP', destinationUrl: `https://example.com/${id}`,
  rotationGroup: group, rotationPick: pick,
  measurementToken: token, measurementTokenExpiresAt: token ? at(Date.now() + expiresIn) : null,
});
const result = (items) => ({
  slot: 'HOME_MAIN', slotEnabled: true, serverTime: at(Date.now()), refreshAt: at(Date.now() + 50000), items,
});

let calls;
let updates;
let pinStore;
const last = () => updates.at(-1).map((i) => i.placementId);

function setup() {
  calls = [];
  updates = [];
  let pins = {};
  pinStore = { read: () => pins, write: (next) => { pins = next; } };
  return createPartnerFeedController({
    load: () => {
      const d = deferred();
      calls.push(d);
      return d.promise;
    },
    onUpdate: (items) => updates.push(items),
    pins: pinStore,
  });
}

const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => vi.useFakeTimers({ now: START }));
afterEach(() => vi.useRealTimers());

describe('제휴 피드 컨트롤러 — 측정 토큰 준비', () => {
  it('freshTokenNoRefetch — 토큰 여유가 충분하면 재조회 없이 그 item 의 토큰', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1), item(2)]));
    await flush();
    await expect(c.prepareSend(2)).resolves.toBe('tok-2');
    expect(calls).toHaveLength(1);
  });

  it('expiringTokenRefetchesFirst — 남은 11초 이하면 재조회 완료 뒤 새 토큰으로', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1, { expiresIn: 30000 })]));
    await flush();
    await vi.advanceTimersByTimeAsync(20000); // 남은 10초
    const p = c.prepareSend(1);
    await flush();
    expect(calls).toHaveLength(2);
    let settled = false;
    p.then(() => { settled = true; });
    await flush();
    expect(settled).toBe(false); // 재조회 완료 전 전송 없음
    calls[1].resolve(result([item(1, { token: 'tok-1b' })]));
    await expect(p).resolves.toBe('tok-1b');
  });

  it('hiddenReturnWaitsForRefetch — hidden 복귀 뒤에는 재조회가 끝나야 보낸다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    c.markHidden();
    const p = c.prepareSend(1);
    await flush();
    expect(calls).toHaveLength(2);
    calls[1].resolve(result([item(1, { token: 'tok-after' })]));
    await expect(p).resolves.toBe('tok-after');
    // 한 번 새로 받은 뒤에는 다시 받지 않는다
    await expect(c.prepareSend(1)).resolves.toBe('tok-after');
    expect(calls).toHaveLength(2);
  });

  it.each([
    ['재조회 실패', (d) => d.reject(new Error('down'))],
    ['placement 사라짐', (d) => d.resolve(result([item(9)]))],
    ['집계 off(토큰 없음)', (d) => d.resolve(result([item(1, { token: null })]))],
  ])('giveUpMeasurementOnly — %s 이면 null(측정만 포기)', async (_, settle) => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    c.markHidden();
    const p = c.prepareSend(1);
    await flush();
    settle(calls[1]);
    await expect(p).resolves.toBeNull();
  });

  it('stoppedWhileWaitingCancels — 재조회 대기 중 화면을 떠나면(정지) 전송 취소', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    c.markHidden();
    const p = c.prepareSend(1);
    await flush();
    c.stop();
    calls[1].resolve(result([item(1)]));
    await expect(p).resolves.toBeNull();
  });

  it('rotationPinsPersistInInjectedStore — 순환 고정은 주입한 저장소에 남아 컨트롤러를 다시 만들어도 유지', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1, { group: 'INVITATION', pick: true }), item(2, { group: 'INVITATION', pick: false })]));
    await flush();
    expect(last()).toEqual([1]);
    expect(pinStore.read()).toEqual({ INVITATION: 1 });
    // 재조회에서 서버 pick 이 2 로 바뀌어도 1 유지
    await vi.advanceTimersByTimeAsync(50000);
    calls[1].resolve(result([item(1, { group: 'INVITATION', pick: false }), item(2, { group: 'INVITATION', pick: true })]));
    await flush();
    expect(last()).toEqual([1]);
  });
});
