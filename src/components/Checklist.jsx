import { useState } from 'react';

const GROUPS = [
  {
    period: '12개월 전',
    color: 'bg-soft-gold/10',
    borderColor: 'border-soft-gold/40',
    items: [
      { id: 'c01', text: '양가 부모님과 결혼 예산 합의' },
      { id: 'c02', text: '예식 날짜 및 요일 결정' },
      { id: 'c03', text: '웨딩홀 후보 3~5곳 투어' },
      { id: 'c04', text: '웨딩홀 계약 및 날짜 확정' },
    ],
  },
  {
    period: '10개월 전',
    color: 'bg-deep-rose/5',
    borderColor: 'border-deep-rose/20',
    items: [
      { id: 'c05', text: '스드메 업체 리스트 작성 및 미팅' },
      { id: 'c06', text: '신혼여행 목적지 결정' },
      { id: 'c07', text: '항공권 예약 (성수기는 조기 마감)' },
    ],
  },
  {
    period: '8개월 전',
    color: 'bg-warm-beige/30',
    borderColor: 'border-warm-beige/60',
    items: [
      { id: 'c08', text: '스튜디오 계약 및 촬영 날짜 확정' },
      { id: 'c09', text: '드레스 첫 피팅 예약' },
      { id: 'c10', text: '청첩장 디자인 선정 및 문안 작성' },
    ],
  },
  {
    period: '6개월 전',
    color: 'bg-sage/10',
    borderColor: 'border-sage/30',
    items: [
      { id: 'c11', text: '메이크업 리허설 예약' },
      { id: 'c12', text: '반지 업체 선정 및 계약' },
      { id: 'c13', text: '혼주한복 맞춤 주문' },
      { id: 'c14', text: '본식 스냅 작가 계약' },
      { id: 'c15', text: '부케 업체 선정' },
    ],
  },
  {
    period: '3개월 전',
    color: 'bg-cream',
    borderColor: 'border-warm-beige/50',
    items: [
      { id: 'c16', text: '청첩장 인쇄 및 발송 (종이)' },
      { id: 'c17', text: '모바일 청첩장 제작' },
      { id: 'c18', text: '혼수 가전·가구 구매' },
      { id: 'c19', text: '드레스 최종 피팅' },
    ],
  },
  {
    period: '1개월 전',
    color: 'bg-white',
    borderColor: 'border-charcoal/10',
    items: [
      { id: 'c20', text: '하객 인원 최종 집계 후 웨딩홀 통보' },
      { id: 'c21', text: '축의금 봉투·방명록 준비' },
      { id: 'c22', text: '당일 타임라인 작성 및 공유' },
      { id: 'c23', text: '신혼여행 짐 준비 (여권·환전·보험)' },
    ],
  },
  {
    period: '1주일 전',
    color: 'bg-soft-gold/5',
    borderColor: 'border-soft-gold/30',
    items: [
      { id: 'c24', text: '웨딩홀 담당자와 최종 세부 사항 확인' },
      { id: 'c25', text: '스냅·스튜디오 작가와 집결 장소 재확인' },
      { id: 'c26', text: '메이크업 아티스트와 시작 시각 재확인' },
      { id: 'c27', text: '드레스 픽업 또는 배송 확인' },
    ],
  },
  {
    period: '당일',
    color: 'bg-soft-gold/20',
    borderColor: 'border-soft-gold/50',
    items: [
      { id: 'c28', text: '여유 있게 메이크업 장소 도착' },
      { id: 'c29', text: '리허설 진행 (동선·음악·마이크 확인)' },
      { id: 'c30', text: '소중한 사람들과 행복한 시간 만끽하기' },
    ],
  },
];

export default function Checklist() {
  const [checked, setChecked] = useState({});

  const toggle = (id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const totalItems = GROUPS.reduce((acc, g) => acc + g.items.length, 0);
  const doneCount = Object.values(checked).filter(Boolean).length;
  const percent = Math.round((doneCount / totalItems) * 100);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal mb-3">결혼 준비 체크리스트</h1>
        <p className="text-charcoal/60 mb-4">
          시기별로 확인해야 할 항목을 클릭하여 완료 표시하세요.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-warm-beige/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-soft-gold rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-soft-gold shrink-0">
            {doneCount}/{totalItems} ({percent}%)
          </span>
        </div>
      </header>

      <div className="space-y-6">
        {GROUPS.map((group) => {
          const groupDone = group.items.filter((it) => checked[it.id]).length;
          return (
            <section
              key={group.period}
              className={`border rounded-2xl p-6 ${group.color} ${group.borderColor}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-charcoal">{group.period}</h2>
                <span className="text-xs text-charcoal/40">
                  {groupDone}/{group.items.length}
                </span>
              </div>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => toggle(item.id)}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${
                          checked[item.id]
                            ? 'bg-soft-gold border-soft-gold'
                            : 'border-charcoal/20 bg-white'
                        }`}
                      >
                        {checked[item.id] && (
                          <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white">
                            <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <span
                        className={`text-sm transition-all ${
                          checked[item.id] ? 'line-through text-charcoal/30' : 'text-charcoal'
                        }`}
                      >
                        {item.text}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-charcoal/30 text-center">
        체크 상태는 이 브라우저에만 저장되며 새로고침 시 초기화됩니다.
      </p>
    </div>
  );
}
