import { AD_NOTICE } from '../lib/partnerDisclosure';

// PIPA 적합성 검토 필요 — 김경수 P0 게이트 (consent-banner-copy.ko.md 와 정합)
// 제휴 광고 측정 문구(계획서 B17·승인 G4·G5): 시행일 실제 값과 공지 시점은 운영 개통 전 개인정보 책임자가 정한다.
// 공지·문구 배포가 집계 on 보다 먼저다. 동의 배너 문구는 쿠키 중심이라 바꾸지 않는다.
const EFFECTIVE_DATE = null; // 사람이 승인한 시행일('YYYY-MM-DD')을 넣는다

const PARTNER_SECTION1 = `제휴 업체 카드는 ${AD_NOTICE.replace(/입니다\.$/, '이며')}, 카드에 「광고」를 표시합니다. `
  + '광고 효과를 확인하기 위해 자체 측정 코드로 지면·날짜·기기군·광고 배치별 노출 수와 클릭 수의 합계를 기록합니다. '
  + '집계에는 광고 쿠키나 이용자 식별자를 사용하지 않으며 원시 클릭 이력, IP 주소, 전체 브라우저 정보와 방문 경로를 집계 데이터에 저장하지 않습니다. '
  + '업체 링크에는 지면별 UTM 정보가 포함될 수 있으며, 이동한 업체 사이트의 정보 처리는 해당 업체의 방침을 따릅니다.';

const PARTNER_SECTION4 = '제휴 광고 일별 합계 및 리포트 메모는 현재 월을 포함한 13개월 보관 후 삭제합니다.';

// 이전 방침 문구를 그대로 남겨 비교할 수 있게 한다
const CHANGES = [
  {
    item: '1. 제휴 업체 카드',
    before: '유료 제휴 업체는 광고임을 표시하며 일반 목록과 구분해 제공합니다. 제휴 업체 카드는 광고 쿠키나 추적 스크립트 없이 제공되며, 카드를 눌러 업체 홈페이지로 이동하는 정보를 서비스가 수집하지 않습니다.',
    after: PARTNER_SECTION1,
  },
  {
    item: '4. 보유 기간',
    before: '제휴 광고 측정 없음(관리자 감사 기록 90일만 보관).',
    after: `${PARTNER_SECTION4} 관리자 변경 감사 기록은 별도로 90일 보관 후 삭제합니다.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <article className="prose prose-sm max-w-none text-charcoal/80 leading-relaxed space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-charcoal">개인정보처리방침</h1>
        <p className="text-sm text-charcoal/40 mt-1">최종 업데이트: 2026-10-10</p>
        <p className="text-sm text-charcoal/40">시행일: {EFFECTIVE_DATE ?? '확정 후 이 페이지에 공지합니다'}</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-charcoal mt-6 mb-2">1. 수집하는 개인정보 항목</h2>
        <p>
          웨딩챌린저(이하 "서비스")는 회원가입을 요구하지 않으며, 사용자의 직접적인 식별 정보를
          수집하지 않습니다. 다만 서비스 이용 과정에서 다음 정보가 자동으로 수집될 수 있습니다.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>접속 IP, 브라우저 종류, 운영체제, 접속 일시, 방문 페이지</li>
          <li>쿠키 및 유사 기술을 통해 수집되는 광고 식별자</li>
        </ul>
        <p className="mt-2">{PARTNER_SECTION1}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal mt-6 mb-2">2. 개인정보의 이용 목적</h2>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>서비스 제공 및 운영, 안정성 확보</li>
          <li>이용 통계 분석 및 서비스 품질 개선</li>
          <li>맞춤형 광고 게재 및 효과 측정</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal mt-6 mb-2">3. 쿠키 및 광고 파트너</h2>
        <p>
          서비스는 사용자 경험 개선과 광고 게재를 위해 쿠키를 사용합니다.
          또한 Google 등 제3자 광고 공급업체의 광고를 게재하며, 이들 업체는 사용자의 사이트 방문 정보를
          기반으로 맞춤 광고를 제공할 수 있습니다.
        </p>
        <p className="mt-2">
          Google이 광고 쿠키(DART 쿠키 포함)를 사용하는 방식은{' '}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-deep-rose underline"
          >
            Google 광고 정책
          </a>
          에서 확인할 수 있습니다. 사용자는{' '}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-deep-rose underline"
          >
            Google 광고 설정
          </a>
          에서 맞춤 광고를 비활성화할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal mt-6 mb-2">4. 개인정보의 보유 및 이용 기간</h2>
        <p>
          서비스는 이용자의 식별 가능한 개인정보를 자체적으로 저장하지 않습니다.
          {' '}{PARTNER_SECTION4}
          {' '}다만 서비스 운영자가 제휴 업체 관리 도구를 사용할 때에는 접근 인증으로 확인된 운영자 식별자와 변경 내역을
          감사 기록으로 남기며, 이 기록은 90일간 보관한 뒤 파기합니다. 이 기록은 일반 이용자에게는 해당하지 않습니다.
          쿠키 등 자동 수집 정보는 브라우저 설정 또는 광고 설정 페이지에서 사용자가 직접 삭제·차단할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal mt-6 mb-2">5. 이용자의 권리</h2>
        <p>
          이용자는 언제든지 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 그 경우 일부 서비스 기능이
          제한될 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal mt-6 mb-2">6. 개인정보 보호책임자</h2>
        <p>
          서비스 관련 개인정보 문의는 아래 연락처로 가능합니다.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>이메일: contact@wedding-challenger.com</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal mt-6 mb-2">7. 정책의 변경</h2>
        <p>
          본 방침은 법령 및 서비스 변경에 따라 개정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.
        </p>
        <h3 className="text-base font-semibold text-charcoal mt-4 mb-2">변경 전후 비교 (제휴 업체 광고 측정)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-warm-beige/40">
            <thead className="bg-cream text-charcoal/70">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">항목</th>
                <th scope="col" className="px-3 py-2 text-left">이전</th>
                <th scope="col" className="px-3 py-2 text-left">변경</th>
              </tr>
            </thead>
            <tbody>
              {CHANGES.map((c) => (
                <tr key={c.item} className="border-t border-warm-beige/40 align-top">
                  <th scope="row" className="px-3 py-2 text-left font-medium whitespace-nowrap">{c.item}</th>
                  <td className="px-3 py-2">{c.before}</td>
                  <td className="px-3 py-2">{c.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
