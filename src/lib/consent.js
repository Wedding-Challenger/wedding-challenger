// 사용자 광고/쿠키 동의 상태를 localStorage 에 보관하는 유틸.
// 컴포넌트와 분리되어야 react-refresh/only-export-components 위반을 피할 수 있음.

export const STORAGE_KEY = 'wc-consent';

export function getConsent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { necessary: true, ads: false };
  } catch {
    return { necessary: true, ads: false };
  }
}

export function setConsent(consent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: consent.ads ? 'granted' : 'denied',
      ad_user_data: consent.ads ? 'granted' : 'denied',
      ad_personalization: consent.ads ? 'granted' : 'denied',
      analytics_storage: consent.ads ? 'granted' : 'denied',
    });
  }
}
