import { useEffect, useRef } from 'react';

export default function AdSlot({ enabled, slot, format = 'auto', className = '' }) {
  const insRef = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // adsbygoogle 미로딩 — 무시
    }
  }, [enabled, slot]);
  if (!enabled) return null;
  return (
    <ins
      ref={insRef}
      className={`adsbygoogle block ${className}`}
      style={{ display: 'block' }}
      data-ad-client="ca-pub-3555843415102096"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
