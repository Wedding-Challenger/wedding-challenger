import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadEnv } from 'vite';
import { resolveBuildConfig, resolveModeConfig } from '../build-config.mjs';
import { ADSENSE_CLIENT } from '../../src/config/ads.js';

const API_PROD = 'https://api.wedding-challenger.com';
const API_DEV = 'https://api-dev.wedding-challenger.com';
const SITE_PROD = 'https://wedding-challenger.com';
const SITE_DEV = 'https://develop.wedding-challenger.pages.dev';
const LOCAL_API = 'http://localhost:8080';
const LOCAL_SITE = 'http://localhost:5173';

const env = (api, site) => ({ VITE_API_BASE_URL: api, VITE_SITE_URL: site });

describe('빌드 환경 resolver', () => {
  it('stagingResolvesOnlyDevOriginsAndDisablesAdsIndexing — staging 은 dev 주소만 쓰고 광고·색인을 끈다', () => {
    expect(resolveBuildConfig('staging', env(API_DEV, SITE_DEV))).toEqual({
      stage: 'staging',
      apiOrigin: API_DEV,
      siteUrl: SITE_DEV,
      adsEnabled: false,
      indexable: false,
    });
    // 끝 슬래시 하나는 origin 으로 정규화
    expect(resolveBuildConfig('staging', env(`${API_DEV}/`, `${SITE_DEV}/`)).apiOrigin).toBe(API_DEV);
  });

  it.each([
    ['production → api-dev', 'production', env(API_DEV, SITE_PROD)],
    ['production → dev 사이트', 'production', env(API_PROD, SITE_DEV)],
    ['staging → 운영 API', 'staging', env(API_PROD, SITE_DEV)],
    ['staging → 운영 사이트', 'staging', env(API_DEV, SITE_PROD)],
    ['API 에 /api/v1 경로', 'production', env(`${API_PROD}/api/v1`, SITE_PROD)],
    ['API 에 query', 'production', env(`${API_PROD}?x=1`, SITE_PROD)],
    ['API 에 credentials', 'production', env('https://user:pw@api.wedding-challenger.com', SITE_PROD)],
    ['사이트에 경로', 'production', env(API_PROD, `${SITE_PROD}/calc`)],
    ['http 운영 API', 'production', env('http://api.wedding-challenger.com', SITE_PROD)],
    ['URL 아님', 'staging', env('api-dev.wedding-challenger.com', SITE_DEV)],
    ['production API 누락', 'production', { VITE_SITE_URL: SITE_PROD }],
    ['staging 사이트 누락', 'staging', { VITE_API_BASE_URL: API_DEV }],
    ['알 수 없는 mode', 'preview', env(API_DEV, SITE_DEV)],
  ])('rejectsCrossEnvironmentOriginsAndUnsupportedModes — %s 는 실패', (_, mode, input) => {
    expect(() => resolveBuildConfig(mode, input)).toThrow();
  });

  it('developmentNeverEnablesAdsAndProductionKeepsPublisherContract — 광고·색인은 production 에서만 켠다', () => {
    expect(resolveBuildConfig('development', {})).toMatchObject({ adsEnabled: false, indexable: false });
    expect(resolveBuildConfig('development', env(API_DEV, LOCAL_SITE))).toMatchObject({ adsEnabled: false, indexable: false });
    expect(resolveBuildConfig('production', env(API_PROD, SITE_PROD))).toEqual({
      stage: 'production',
      apiOrigin: API_PROD,
      siteUrl: SITE_PROD,
      adsEnabled: true,
      indexable: true,
    });
    // 게시자 ID 단일 출처는 ads.js — resolver 결과에 ID 를 복제하지 않는다
    expect(JSON.stringify(resolveBuildConfig('production', env(API_PROD, SITE_PROD)))).not.toContain(ADSENSE_CLIENT);
  });

  it('developmentAllowsLocalAndDevApiButRejectsProductionApi — development 는 localhost·api-dev 만 허용', () => {
    expect(resolveBuildConfig('development', env(LOCAL_API, LOCAL_SITE)).apiOrigin).toBe(LOCAL_API);
    expect(resolveBuildConfig('development', env(API_DEV, LOCAL_SITE)).apiOrigin).toBe(API_DEV);
    expect(() => resolveBuildConfig('development', env(API_PROD, LOCAL_SITE))).toThrow(/VITE_API_BASE_URL/);
    expect(() => resolveBuildConfig('development', env(LOCAL_API, SITE_PROD))).toThrow(/VITE_SITE_URL/);
  });

  it('developmentDefaultsToLocalAndFixesPort — development 기본값은 localhost:8080/5173, dev 서버 포트는 5173 고정', async () => {
    expect(resolveBuildConfig('development', {})).toEqual({
      stage: 'development',
      apiOrigin: LOCAL_API,
      siteUrl: LOCAL_SITE,
      adsEnabled: false,
      indexable: false,
    });
    const { default: viteConfig } = await import('../../vite.config.js');
    const config = viteConfig({ mode: 'test', command: 'serve' });
    expect(config.server).toMatchObject({ port: 5173, strictPort: true });
  });
});

describe('test mode 격리', () => {
  let dir;
  const saved = process.env.VITE_API_BASE_URL;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
    if (saved === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = saved;
  });

  it('testIgnoresEnvLocalAndProcessOverrides — test 는 .env.local·프로세스 값을 무시하고 고정값을 쓴다', async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'wc-env-'));
    writeFileSync(path.join(dir, '.env.local'), `VITE_API_BASE_URL=${API_PROD}\nVITE_SITE_URL=${SITE_PROD}\n`);
    process.env.VITE_API_BASE_URL = API_PROD;

    const fixed = { stage: 'test', apiOrigin: LOCAL_API, siteUrl: LOCAL_SITE, adsEnabled: false, indexable: false };
    expect(resolveBuildConfig('test', env(API_PROD, SITE_PROD))).toEqual(fixed);

    const spy = vi.fn(loadEnv);
    expect(resolveModeConfig({ mode: 'test', root: dir, loadEnv: spy })).toEqual(fixed);
    expect(spy).not.toHaveBeenCalled();
    // 같은 fixture 를 development 로 읽으면 실제로 운영 API 가 들어와 거부된다(fixture 가 유효함을 보임)
    expect(() => resolveModeConfig({ mode: 'development', root: dir, loadEnv: spy })).toThrow(/VITE_API_BASE_URL/);
    expect(spy).toHaveBeenCalledWith('development', dir, 'VITE_');

    // Vite config 의 test 초기화: env 파일을 끄고 client 에 노출될 API 값을 고정값으로 덮는다
    const { default: viteConfig } = await import('../../vite.config.js');
    const config = viteConfig({ mode: 'test', command: 'serve' });
    expect(config.envDir).toBe(false);
    expect(process.env.VITE_API_BASE_URL).toBe(LOCAL_API);
    expect(config.define.__WC_BUILD_CONFIG__).toBe(JSON.stringify(fixed));
  });

  it('testIgnoresEnvLocalAndProcessOverrides — 테스트 프로세스의 client API 값은 고정값이고 vi.stubEnv 로만 바꾼다', () => {
    expect(import.meta.env.VITE_API_BASE_URL).toBe(LOCAL_API);
    vi.stubEnv('VITE_API_BASE_URL', API_DEV);
    expect(import.meta.env.VITE_API_BASE_URL).toBe(API_DEV);
    vi.unstubAllEnvs();
    expect(import.meta.env.VITE_API_BASE_URL).toBe(LOCAL_API);
  });
});
