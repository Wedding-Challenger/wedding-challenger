// 빌드 mode 별 설정. vite.config.js 가 scripts/build-config.mjs 로 검증한 값을 빌드 상수 __WC_BUILD_CONFIG__ 로 넣는다.
// client·SSR 번들이 같은 값을 쓰므로 사전 렌더링 HTML 과 첫 렌더가 일치한다.
// Node 에서 이 파일을 직접 import 하면 상수가 정의되지 않는다 — prerender 는 SSR 번들의 export 만 쓴다.
const config = __WC_BUILD_CONFIG__

export const stage = config.stage
export const apiOrigin = config.apiOrigin
export const siteUrl = config.siteUrl
// 광고·색인은 production 빌드에서만 true. 광고는 여기에 사용자 동의가 더해져야 켜진다.
export const adsEnabled = config.adsEnabled
export const indexable = config.indexable
