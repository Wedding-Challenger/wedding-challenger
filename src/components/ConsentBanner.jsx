import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STORAGE_KEY, getConsent, setConsent } from '../lib/consent';

export default function ConsentBanner({ onChange }) {
  // PIPA 적합성 검토 필요 — 김경수 P0 게이트 (docs/privacy/consent-banner-copy.ko.md 와 정합)
  const [shown, setShown] = useState(() => !localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) && onChange) {
      onChange(getConsent());
    }
  }, [onChange]);

  if (!shown) return null;

  const decide = (ads) => {
    const consent = { necessary: true, ads };
    setConsent(consent);
    setShown(false);
    if (onChange) onChange(consent);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-warm-beige/40 shadow-lg p-6">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-charcoal font-semibold mb-1">쿠키 및 광고 동의</h3>
          <p className="text-sm text-charcoal/60">
            웨딩첼린저는 서비스 운영(필수)과 맞춤 광고(선택)를 위해 쿠키를 사용합니다.
            자세한 내용은{' '}
            <Link to="/privacy" className="text-deep-rose underline">개인정보처리방침</Link> 참조.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => decide(false)}
            className="px-4 py-2 text-sm border border-warm-beige/60 rounded-lg text-charcoal hover:bg-warm-beige/20"
          >
            필수만 허용
          </button>
          <button
            onClick={() => decide(true)}
            className="px-4 py-2 text-sm bg-soft-gold text-white rounded-lg hover:bg-soft-gold/90"
          >
            전체 동의
          </button>
        </div>
      </div>
    </div>
  );
}
