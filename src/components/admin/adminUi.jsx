import { adminLoginUrl } from '../../api/adminPartners';

// 관리 화면 공통 입력·버튼 스타일과 안내 배너(제휴 업체 관리·월별 리포트가 같이 쓴다).
export const input = 'w-full rounded-lg border border-warm-beige/60 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold/60';
export const button = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
export const primary = `${button} bg-soft-gold text-white hover:bg-soft-gold/90`;
export const secondary = `${button} border border-warm-beige/60 bg-white text-charcoal/70 hover:text-charcoal`;
export const danger = `${button} border border-deep-rose/30 bg-white text-deep-rose hover:bg-deep-rose/5`;

export function Field({ id, title, hint, error, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-charcoal/70">{title}</label>
      {children}
      {hint && <p className="text-[11px] text-charcoal/40">{hint}</p>}
      {error && <p className="text-[11px] text-deep-rose" role="alert">{error}</p>}
    </div>
  );
}

export function Banner({ tone = 'info', children }) {
  const tones = {
    info: 'border-soft-gold/30 bg-soft-gold/10 text-charcoal',
    warn: 'border-deep-rose/30 bg-deep-rose/5 text-deep-rose',
  };
  return <div role={tone === 'warn' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function AuthNotice({ auth }) {
  if (auth === 'login') {
    return (
      <Banner tone="warn">
        관리 API 로그인이 필요합니다(처음 접속했거나 세션이 끝났습니다).{' '}
        <a href={adminLoginUrl()} className="underline font-semibold">관리 API 로그인</a> 뒤 이 화면으로 돌아옵니다.
      </Banner>
    );
  }
  if (auth === 'forbidden') return <Banner tone="warn">이 계정은 관리 권한이 없거나 허용되지 않은 주소에서 접속했습니다.</Banner>;
  if (auth === 'disabled') return <Banner tone="warn">관리 기능이 꺼져 있습니다(서버 설정). 운영 담당자에게 확인하세요.</Banner>;
  return null;
}
