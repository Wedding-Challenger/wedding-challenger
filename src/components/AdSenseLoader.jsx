import { useEffect } from 'react';
import { ADSENSE_CLIENT } from '../config/ads';

const ADSENSE_SRC =
  `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

export default function AdSenseLoader({ enabled }) {
  useEffect(() => {
    if (!enabled) return;
    if (document.querySelector(`script[src="${ADSENSE_SRC}"]`)) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = ADSENSE_SRC;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }, [enabled]);
  return null;
}
