// AdSense 게시자 ID·광고 슬롯 ID 단일 출처.
// ID 를 바꿀 때는 이 파일만 고친다. vite.config.js 가 이 값을 읽어
// index.html 의 google-adsense-account meta 태그와 dist/ads.txt 를 빌드 시 생성한다.

export const ADSENSE_PUBLISHER_ID = 'pub-3555843415102096';
export const ADSENSE_CLIENT = `ca-${ADSENSE_PUBLISHER_ID}`;

// AdSense 콘솔 > 광고 > 광고 단위에서 만든 슬롯 ID 를 넣는다.
// 빈 값이면 해당 위치는 그리지 않고, 자동 광고(콘솔에서 사이트별로 켬)만 노출된다.
export const AD_SLOTS = {
  landing: '',
  calcSidebar: '',
  footer: '',
};
