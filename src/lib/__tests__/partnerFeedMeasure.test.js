import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEND_PREPARE_TIMEOUT_MS, createPartnerFeedController } from '../partnerFeedController';

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

// 리뷰 1판 지적 1: prepareSend 가 기다리는 재조회 A 를 탭 복귀·focus 재조회 B 가 추월해도, 최신 요청 세대가 실제로 반영될 때까지
// 기다린 뒤 hidden·토큰 신선도를 다시 검사한다(낡은 토큰·hidden 전 토큰을 돌려주지 않는다).
describe('제휴 피드 컨트롤러 — 추월된 재조회', () => {
  it('waitsForNewerRefreshWhenOwnIsOvertaken — A(자신) 응답이 먼저 와도 버려지고 B 가 반영될 때까지 기다린다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    c.markHidden();
    const p = c.prepareSend(1); // 재조회 A
    await flush();
    c.refresh(); // 탭 복귀 재조회 B 가 A 를 추월
    expect(calls).toHaveLength(3);
    let settled = false;
    p.then(() => { settled = true; });
    calls[1].resolve(result([item(1, { token: 'tok-A' })])); // A 는 낡은 세대라 버려진다
    await flush();
    expect(settled).toBe(false);
    calls[2].resolve(result([item(1, { token: 'tok-B' })]));
    await expect(p).resolves.toBe('tok-B');
  });

  it('reverseOrderCompletion — B 가 먼저, A 가 나중에 와도 B 의 토큰', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    c.markHidden();
    const p = c.prepareSend(1);
    await flush();
    c.refresh();
    calls[2].resolve(result([item(1, { token: 'tok-B' })]));
    await flush();
    calls[1].resolve(result([item(1, { token: 'tok-A' })]));
    await expect(p).resolves.toBe('tok-B');
  });

  it('newerRefreshStartedBeforeHiddenIsNotEnough — hidden 전에 시작된 재조회만 반영됐으면 다시 받는다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    c.refresh(); // hidden 전에 시작
    c.markHidden();
    const p = c.prepareSend(1);
    await flush();
    calls[1].resolve(result([item(1, { token: 'tok-before-hidden' })]));
    await flush();
    expect(calls).toHaveLength(3); // hidden 뒤 재조회를 새로 시작
    calls[2].resolve(result([item(1, { token: 'tok-after-hidden' })]));
    await expect(p).resolves.toBe('tok-after-hidden');
  });

  it('overtakingResultStillExpiringGivesUp — 추월한 응답의 토큰도 11초 이하면 낡은 토큰 대신 null', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1, { expiresIn: 30000 })]));
    await flush();
    await vi.advanceTimersByTimeAsync(20000);
    const p = c.prepareSend(1);
    await flush();
    c.refresh();
    calls[1].resolve(result([item(1, { token: 'tok-A' })]));
    calls[2].resolve(result([item(1, { token: 'tok-B', expiresIn: 5000 })]));
    await expect(p).resolves.toBeNull();
  });

  it('concurrentSendsShareOneRefresh — 동시에 보내는 노출·클릭은 재조회 하나를 함께 기다린다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1), item(2)]));
    await flush();
    c.markHidden();
    const p1 = c.prepareSend(1);
    const p2 = c.prepareSend(2);
    await flush();
    expect(calls).toHaveLength(2);
    calls[1].resolve(result([item(1, { token: 'n1' }), item(2, { token: 'n2' })]));
    await expect(Promise.all([p1, p2])).resolves.toEqual(['n1', 'n2']);
  });
});

// 리뷰 2판 지적 1: 대기는 「요청 세대 변경·최신 응답 반영·stop」 신호와 전송 준비 제한시간으로 풀린다.
// 낡은 요청 A 가 끝나지 않아도 최신 B 가 반영되면 진행하고, 응답 없는 stop·제한시간 초과면 보내지 않는다(null).
describe('제휴 피드 컨트롤러 — 대기 해제', () => {
  it('newerAppliedWhileOwnNeverSettles — B 만 반영되고 A 는 끝나지 않아도 B 의 토큰', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    c.markHidden();
    const p = c.prepareSend(1); // 재조회 A — 끝까지 응답 없음
    await flush();
    c.refresh(); // B
    calls[2].resolve(result([item(1, { token: 'tok-B' })]));
    await flush();
    let value;
    p.then((v) => { value = v; });
    await flush();
    expect(value).toBe('tok-B');
  });

  it('stopWithoutAnyResponseWakes — 응답이 하나도 없는데 stop 하면 바로 null', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    c.markHidden();
    const p = c.prepareSend(1);
    await flush();
    let value = 'pending';
    p.then((v) => { value = v; });
    c.stop();
    await flush();
    expect(value).toBeNull();
  });

  it('prepareTimeoutGivesUp — 재조회 응답이 제한시간(5초) 안에 없으면 null, 늦은 응답의 토큰도 쓰지 않는다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    c.markHidden();
    const p = c.prepareSend(1);
    await flush();
    let value = 'pending';
    p.then((v) => { value = v; });
    await vi.advanceTimersByTimeAsync(SEND_PREPARE_TIMEOUT_MS - 1);
    expect(value).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(value).toBeNull();
    calls[1].resolve(result([item(1, { token: 'tok-late' })]));
    await flush();
    expect(value).toBeNull();
  });

  it('timeoutClearedAfterSuccess — 정상 완료 뒤에는 제한시간 타이머가 남지 않는다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1)]));
    await flush();
    const before = vi.getTimerCount();
    await expect(c.prepareSend(1)).resolves.toBe('tok-1');
    expect(vi.getTimerCount()).toBe(before);
  });
});
