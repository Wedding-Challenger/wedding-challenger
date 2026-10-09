# 프로젝트 값 — orca-pipeline (웨딩챌린저 프론트)

> 2026-10-08 확정 (머지 주체·진행 방식·모델 표는 사람 결정).

## 저장소
- main 체크아웃: /Users/kyxxgsoo/GitRepositories/Wedding-Challenger/Wedding-Challenger
- 기준 브랜치: §브랜치 전략과 같음
- 리모트: https://github.com/Wedding-Challenger/wedding-challenger.git
- 계획서 위치: `.omc/plans/<slug>-v1.md` (main 체크아웃에 추적되지 않는 파일. 구현 브랜치가 같은 경로로 커밋한다)
- 상태 폴더(`ORCA_PIPE_STATE`): 조율자 세션 스크래치패드 아래 `orca/<run>`

## 브랜치 전략
- 방식: 지금은 trunk(`master`). 개발계 분리 항목이 `develop`을 만든 뒤부터 git-flow로 바꾼다
- 기준 브랜치: 지금 `origin/master` → 개발계 분리 뒤 `origin/develop`
- 예외 분기: hotfix 는 `origin/master`에서 분기해 master·develop 양쪽에 PR
- 주의: **master 머지 = 운영 배포**(GitHub Actions → Cloudflare Pages `wedding-challenger.com`). PR 본문에 적는다

## 머지 주체
- 사람이 정한다. 기본: 출시 서브에이전트는 PR·CI 확인까지만 하고 머지·태그·릴리스를 하지 않는다.
- 사람이 PR(들)을 지목해 「머지해」라고 지시하면 **조율자가 직접** 머지한다: 리뷰한 머리 커밋 일치(`--match-head-commit`)·CI 통과·mergeable 확인 뒤 레포 관례(merge commit). master 릴리스·태그도 같은 방식 (2026-10-09 사람 결정).
- 서브에이전트는 조율자가 전달한 사람 지시를 확인할 수 없으므로 머지 명령을 받지 않는다 — 머지는 조율자 몫.

## 모델
- 금지 모델: 없음
- 난이도 기준:
  - 낮음: 파일 1~3개, 문구·스타일·테스트 위주, 운영 데이터·배포 경로 영향 없음
  - 보통: 여러 컴포넌트, 상태·저장 형식 변경, 레포 하나
  - 높음: 배포 워크플로·도메인·광고/동의 흐름, 두 레포에 걸침, 저장 형식 호환성
- 역할 × 난이도 (에이전트 / 모델 / effort) — 2026-10-08 사람 결정(균형형, Codex 는 sol=high 전용·낮음은 luna/max):

| 역할 | 낮음 | 보통 | 높음 |
|---|---|---|---|
| ① 기획 | codex / gpt-6-luna / max | codex / gpt-6.1-sol / high | codex / gpt-6.1-sol / high |
| ② 교차 검증 | claude / claude-sonnet-5-5 / medium | claude / claude-sonnet-5-5 / high | claude / claude-opus-5-5 / high |
| ⑤ 구현 | claude / claude-sonnet-5-5 / high | claude / claude-opus-5-5 / high | claude / claude-opus-5-5 / high |
| ⑥ 차이 리뷰 | codex / gpt-6-luna / max | codex / gpt-6.1-sol / high | codex / gpt-6.1-sol / high |
| ⑧ git 담당(서브에이전트) | claude-haiku-4-5 | claude-sonnet-5-5 | claude-sonnet-5-5 |

## 모델 대체

모델 ID 표기: Claude — `claude-opus-5-5`(Opus 5.5) · `claude-sonnet-5-5`(Sonnet 5.5) · `claude-haiku-4-5`(Haiku 4.5) / Codex — `gpt-6.1-sol`(GPT-6.1 Sol) · `gpt-6-luna`(GPT-6 Luna).
- ⑧ git 담당은 Claude Code Agent 도구로 띄우며 그 `model` 인자는 별칭만 받는다: `claude-haiku-4-5` → `haiku`, `claude-sonnet-5-5` → `sonnet`, `claude-opus-5-5` → `opus`. Orca 작업자(`worker-start --model`)는 위 전체 ID 를 그대로 쓴다.


### Claude 만 남았을 때 (Codex 한도)

| 역할 | 낮음 | 보통 | 높음 |
|---|---|---|---|
| ① 기획 | claude / claude-sonnet-5-5 / high | claude / claude-opus-5-5 / high | claude / claude-opus-5-5 / high |
| ② 교차 검증 | claude / claude-haiku-4-5 / high | claude / claude-sonnet-5-5 / high | claude / claude-sonnet-5-5 / high |
| ⑤ 구현 | claude / claude-sonnet-5-5 / high | claude / claude-opus-5-5 / high | claude / claude-opus-5-5 / high |
| ⑥ 차이 리뷰 | claude / claude-haiku-4-5 / high | claude / claude-sonnet-5-5 / high | claude / claude-sonnet-5-5 / high |
| ⑧ git 담당(서브에이전트) | claude-haiku-4-5 | claude-sonnet-5-5 | claude-sonnet-5-5 |

- 쓰는 쪽(기획·구현)과 보는 쪽(검증·리뷰)은 **다른 모델**로 둔다(같은 모델 금지).

### Codex 만 남았을 때 (Claude 한도)

| 역할 | 낮음 | 보통 | 높음 |
|---|---|---|---|
| ① 기획 | codex / gpt-6-luna / max | codex / gpt-6.1-sol / high | codex / gpt-6.1-sol / high |
| ② 교차 검증 | codex / gpt-6.1-sol / high | codex / gpt-6-luna / max | codex / gpt-6-luna / max |
| ⑤ 구현 | codex / gpt-6.1-sol / high | codex / gpt-6.1-sol / high | codex / gpt-6.1-sol / high |
| ⑥ 차이 리뷰 | codex / gpt-6-luna / max | codex / gpt-6-luna / max | codex / gpt-6-luna / max |
| ⑧ git 담당 | 조율자가 직접(git-flow-manager 는 Claude Code 플러그인이라 못 씀) — 같은 규칙(이슈·브랜치·커밋 형식·서명 줄, master 직접 푸시·강제 푸시 금지) | | |

- Codex 는 `gpt-6.1-sol`을 high 로만 쓴다(2026-10-08 사람 결정). 같은 단계에서 쓰는 쪽과 보는 쪽은 sol ↔ luna 로 엇갈린다.

- 절차·조율자 인계는 플러그인 orca-pipeline ≥0.3.0 SKILL.md §4.12 · TEMPLATES.md §9 를 따른다. 한도 근거가 확인됐을 때만 대체한다.

## 서브모듈
- 없음

## 읽는 순서
- 이 파일 §원칙·§금지 구역 → `src/App.jsx`(라우트) → 관련 `src/components/*` → `src/lib/*`(순수 로직, 테스트 있음) → `src/context/BudgetContext.jsx` → `scripts/prerender.mjs`. 백엔드 계약은 `src/api/client.js` 주석.
- 큰 파일은 `sed -n 시작,끝p`로 필요한 줄만 읽는다.

## 원칙
- UI 문구는 한국어. 서비스명은 「웨딩챌린저」(「첼린저」 금지)
- 광고(AdSense) 스크립트는 사용자 동의 후에만 로드한다. 게시자 ID 는 `src/config/ads.js` 한 곳
- API: `VITE_API_BASE_URL` 은 origin 만, 경로 `/api/v1` 은 `src/api/client.js`가 붙인다. 성공은 `code === 'COMMON200'`. API 실패 시 내장 샘플로 대체하는 동작을 깨지 않는다
- 사전 렌더링(SSR→정적 HTML)과 첫 렌더가 같아야 한다. 브라우저 저장값(localStorage)은 하이드레이션 뒤에만 읽는다
- 360px 폭에서 가로 넘침 0

## 금지 구역
- `~/wedding-challenger-prod/`(운영 compose·`.env`·cloudflared 자격 증명), `~/.cloudflared/`, 맥미니 운영 Docker 컨테이너
- Cloudflare·AdSense·GitHub 설정(시크릿·변수·브랜치 보호), DNS
- `master` 직접 푸시·강제 푸시
- 운영 API 에 쓰기 요청 (읽기 GET 만)
- main 체크아웃 쓰기 — 구현자는 계획서 읽기만

## 결정 기록 형식
- 프론트 레포에는 없음. 구조적 결정은 PR 본문 「결정」 절에 쓰고, 백엔드와 걸치면 백엔드 `wedding-challenger-spring/docs/decisions/NNN-제목.md`(ADR)에 쓴다

## 용어 규칙
- 없음 (서비스명 표기만 §원칙)

## 버전 규칙
- 없음 (package.json 버전 고정 0.0.0, 태그 안 씀)

## 백로그 명령
- 없음 — GitHub 이슈로 관리. PR 본문 `Closes #N`

## 구현 게이트
nvm 먼저: `export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh`
1. `npm test`
2. `npx eslint <바뀐 파일들>` (레포 전체 `npm run lint`는 기존 오류 4건이 있어 실패한다 — SdmeCustomizer 3, BudgetContext 1)
3. `npm run build` (사전 렌더링 7 라우트 포함)
4. 화면 작업이면: dev 서버(`VITE_API_BASE_URL=https://api.wedding-challenger.com npx vite --port 5173`)에 Chrome headless(playwright-core, `channel: 'chrome'`)로 시나리오 확인, 360·390px 가로 넘침 0, 콘솔 에러 0

## 머지 전 게이트
- `npm test` · `npm run build`

## git 담당
- `git-flow:git-flow-manager` 서브에이전트만 git 을 쓴다 (작업자도 커밋은 이 서브에이전트로)

## 원격 브랜치 이름 규칙
- `type/#이슈번호/설명` (예: `feat/#14/budget-filter`). 이슈 제목 `[TYPE] 설명`, 커밋 `type: #N 설명`, PR 제목 `[TYPE] 설명 #N`

## PR 템플릿
- 없음. 본문: Closes #N / 배경 / 변경 / 테스트(근거) / 참고

## 커밋 서명 줄
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017GuS44kL3dyAZ9GGZ2z2NZ
```

## PR 서명 줄
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## CI 부하 기록
- 없음 (CI 는 GitHub 호스티드 러너. PR 에서는 워크플로가 돌지 않고 master 푸시 때 test+build+배포)

## 태그 푸시
- 없음

## 릴리스 명령
- 없음

## 보고 형식
- 한국어, 결론 / 네가 할 것 / 내가 할 것 / 근거

## 배포
- master 머지 → GitHub Actions `deploy.yml`(npm ci → npm test → build → wrangler pages deploy). 조율자는 run 성공을 확인하고 실도메인에서 ads.txt·meta(`ca-pub-3555843415102096`)·변경 화면을 확인한다
- 개발계 분리 뒤: develop 머지 → 개발 Pages 브랜치 배포

## 진행 방식
- 사람 상주 — 승인 관문과 머지 대기에서 멈춘다 (2026-10-08 사람 결정)
- 사용량 한도: 대체 — 한도가 확인되면 §모델 대체 표로 남은 공급자에게 넘긴다(SKILL.md §4.12). 근거가 없으면 기다린다 (2026-10-09 사람 결정)
- 스스로 깨어날 수단: 없음 (`/loop` 요청 시)

## 위임
- 없음 — 관문은 사람이 해결한다
