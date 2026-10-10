import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

// production·staging 은 추적되는 mode 파일의 레이아웃 플래그(VITE_PARTNER_SIDE_LAYOUT)가 'true'/'false' 로 있어야 한다
const env = (api, site, layout = 'false') => ({ VITE_API_BASE_URL: api, VITE_SITE_URL: site, VITE_PARTNER_SIDE_LAYOUT: layout });

describe('빌드 환경 resolver', () => {
  it('stagingResolvesOnlyDevOriginsAndDisablesAdsIndexing — staging 은 dev 주소만 쓰고 광고·색인을 끈다', () => {
    expect(resolveBuildConfig('staging', env(API_DEV, SITE_DEV))).toEqual({
      stage: 'staging',
      apiOrigin: API_DEV,
      siteUrl: SITE_DEV,
      adsEnabled: false,
      indexable: false,
      partnerSideLayoutEnabled: false,
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
      partnerSideLayoutEnabled: false,
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
      partnerSideLayoutEnabled: false,
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

    const fixed = { stage: 'test', apiOrigin: LOCAL_API, siteUrl: LOCAL_SITE, adsEnabled: false, indexable: false, partnerSideLayoutEnabled: false };
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

describe('development 설정 변경 재해석', () => {
  let dir;
  const saved = process.env.VITE_API_BASE_URL;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
    if (saved === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = saved;
  });

  it('developmentReevaluatesEnvChangesWithoutProcessEnvPollution — 같은 프로세스에서 env 파일을 바꿔 다시 평가하면 새 origin 을 쓰고 운영 API 는 거부', async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'wc-dev-env-'));
    const envFile = path.join(dir, '.env.development.local');
    delete process.env.VITE_API_BASE_URL;
    const { createViteConfig } = await import('../../vite.config.js');
    const evaluate = () => {
      const config = createViteConfig({ mode: 'development', command: 'serve' }, dir);
      return {
        build: JSON.parse(config.define.__WC_BUILD_CONFIG__).apiOrigin,
        client: JSON.parse(config.define['import.meta.env.VITE_API_BASE_URL']),
      };
    };

    // 처음: env 파일 없음 → localhost 기본값
    expect(evaluate()).toEqual({ build: LOCAL_API, client: LOCAL_API });
    // (d) development 평가는 process.env 를 건드리지 않는다
    expect(process.env.VITE_API_BASE_URL).toBeUndefined();

    // (a) api-dev 를 넣고 다시 평가 → api-dev
    writeFileSync(envFile, `VITE_API_BASE_URL=${API_DEV}\n`);
    expect(evaluate()).toEqual({ build: API_DEV, client: API_DEV });

    // (b) 다시 제거 → 기본값으로 돌아감
    rmSync(envFile);
    expect(evaluate()).toEqual({ build: LOCAL_API, client: LOCAL_API });

    // (c) 운영 API 로 바꾸면 거부
    writeFileSync(envFile, `VITE_API_BASE_URL=${API_PROD}\n`);
    expect(evaluate).toThrow(/VITE_API_BASE_URL/);
    expect(process.env.VITE_API_BASE_URL).toBeUndefined();
  });
});

// 제휴 사이드 레이아웃 플래그(계획서 C10·D3): 보안이 아닌 레이아웃 적용 시점. 값 원천은 추적되는 .env.production·.env.staging,
// 변경은 develop→master PR 로만. 프로세스 env·*.local 덮어쓰기는 빌드 실패. 'true'/'false' 외 값도 실패.
describe('레이아웃 플래그 VITE_PARTNER_SIDE_LAYOUT', () => {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  let dir;
  const saved = process.env.VITE_API_BASE_URL;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
    if (saved === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = saved;
  });

  it('strictTrueFalseOnlyInProductionAndStaging — 정확한 문자열 true/false 만 허용', () => {
    expect(resolveBuildConfig('production', env(API_PROD, SITE_PROD, 'true')).partnerSideLayoutEnabled).toBe(true);
    expect(resolveBuildConfig('staging', env(API_DEV, SITE_DEV, 'false')).partnerSideLayoutEnabled).toBe(false);
    for (const bad of [undefined, '', 'TRUE', 'False', '1', '0', ' true', 'yes']) {
      expect(() => resolveBuildConfig('production', { ...env(API_PROD, SITE_PROD), VITE_PARTNER_SIDE_LAYOUT: bad })).toThrow(/VITE_PARTNER_SIDE_LAYOUT/);
      expect(() => resolveBuildConfig('staging', { ...env(API_DEV, SITE_DEV), VITE_PARTNER_SIDE_LAYOUT: bad })).toThrow(/VITE_PARTNER_SIDE_LAYOUT/);
    }
  });

  it('developmentDefaultsFalseAndTestIgnoresEnv — development 기본 false, test 는 env 를 보지 않고 false', () => {
    expect(resolveBuildConfig('development', {}).partnerSideLayoutEnabled).toBe(false);
    expect(resolveBuildConfig('development', { VITE_PARTNER_SIDE_LAYOUT: 'true' }).partnerSideLayoutEnabled).toBe(true);
    expect(() => resolveBuildConfig('development', { VITE_PARTNER_SIDE_LAYOUT: 'on' })).toThrow(/VITE_PARTNER_SIDE_LAYOUT/);
    expect(resolveBuildConfig('test', { VITE_PARTNER_SIDE_LAYOUT: 'true' }).partnerSideLayoutEnabled).toBe(false);
  });

  it('trackedModeFilesStartFalse — 추적되는 production·staging 파일의 초기값은 문자열 false', () => {
    for (const mode of ['production', 'staging']) {
      const text = readFileSync(path.join(repo, `.env.${mode}`), 'utf8');
      expect(text).toMatch(/^VITE_PARTNER_SIDE_LAYOUT=false$/m);
    }
  });

  it('trackedFileIsTheOnlySource — 추적 파일 값을 쓰고 *.local·프로세스 env 덮어쓰기는 실패', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'wc-layout-'));
    // test 초기화가 넣은 client API 값이 loadEnv 에 섞이지 않게 비운다(origin 검증과 무관한 플래그만 본다)
    delete process.env.VITE_API_BASE_URL;
    writeFileSync(path.join(dir, '.env.production'), `VITE_API_BASE_URL=${API_PROD}\nVITE_SITE_URL=${SITE_PROD}\nVITE_PARTNER_SIDE_LAYOUT=true\n`);
    expect(resolveModeConfig({ mode: 'production', root: dir, loadEnv, processEnv: {} }).partnerSideLayoutEnabled).toBe(true);

    // 프로세스 env(워크플로 변수 등)로 같은 키를 넣으면 같은 값이어도 실패
    expect(() => resolveModeConfig({ mode: 'production', root: dir, loadEnv, processEnv: { VITE_PARTNER_SIDE_LAYOUT: 'true' } }))
      .toThrow(/VITE_PARTNER_SIDE_LAYOUT/);

    // *.local 덮어쓰기도 실패
    writeFileSync(path.join(dir, '.env.production.local'), 'VITE_PARTNER_SIDE_LAYOUT=false\n');
    expect(() => resolveModeConfig({ mode: 'production', root: dir, loadEnv, processEnv: {} })).toThrow(/VITE_PARTNER_SIDE_LAYOUT/);
    rmSync(path.join(dir, '.env.production.local'));

    // 추적 파일에 키가 없으면 실패
    writeFileSync(path.join(dir, '.env.production'), `VITE_API_BASE_URL=${API_PROD}\nVITE_SITE_URL=${SITE_PROD}\n`);
    expect(() => resolveModeConfig({ mode: 'production', root: dir, loadEnv, processEnv: {} })).toThrow(/VITE_PARTNER_SIDE_LAYOUT/);
  });
});
