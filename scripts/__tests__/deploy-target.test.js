import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveDeployTarget } from '../deploy-target.mjs';

const CLI = fileURLToPath(new URL('../deploy-target.mjs', import.meta.url));
const PROJECT = 'wedding-challenger';

const DEVELOP = {
  mode: 'staging', branch: 'develop', upload: true, allowProjectCreation: false, buildModes: ['staging'], project: PROJECT,
};
const MASTER = {
  mode: 'production', branch: 'master', upload: true, allowProjectCreation: true, buildModes: ['production'], project: PROJECT,
};
const PR = {
  mode: null, branch: null, upload: false, allowProjectCreation: false, buildModes: ['production', 'staging'], project: null,
};

describe('deployTargetTableMatchesEventsRefsAndProjectGuard', () => {
  it.each([
    ['push', 'develop', PROJECT, DEVELOP],
    ['workflow_dispatch', 'develop', PROJECT, DEVELOP],
    ['push', 'master', PROJECT, MASTER],
    ['workflow_dispatch', 'master', PROJECT, MASTER],
    ['push', 'master', 'other-project', { ...MASTER, project: 'other-project' }],
    ['pull_request', '15/merge', PROJECT, PR],
    ['pull_request', '15/merge', '', PR],
  ])('%s · %s · 프로젝트 "%s" → 배포 대상', (eventName, refName, pagesProject, expected) => {
    expect(resolveDeployTarget({ eventName, refName, pagesProject })).toEqual(expected);
  });

  it.each([
    ['workflow_dispatch', 'feat/#14/budget-filter', PROJECT],
    ['push', 'feat/#14/budget-filter', PROJECT],
    ['push', 'main', PROJECT],
    ['schedule', 'master', PROJECT],
    ['pull_request_target', '15/merge', PROJECT],
    ['', 'master', PROJECT],
    ['push', '', PROJECT],
    ['push', 'develop', 'wedding-challenger-dev'],
    ['push', 'develop', ''],
    ['push', 'master', ''],
    ['push', 'master', 'bad project; rm -rf'],
  ])('%s · %s · 프로젝트 "%s" 는 실패', (eventName, refName, pagesProject) => {
    expect(() => resolveDeployTarget({ eventName, refName, pagesProject })).toThrow();
  });
});

describe('deployTargetCliReadsEnvAndPrintsOnlyValidatedOutputs', () => {
  const run = (env) => spawnSync(process.execPath, [CLI], {
    encoding: 'utf8',
    // 실행 환경의 값이 새지 않게 PATH 만 넘긴다
    env: { PATH: process.env.PATH, ...env },
  });

  it('정상 입력은 JSON 한 줄을 stdout 에 출력하고 exit 0', () => {
    const res = run({ EVENT_NAME: 'push', REF_NAME: 'develop', PAGES_PROJECT: PROJECT });
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout)).toEqual(DEVELOP);
    expect(res.stdout.trim().split('\n')).toHaveLength(1);
  });

  it('PR 입력은 secret·프로젝트 없이 검증 전용 출력', () => {
    const res = run({ EVENT_NAME: 'pull_request', REF_NAME: '15/merge' });
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout)).toEqual(PR);
  });

  it.each([
    [{ EVENT_NAME: 'workflow_dispatch', REF_NAME: 'feat/#14/budget-filter', PAGES_PROJECT: PROJECT }],
    [{ EVENT_NAME: 'push', REF_NAME: 'develop', PAGES_PROJECT: 'wedding-challenger-dev' }],
    [{ EVENT_NAME: 'push', REF_NAME: 'master' }],
    [{}],
  ])('잘못된 입력은 exit 1 이고 stdout 에 업로드 출력이 없다 (%o)', (env) => {
    const res = run(env);
    expect(res.status).toBe(1);
    expect(res.stdout).toBe('');
    expect(res.stderr).not.toBe('');
  });
});
