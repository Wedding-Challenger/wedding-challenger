import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../ensure-pages-project.sh', import.meta.url));

// wrangler 대신 argv 만 기록하는 가짜 명령. 실제 Cloudflare 호출 없음.
function shim(dir, listOutput, listExit = 0) {
  const log = path.join(dir, 'calls.log');
  const bin = path.join(dir, 'wrangler');
  writeFileSync(path.join(dir, 'list.txt'), listOutput);
  writeFileSync(bin, `#!/bin/sh
echo "$*" >> "${log}"
if [ "$1 $2 $3" = "pages project list" ]; then cat "${dir}/list.txt"; exit ${listExit}; fi
exit 0
`);
  chmodSync(bin, 0o755);
  return { bin, calls: () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : []) };
}

const table = (...names) => [
  '┌──────────────────────┬────────────────────────────────────┐',
  '│ Project Name         │ Project Domains                    │',
  ...names.map((n) => `│ ${n.padEnd(20)} │ ${n}.pages.dev │`),
  '└──────────────────────┴────────────────────────────────────┘',
  '',
].join('\n');

let dir;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

function run(env, listOutput, listExit) {
  dir = mkdtempSync(path.join(tmpdir(), 'wc-pages-'));
  const fake = shim(dir, listOutput, listExit);
  const res = spawnSync('sh', [SCRIPT], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, WRANGLER: fake.bin, ...env },
  });
  return { ...res, calls: fake.calls() };
}

describe('ensure-pages-project.sh', () => {
  it('프로젝트가 있으면 만들지 않는다', () => {
    const res = run({ PROJECT: 'wedding-challenger', ALLOW_CREATE: 'false' }, table('wedding-challenger'));
    expect(res.status).toBe(0);
    expect(res.calls).toEqual(['pages project list']);
  });

  it('없고 생성 허용(production) 이면 운영 브랜치 master 로 한 번 만든다', () => {
    const res = run({ PROJECT: 'wedding-challenger', ALLOW_CREATE: 'true' }, table('other'));
    expect(res.status).toBe(0);
    expect(res.calls).toEqual([
      'pages project list',
      'pages project create wedding-challenger --production-branch=master',
    ]);
  });

  it.each([['false'], [''], ['yes']])('없고 생성 허용 "%s" 이면 실패하고 만들지 않는다', (allow) => {
    const res = run({ PROJECT: 'wedding-challenger', ALLOW_CREATE: allow }, table('other'));
    expect(res.status).toBe(1);
    expect(res.calls).toEqual(['pages project list']);
  });

  it('비슷한 이름(wedding-challenger-dev)만 있으면 없는 것으로 본다', () => {
    const res = run({ PROJECT: 'wedding-challenger', ALLOW_CREATE: 'false' }, table('wedding-challenger-dev'));
    expect(res.status).toBe(1);
    expect(res.calls).toEqual(['pages project list']);
  });

  it('목록 조회가 실패하면 만들지 않고 실패한다', () => {
    const res = run({ PROJECT: 'wedding-challenger', ALLOW_CREATE: 'true' }, '', 3);
    expect(res.status).toBe(1);
    expect(res.calls).toEqual(['pages project list']);
  });

  it.each([[''], ['Bad Name']])('프로젝트 이름 "%s" 는 wrangler 호출 전에 실패', (project) => {
    const res = run({ PROJECT: project, ALLOW_CREATE: 'true' }, table('wedding-challenger'));
    expect(res.status).toBe(1);
    expect(res.calls).toEqual([]);
  });
});
