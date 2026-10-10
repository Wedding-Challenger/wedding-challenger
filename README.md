# 웨딩챌린저 (프론트엔드)

예산과 하객 수로 웨딩홀·스드메·스냅 견적을 만들어 주는 웨딩챌린저의 React/Vite 프론트엔드다. 빌드는 client → SSR → 라우트별 사전 렌더링(8개 라우트) 순서이며, 결과물은 Cloudflare Pages 에 배포한다. 백엔드 API 계약은 `src/api/client.js` 주석을 본다.

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
node scripts/check-dist.mjs production   # 또는 staging — 산출물 광고·색인·API origin·관리 셸 검사
```

`npm run build -- --mode staging` 처럼 mode 를 덧붙이지 않는다(두 번 지정되면 실패한다). 빌드는 매번 `dist/` 를 비우고 client·SSR·사전 렌더링에 같은 mode 를 넘긴다(`scripts/build.mjs`).

## 제휴 업체(광고)와 관리 화면

백엔드 계약·운영 순서는 백엔드 ADR-015(v1 슬롯·관리 도구)와 v1.1 계획(지면 확장·비식별 합계·월별 리포트·UTM, 백엔드 #28)을 따른다.

- **공개 노출**: `GET /api/v1/partners?slot=HOME_MAIN|BUDGET_PARTNERS|GUIDE_SIDEBAR|CHECKLIST_SIDEBAR` (`src/api/partners.js`). 슬롯 on/off 는 서버 응답 `slotEnabled` 가 유일한 출처다. 사전 렌더링·첫 렌더는 제휴 없음으로 시작하고, 하이드레이션 뒤 읽는다. 서버 `refreshAt`(최대 50초)·탭 복귀 때 다시 받고, 실패하거나 60초 넘게 못 받으면 비운다(`src/lib/partnerFeed.js`).
- **업종 순환**: 피드는 살아 있는 후보 전부와 item 별 `rotationGroup`·`rotationPick` 을 준다. 화면에는 그룹당 1개만 보이며, 페이지뷰(공개 route 진입) 첫 pick 을 그룹별로 고정하고 고정한 배치가 피드에서 빠질 때만 바꾼다(`pickRotation`, 페이지뷰 ledger 는 `src/context/PartnerMeasureProvider.jsx`).
- **광고 표시**: 모든 지면 카드 오른쪽 아래 작은 「광고 ⓘ」(`src/components/AdDisclosure.jsx`). ⓘ 버튼을 마우스·포커스·탭하면 「웨딩챌린저가 선정해 노출하는 제휴 업체입니다.」 말풍선. 문구는 서버 `disclosure`·`disclosureNotice`, 없으면 `src/lib/partnerDisclosure.js` 상수. 카드는 업체 홈페이지 새 창 링크(`rel="sponsored noopener noreferrer"`)이며 예산에 담지 않고 가격·광고 단가를 보이지 않는다. 이미지는 배포된 `public/images/partners/` 자산만 쓴다.
- **예산 계산**: 견적 바구니와 같은 sticky 래퍼(`role="region"`, 큰 화면 `max-height` + 내부 스크롤) 안, 바구니 바로 아래의 세로 목록. 0건·실패·슬롯 off 면 그리지 않는다. 예산 AdSense 는 aside 밖 본문 열 하단이다.
- **홈**: 제휴가 있으면 웨딩홀 줄을 「제휴 업체」 마키로 바꾸고, 없으면 지금 웨딩홀 줄(필터·12곳·더 보기) 그대로다.
- **가이드·체크리스트 사이드**: 레이아웃 빌드 플래그 `VITE_PARTNER_SIDE_LAYOUT`(보안·노출 제어 아님)이 `true` 일 때만 PC(1024px 이상) 우측 고정 열 1구좌, 모바일은 같은 DOM 이 첫 본문 묶음 뒤에 온다. `false`(초기값)면 지금 단일 열 그대로다. production·staging 값은 추적되는 `.env.production`·`.env.staging` 에서만 읽고 `'true'`/`'false'` 만 허용하며, 프로세스 env·`*.local` 로 덮어쓰면 빌드가 실패한다. 바꿀 때는 그 파일을 develop→master PR 로 바꾼다. `check-dist` 가 prerender `/guide`·`/checklist` 의 `data-partner-side-layout`·`data-partner-side-column` 표식을 값과 대조한다. 로컬에서 켜 보려면 `VITE_PARTNER_SIDE_LAYOUT=true npm run dev`(development 만 허용).
- **노출·클릭 측정**(`src/lib/partnerMetrics.js`, `src/hooks/usePartnerMetrics.js`): 카드 면적 50% 이상이 가림을 뺀 화면 안에 연속 1초 + 탭 visible + 온보딩 모달 닫힘이면 노출 1회, 링크 좌클릭·Enter·중간 버튼이면 클릭 1회(페이지뷰·배치마다 최대 1회). 동의 배너는 실측 높이만큼 IntersectionObserver `rootMargin` 아래쪽만 뺀다. 전송은 `POST /api/v1/partners/metrics`(text/plain JSON 한 이벤트, `fetch` keepalive·credentials omit·no-referrer, 재시도 없음). item 별 `measurementToken` 이 없으면(집계 off) 측정하지 않고, 남은 시간 11초 이하·탭 복귀 뒤에는 재조회 후 보낸다.
- **관리 화면**: `/admin/partners`(제휴사·노출 항목)와 `/admin/partner-reports`(월별 리포트: 지면·기기군별 노출·클릭·가중 CTR·제한으로 누락 N·이상 의심·운영 메모, CSV `partner-report-<YYYY-MM>[-<partnerId>].csv`, 배치별 UTM·월 메모 편집). 빌드는 사전 렌더링하지 않는 별도 셸 `admin.html`(빈 root·noindex·광고 없음)을 만들고, `public/_redirects` 의 `/admin/* /admin 200` 한 줄과 `public/_headers` 의 `/admin`·`/admin/*`·`/admin.html` no-store·noindex 로 서빙한다(staging 은 여기에 `/*` noindex 를 덧붙인다). `npm run dev` 도 `/admin/…` 을 `admin.html` 로 보낸다. 공개 Header·Footer·광고·동의 배너·제휴 측정은 관리 레이아웃에 없다.
- 관리 API(`/api/v1/admin/**`, `src/api/adminPartners.js`·`src/api/adminPartnerReports.js`)는 Cloudflare Access 쿠키로만 부른다(`credentials: include`). 로그인이 필요하면 화면의 「관리 API 로그인」 링크로 API 주소 `/api/v1/admin/session` 에 최상위 이동한다. 프론트 가드는 보안 경계가 아니다.
- **검증 예외**: 로컬에 관리 인증 우회를 만들지 않으므로 관리 화면은 Vitest(mock API·reducer)와 admin 셸 빌드 검사로 PR 을 검증하고, 실제 브라우저 관리 수락은 develop 배포 뒤 보호된 dev 관리 주소에서 조율자가 한다. 마키의 hover·focus·reduced-motion·Tab·inert DOM 동작과 실제 측정 전송(api-dev)도 조율자 브라우저 수락 대상이다.

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
