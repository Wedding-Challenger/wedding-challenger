import { useEffect } from 'react';
import { ADSENSE_CLIENT } from '../config/ads';

// enabled = 광고 동의(consent.ads). false 면 <ins> 도 push() 도 없음.
export default function AdSlot({ enabled = false, slot, format = 'auto', className = '' }) {
  useEffect(() => {
    if (!enabled) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle 미로딩 — 무시
    }
  }, [enabled, slot]);
  if (!enabled) return null;
  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
