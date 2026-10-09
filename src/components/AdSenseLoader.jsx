import { useEffect } from 'react';
import { ADSENSE_CLIENT } from '../config/ads';
import { adsEnabled } from '../config/environment';

const ADSENSE_SRC =
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

// enabled = 광고 동의. 개발 빌드(adsEnabled=false)는 호출부가 true 를 넘겨도 스크립트를 넣지 않는다.
export default function AdSenseLoader({ enabled }) {
  useEffect(() => {
    if (!adsEnabled || !enabled) return;
    if (document.querySelector(`script[src="${ADSENSE_SRC}"]`)) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = ADSENSE_SRC;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }, [enabled]);
  return null;
}
