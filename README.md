# 웨딩챌린저 (프론트엔드)

예산과 하객 수로 웨딩홀·스드메·스냅 견적을 만들어 주는 웨딩챌린저의 React/Vite 프론트엔드다. 빌드는 client → SSR → 라우트별 사전 렌더링(7개 라우트) 순서이며, 결과물은 Cloudflare Pages 에 배포한다. 백엔드 API 계약은 `src/api/client.js` 주석을 본다.

## 환경

운영계와 개발계는 같은 Pages 프로젝트의 서로 다른 브랜치 배포다. 빌드 설정은 Vite mode 로 정하며 `scripts/build-config.mjs` 가 mode 별 허용 값을 검사한다. 허용 밖 조합은 dev 서버·빌드 모두 실패한다.

| mode | 쓰는 곳 | API origin | 사이트 origin | 광고 | 색인 |
|---|---|---|---|---|---|
| production | `master` → 운영 | `https://api.wedding-challenger.com` | `https://wedding-challenger.com` | 동의 후 | 허용 |
| staging | `develop` → 개발계 | `https://api-dev.wedding-challenger.com` | `https://develop.wedding-challenger.pages.dev` | 없음 | noindex |
| development | `npm run dev` | `http://localhost:8080`(기본) 또는 api-dev | `http://localhost:5173` | 없음 | noindex |
| test | `npm test` | `http://localhost:8080` 고정 | `http://localhost:5173` 고정 | 없음 | noindex |

- `VITE_API_BASE_URL` 은 origin 만 넣는다. `/api/v1` 은 `src/api/client.js` 가 붙인다. API 가 실패하면 내장 샘플 데이터로 대체한다.
- production·staging 값은 커밋된 `.env.production`·`.env.staging` 에 있다. VITE 값은 공개 설정이며 비밀을 넣지 않는다.
- development: `.env.development` 는 커밋하지 않는다. 값이 없으면 위 기본값을 쓰고, 운영 API 를 넣으면 dev 서버가 시작하지 않는다. 개인 설정은 `.env.development.local` 같은 `*.local` 파일에 둔다(커밋 안 됨).
- dev 서버 포트는 5173 고정(`strictPort`)이다. 5173 이 사용 중이면 다른 포트로 옮기지 않고 실패한다.
- test: env 파일과 실행 환경의 `VITE_*` 값을 무시하고 고정값을 쓴다. 테스트 하나의 입력만 바꿀 때는 `vi.stubEnv` 를 쓴다.
- 광고는 production 빌드 + 사용자 동의가 둘 다 있어야 로드된다. 게시자 ID 는 `src/config/ads.js` 한 곳에만 둔다.
- 개발 빌드는 모든 HTML 에 `noindex, nofollow` 를 넣고 광고 계정 meta·`ads.txt`·`sitemap.xml` 을 빼며, `robots.txt` 전체 차단과 `_headers` 의 `X-Robots-Tag` 를 만든다. robots 차단만으로 비공개가 되지는 않으며, 접근 제한(Access)은 별도 운영 작업이다.

## 명령

```sh
export NVM_DIR=$HOME/.nvm; . "$NVM_DIR/nvm.sh"
npm ci
npm run dev             # http://localhost:5173 (API 기본 http://localhost:8080)
VITE_API_BASE_URL=https://api-dev.wedding-challenger.com npm run dev   # 개발계 API 로
npm test
npm run build           # production (dist/)
npm run build:staging   # staging (dist/)
node scripts/check-dist.mjs production   # 또는 staging — 산출물 광고·색인·API origin 검사
```

`npm run build -- --mode staging` 처럼 mode 를 덧붙이지 않는다(두 번 지정되면 실패한다). 빌드는 매번 `dist/` 를 비우고 client·SSR·사전 렌더링에 같은 mode 를 넘긴다(`scripts/build.mjs`).

## 브랜치와 배포

`develop` 에서 기능 브랜치를 따서 `develop` 으로 PR → 개발계에서 확인 → `develop` → `master` 릴리스 PR 로 운영에 올린다. hotfix 는 `master` 에서 따고 `develop` 에 역반영한다. (전환 때 조율자가 `origin/master` 에서 `develop` 을 만들고 열린 PR #15 의 base 를 `develop` 으로 바꿨다.)

`.github/workflows/deploy.yml` 은 이벤트·ref·`vars.CLOUDFLARE_PAGES_PROJECT` 를 `scripts/deploy-target.mjs` 에 넘기고 그 출력만 쓴다.

| 입력 | mode / branch / 업로드 / 프로젝트 생성 / 빌드 |
|---|---|
| push·수동 실행, `develop`, 프로젝트 `wedding-challenger` | staging / develop / 예 / 아니오 / staging |
| push·수동 실행, `master`, 프로젝트 지정 | production / master / 예 / 예 / production |
| `master`·`develop` 대상 PR | 없음 / 없음 / 아니오 / 아니오 / production, staging |
| 그 밖의 ref·이벤트, develop 프로젝트 불일치, 빈 프로젝트 | 실패 — 빌드·생성·업로드 없음 |

- PR 은 두 mode 빌드와 산출물 검사만 하며 secret·배포 권한이 없다. PR 별 미리보기 배포는 아직 하지 않는다.
- 같은 브랜치의 이전 실행만 취소한다(`deploy-<브랜치>`). master 와 develop 은 서로 취소하지 않는다.
- Pages 프로젝트가 없을 때 만드는 것은 master 배포뿐이다(`scripts/ensure-pages-project.sh`). develop 은 실패한다.
- 정책 표는 `scripts/__tests__/deploy-target.test.js` 로 검증한다. Actions 를 로컬에서 실행하는 도구는 쓰지 않는다.

## 검증 게이트

- **PR 게이트(작업자)**: `npm test`, 바뀐 파일 `npx eslint`, `npm run build`·`npm run build:staging` 과 `check-dist`, 화면 작업이면 로컬 브라우저 확인(360px 가로 넘침 0, 콘솔 에러 0). 실제 업로드는 하지 않는다.
- **머지 뒤 수락(조율자)**: develop 실제 업로드, 개발계 Access, `api-dev` 실제 GET, 운영 Pages·광고 설정이 그대로인지 확인.
