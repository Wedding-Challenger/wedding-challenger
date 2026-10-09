import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ADSENSE_CLIENT } from '../../config/ads';

// Node 환경이라 useEffect 는 실행되지 않는다 — 콜백을 모아 두었다가 테스트에서 직접 실행한다.
const state = vi.hoisted(() => ({ effects: [] }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useEffect: (fn) => { state.effects.push(fn); } };
});

const FAKE_SLOT = '1234567890';

function runEffects() {
  const pending = state.effects.splice(0);
  pending.forEach((fn) => fn());
}

// 광고 스크립트 삽입·adsbygoogle.push 를 기록하는 가짜 DOM
function fakeDom() {
  const appended = [];
  const win = {};
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', {
    head: { appendChild: (el) => appended.push(el) },
    createElement: (tag) => ({ tagName: tag.toUpperCase() }),
    querySelector: (sel) => appended.find((el) => sel.includes(`"${el.src}"`)) ?? null,
  });
  return { appended, win };
}

// environment 모듈의 stage/adsEnabled 를 명시 주입하고 컴포넌트를 새로 불러온다
async function loadWith(stage, adsEnabled) {
  vi.resetModules();
  vi.doMock('../../config/environment', () => ({
    stage,
    adsEnabled,
    indexable: adsEnabled,
    siteUrl: 'http://localhost:5173',
    apiOrigin: 'http://localhost:8080',
  }));
  const { default: AdSenseLoader } = await import('../AdSenseLoader');
  const { default: AdSlot } = await import('../AdSlot');
  return { AdSenseLoader, AdSlot };
}

afterEach(() => {
  state.effects.length = 0;
  vi.doUnmock('../../config/environment');
  vi.unstubAllGlobals();
});

describe('개발 빌드 광고 차단', () => {
  it('stagingConsentTrueDoesNotLoadAdsOrRenderSlots — 동의 true 여도 스크립트·ins·push 가 없다', async () => {
    const { AdSenseLoader, AdSlot } = await loadWith('staging', false);
    const { appended, win } = fakeDom();

    AdSenseLoader({ enabled: true });
    const html = renderToString(<AdSlot enabled slot={FAKE_SLOT} />);
    runEffects();

    expect(appended).toHaveLength(0);
    expect(html).not.toContain('<ins');
    expect(win.adsbygoogle).toBeUndefined();
  });
});

describe('운영 빌드 광고 동의', () => {
  it('productionNeedsConsentAndLoadsScriptOnce — 동의 전엔 없음, 동의 후 스크립트 1개·중복 없음', async () => {
    const { AdSenseLoader, AdSlot } = await loadWith('production', true);
    const { appended, win } = fakeDom();

    AdSenseLoader({ enabled: false });
    const before = renderToString(<AdSlot enabled={false} slot={FAKE_SLOT} />);
    runEffects();
    expect(appended).toHaveLength(0);
    expect(before).not.toContain('<ins');
    expect(win.adsbygoogle).toBeUndefined();

    AdSenseLoader({ enabled: true });
    runEffects();
    AdSenseLoader({ enabled: true });
    runEffects();
    expect(appended).toHaveLength(1);
    expect(appended[0].src).toContain(`client=${ADSENSE_CLIENT}`);

    const after = renderToString(<AdSlot enabled slot={FAKE_SLOT} />);
    runEffects();
    expect(after).toContain('<ins');
    expect(after).toContain(`data-ad-client="${ADSENSE_CLIENT}"`);
    expect(win.adsbygoogle).toHaveLength(1);
  });
});
