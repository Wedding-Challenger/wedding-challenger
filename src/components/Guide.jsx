const phases = [
  {
    period: '12개월 전',
    color: 'bg-soft-gold/10 border-soft-gold/30',
    titleColor: 'text-soft-gold',
    items: [
      { title: '전체 예산 설정', desc: '양가 부모님과 협의하여 총 결혼 예산을 확정합니다. 웨딩홀·스드메·신혼여행·혼수·이사 비용을 큰 항목별로 배분하세요.' },
      { title: '예식 날짜·요일 결정', desc: '토요일 오전 예식은 가장 인기가 높아 1년 전부터 예약이 마감됩니다. 날짜 유연성이 있다면 평일이나 일요일을 고려하면 비용을 절약할 수 있습니다.' },
      { title: '예식장(웨딩홀) 투어 시작', desc: '하객 수 기준으로 수용 가능한 홀을 추려 최소 3~5곳 방문·비교합니다. 식대·대관료·데코 포함 여부를 반드시 확인하세요.' },
    ],
  },
  {
    period: '10개월 전',
    color: 'bg-deep-rose/5 border-deep-rose/20',
    titleColor: 'text-deep-rose',
    items: [
      { title: '웨딩홀 계약', desc: '원하는 날짜와 시간대를 확보하기 위해 계약금을 지불하고 예약을 확정합니다. 취소·변경 약관을 꼼꼼히 확인하세요.' },
      { title: '스드메 업체 조사 시작', desc: '스튜디오·드레스숍·메이크업 아티스트를 개별 또는 패키지로 알아봅니다. 포트폴리오 스타일이 본인 취향과 맞는지 확인하는 것이 핵심입니다.' },
      { title: '신혼여행 목적지 결정', desc: '성수기(5~6월, 10~11월)에는 항공권이 빠르게 소진됩니다. 목적지를 일찍 결정하고 특가 항공권을 노려보세요.' },
    ],
  },
  {
    period: '8개월 전',
    color: 'bg-warm-beige/40 border-warm-beige/60',
    titleColor: 'text-charcoal',
    items: [
      { title: '스튜디오 계약 및 촬영 일정 확정', desc: '본식 촬영과 별도로 야외 촬영(로케이션 스냅)을 원한다면 이 시기에 함께 예약합니다.' },
      { title: '드레스 피팅 일정 잡기', desc: '드레스는 수선 기간이 4~8주 필요하므로 여유 있게 첫 피팅을 예약합니다.' },
      { title: '청첩장 디자인 선정', desc: '종이 청첩장은 인쇄 후 발송까지 2~3주 소요됩니다. 모바일 청첩장도 함께 준비하면 편리합니다.' },
    ],
  },
  {
    period: '6개월 전',
    color: 'bg-sage/10 border-sage/30',
    titleColor: 'text-sage',
    items: [
      { title: '메이크업 리허설 예약', desc: '본식 메이크업과 동일한 아티스트로 미리 리허설을 진행해 원하는 스타일을 조율합니다.' },
      { title: '반지·부케·혼주한복 업체 선정', desc: '반지는 제작 기간이 4~6주, 혼주한복은 맞춤 제작 시 8~12주가 소요될 수 있습니다.' },
      { title: '본식 스냅 작가 계약', desc: '본식 스냅은 날짜별 단 한 팀만 예약 가능하므로 원하는 작가가 있다면 일찍 예약하세요.' },
      { title: '신혼집 탐색 시작', desc: '지역·예산·전세·월세 등 조건을 정하고 부동산 시장을 파악하기 시작합니다.' },
    ],
  },
  {
    period: '3개월 전',
    color: 'bg-cream border-warm-beige/50',
    titleColor: 'text-charcoal',
    items: [
      { title: '청첩장 발송', desc: '종이 청첩장은 예식 6~8주 전 발송이 적당합니다. 모바일 청첩장은 3~4주 전 발송합니다.' },
      { title: '혼수 가전·가구 구매 시작', desc: '대형 가전은 입주 시기에 맞춰 배송 일정을 조율해야 하므로 미리 구매합니다.' },
      { title: '드레스 최종 피팅 및 픽업 일정 확인', desc: '본식 3~4주 전 최종 피팅을 마치고 픽업 또는 배송 일정을 확인합니다.' },
      { title: '웨딩홀 세부 옵션 결정', desc: '피로연 메뉴, 테이블 데코, 음향·영상 사양을 웨딩홀 담당자와 최종 확인합니다.' },
    ],
  },
  {
    period: '1개월 전',
    color: 'bg-white border-charcoal/10',
    titleColor: 'text-charcoal',
    items: [
      { title: '하객 인원 최종 집계', desc: '웨딩홀에 최종 식사 인원을 통보하고, 식대·좌석 배치를 확정합니다.' },
      { title: '축의금 봉투·방명록 준비', desc: '봉투 디자인·수량을 확인하고 서명 펜 등 소품도 준비합니다.' },
      { title: '당일 스케줄표 작성', desc: '메이크업 시작 시각 → 드레스 착용 → 리허설 → 예식 순으로 타임라인을 작성합니다.' },
      { title: '신혼여행 짐 챙기기', desc: '여권 유효기간, 환전, 여행자 보험, 비자(필요 시)를 미리 점검합니다.' },
    ],
  },
  {
    period: '당일',
    color: 'bg-soft-gold/20 border-soft-gold/50',
    titleColor: 'text-soft-gold',
    items: [
      { title: '메이크업 & 드레스', desc: '충분한 여유를 두고 일찍 도착합니다. 예식 3~4시간 전 메이크업 시작이 일반적입니다.' },
      { title: '리허설 진행', desc: '입장 동선, 마이크 위치, 음악 큐 등을 예식 1~2시간 전 담당자와 점검합니다.' },
      { title: '소중한 순간 만끽하기', desc: '오늘은 당신의 날입니다. 세부 사항은 담당자에게 맡기고, 소중한 사람들과 함께하는 시간을 즐기세요.' },
    ],
  },
];

export default function Guide() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-charcoal mb-3">결혼 준비 타임라인 가이드</h1>
        <p className="text-charcoal/60">
          결혼식 12개월 전부터 당일까지, 놓치지 말아야 할 체크포인트를 시간 순서대로 정리했습니다.
          각 단계를 참고해 나만의 준비 일정을 만들어 보세요.
        </p>
      </header>

      <div className="space-y-8">
        {phases.map((phase) => (
          <section key={phase.period} className={`border rounded-2xl p-6 ${phase.color}`}>
            <h2 className={`text-xl font-bold mb-4 ${phase.titleColor}`}>{phase.period}</h2>
            <ul className="space-y-4">
              {phase.items.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-1 w-2 h-2 rounded-full bg-charcoal/30 shrink-0" />
                  <div>
                    <p className="font-semibold text-charcoal">{item.title}</p>
                    <p className="text-sm text-charcoal/60 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="mt-12 p-6 bg-warm-beige/20 rounded-2xl text-sm text-charcoal/50">
        <p>
          위 타임라인은 일반적인 가이드입니다. 예식장·스드메 업체 사정, 예산, 지역에 따라
          일정이 달라질 수 있으니 담당자와 직접 확인하세요.
          웨딩첼린저의{' '}
          <a href="/checklist" className="text-deep-rose underline">체크리스트</a>도 함께 활용해 보세요.
        </p>
      </footer>
    </div>
  );
}
