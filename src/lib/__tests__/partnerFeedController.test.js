import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPartnerFeedController } from '../partnerFeedController';
import { FRESH_MS, REFETCH_MAX_MS } from '../partnerFeed';

// usePartnerFeed 는 이 컨트롤러를 만들고 onUpdate 를 setState 에 잇는 얇은 훅이다.
// 실제 타이머 경계(응답 지연·탭 복귀·카드 종료)를 fake timer + 지연 응답(deferred)으로 고정한다.
const START = Date.parse('2026-10-10T12:00:00+09:00');
const at = (ms) => new Date(ms).toISOString();

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const item = (id, untilMs) => ({
  placementId: id, partnerId: id, name: `샘플 ${id}`, category: 'SNAP',
  destinationUrl: `https://example.com/${id}`, visibleUntil: at(untilMs),
});

const result = (items, now = Date.now()) => ({
  slot: 'BUDGET_PARTNERS', slotEnabled: true, serverTime: at(now), refreshAt: at(now + 60000), items,
});

let calls;
let updates;
const last = () => updates.at(-1).map((i) => i.placementId);

function setup() {
  calls = [];
  updates = [];
  const controller = createPartnerFeedController({
    load: () => {
      const d = deferred();
      calls.push(d);
      return d.promise;
    },
    onUpdate: (items) => updates.push(items),
  });
  return controller;
}

// 마이크로태스크(응답 처리)까지 흘려 보낸다
const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => vi.useFakeTimers({ now: START }));
afterEach(() => vi.useRealTimers());

describe('제휴 목록 재조회 컨트롤러', () => {
  it('cardEndAppliesWhileRefetchIsPending — 재조회 응답을 기다리는 동안에도 카드 종료 시각에 내린다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1, START + 55000), item(2, START + 86400000)]));
    await flush();
    expect(last()).toEqual([1, 2]);

    // 50초에 재조회 시작, 응답은 지연
    await vi.advanceTimersByTimeAsync(REFETCH_MAX_MS);
    expect(calls).toHaveLength(2);

    // 55초: 1번 카드 종료 → 응답 없이도 바로 내린다
    await vi.advanceTimersByTimeAsync(5000);
    expect(last()).toEqual([2]);
  });

  it('freshnessExpiresWhileRefetchIsPending — 응답이 60초를 넘게 늦으면 비운다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1, START + 86400000)]));
    await flush();
    await vi.advanceTimersByTimeAsync(REFETCH_MAX_MS);
    expect(calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(FRESH_MS - REFETCH_MAX_MS - 1);
    expect(last()).toEqual([1]);
    await vi.advanceTimersByTimeAsync(2);
    expect(last()).toEqual([]);
    // 늦은 응답이 오면 다시 보인다
    calls[1].resolve(result([item(1, START + 86400000)]));
    await flush();
    expect(last()).toEqual([1]);
  });

  it('noExpiryTimerAfterStalenessWithFarCardEnd — 30일 뒤 끝나는 카드·응답 없는 재조회면 60초 뒤 비우고 타이머 없이 멈춘다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1, START + 30 * 86400000)]));
    await flush();
    await vi.advanceTimersByTimeAsync(REFETCH_MAX_MS); // 재조회 시작, 응답은 오지 않음
    expect(calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(FRESH_MS - REFETCH_MAX_MS + 1);
    expect(last()).toEqual([]);
    const count = updates.length;
    // 2^31-1 ms 를 넘는 setTimeout 은 바로 실행되어 반복 update 가 생긴다 — 만료 뒤에는 타이머를 잡지 않아야 한다
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(40 * 86400000);
    expect(updates.length).toBe(count);
    // 늦게라도 응답이 오면 다시 보인다
    calls[1].resolve(result([item(1, Date.now() + 86400000)]));
    await flush();
    expect(last()).toEqual([1]);
  });

  it('timerDelaysStayWithin32Bit — 어떤 타이머도 2^31-1 ms 이상으로 잡지 않는다', async () => {
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1, START + 365 * 86400000)]));
    await flush();
    await vi.advanceTimersByTimeAsync(3 * 60000);
    const delays = spy.mock.calls.map((args) => args[1] ?? 0);
    expect(Math.max(...delays)).toBeLessThan(2 ** 31 - 1);
    spy.mockRestore();
    c.stop();
  });

  it('tabReturnIgnoresOlderResponse — 탭 복귀로 다시 받으면 먼저 시작한 늦은 응답은 버린다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1, START + 86400000)]));
    await flush();
    c.refresh(); // 탭 복귀
    c.refresh(); // 창 focus
    expect(calls).toHaveLength(3);
    calls[2].resolve(result([item(3, START + 86400000)]));
    await flush();
    calls[1].resolve(result([item(2, START + 86400000)]));
    await flush();
    expect(last()).toEqual([3]);
  });

  it('failureClearsThenRetries — 실패하면 비우고 다시 시도한다', async () => {
    const c = setup();
    c.start();
    calls[0].resolve(result([item(1, START + 86400000)]));
    await flush();
    await vi.advanceTimersByTimeAsync(REFETCH_MAX_MS);
    calls[1].reject(new Error('API error: 500'));
    await flush();
    expect(last()).toEqual([]);
    await vi.advanceTimersByTimeAsync(FRESH_MS);
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  it('stopCancelsTimersAndLateResponses — 정리 뒤에는 타이머·늦은 응답이 화면을 바꾸지 않는다', async () => {
    const c = setup();
    c.start();
    c.stop();
    calls[0].resolve(result([item(1, START + 86400000)]));
    await flush();
    await vi.advanceTimersByTimeAsync(5 * 60000);
    expect(updates).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
