export default function PrivacyPolicy() {
  return (
    <article className="prose prose-sm max-w-none text-charcoal/80 leading-relaxed space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-charcoal">개인정보처리방침</h1>
        <p className="text-sm text-charcoal/40 mt-1">최종 업데이트: 2026-05-01</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-charcoal mt-6 mb-2">1. 수집하는 개인정보 항목</h2>
        <p>
          웨딩첼린저(이하 "서비스")는 회원가입을 요구하지 않으며, 사용자의 직접적인 식별 정보를
          수집하지 않습니다. 다만 서비스 이용 과정에서 다음 정보가 자동으로 수집될 수 있습니다.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>접속 IP, 브라우저 종류, 운영체제, 접속 일시, 방문 페이지</li>
          <li>쿠키 및 유사 기술을 통해 수집되는 광고 식별자</li>
        </ul>
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
          서비스는 자체적으로 식별 가능한 개인정보를 저장하지 않습니다.
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
      </section>
    </article>
  );
}
