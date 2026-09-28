// AdSense 게시자 ID·광고 슬롯 ID 단일 출처.
// ID 를 바꿀 때는 이 파일만 고친다. vite.config.js 가 이 값을 읽어
// index.html 의 google-adsense-account meta 태그와 dist/ads.txt 를 빌드 시 생성한다.

export const ADSENSE_PUBLISHER_ID = 'pub-3555843415102096';
export const ADSENSE_CLIENT = `ca-${ADSENSE_PUBLISHER_ID}`;

// 아직 AdSense 콘솔에서 광고 단위를 만들지 않아 임시값(9999...)이다.
export const AD_SLOTS = {
  landing: '9999000001',
  calcSidebar: '9999000002',
  footer: '9999000003',
};
