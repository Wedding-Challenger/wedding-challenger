import { useEffect } from 'react';
import { ADSENSE_CLIENT } from '../config/ads';
import { adsEnabled } from '../config/environment';

// enabled = 광고 동의(consent.ads). 개발 빌드이거나 false 이거나 slot 이 비어 있으면 <ins> 도 push() 도 없음.
export default function AdSlot({ enabled = false, slot, format = 'auto', className = '' }) {
  const active = adsEnabled && enabled && Boolean(slot);
  useEffect(() => {
    if (!active) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle 미로딩 — 무시
    }
  }, [active, slot]);
  if (!active) return null;
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
