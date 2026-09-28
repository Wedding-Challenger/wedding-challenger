// 사용자 광고/쿠키 동의 상태를 localStorage 에 보관하는 유틸.
// 컴포넌트와 분리되어야 react-refresh/only-export-components 위반을 피할 수 있음.
// Consent Mode v2 기본값(denied)과 재방문자 복원은 index.html <head> 인라인 스크립트가 담당.

export const STORAGE_KEY = 'wc-consent'; // index.html 인라인 스크립트와 같은 키

export function hasStoredConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function getConsent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { necessary: true, ads: false };
  } catch {
    return { necessary: true, ads: false };
  }
}

export function setConsent(consent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // 저장 불가(사생활 보호 모드 등) — 이번 방문에만 적용
  }
  if (typeof window !== 'undefined' && window.gtag) {
    const state = consent.ads ? 'granted' : 'denied';
    window.gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state,
    });
  }
}
