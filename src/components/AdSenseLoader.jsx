import { useEffect } from 'react';

const ADSENSE_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3555843415102096';

export default function AdSenseLoader({ enabled }) {
  useEffect(() => {
    if (!enabled) return;
    if (document.querySelector('script[data-wc-adsense]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = ADSENSE_SRC;
    s.crossOrigin = 'anonymous';
    s.dataset.wcAdsense = '1';
    document.head.appendChild(s);
  }, [enabled]);
  return null;
}
