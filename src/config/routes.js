// 사전 렌더링할 라우트와 페이지별 메타 정보. public/sitemap.xml 과 목록을 맞춘다.
export const SITE_URL = 'https://wedding-challenger.com'

export const ROUTES = [
  {
    path: '/',
    title: '웨딩첼린저 - 나만의 웨딩 견적 플래너',
    description: '웨딩첼린저는 예산과 하객 수에 맞춰 웨딩홀, 스드메, 스냅을 한 번에 비교하고 견적을 만들어 주는 무료 웨딩 플래닝 서비스입니다.',
  },
  {
    path: '/calc',
    title: '웨딩 예산 계산기 - 웨딩첼린저',
    description: '총예산과 하객 수를 입력하면 웨딩홀·스드메·스냅 비용을 조합해 나만의 웨딩 견적을 계산합니다.',
  },
  {
    path: '/guide',
    title: '결혼 준비 타임라인 가이드 - 웨딩첼린저',
    description: '예식 12개월 전부터 본식까지, 웨딩홀 투어·스드메 계약·청첩장 등 시기별로 해야 할 결혼 준비를 정리했습니다.',
  },
  {
    path: '/checklist',
    title: '결혼 준비 체크리스트 - 웨딩첼린저',
    description: '예식 12개월 전부터 시기별 결혼 준비 할 일을 하나씩 체크하며 확인하세요.',
  },
  {
    path: '/about',
    title: '서비스 소개 - 웨딩첼린저',
    description: '예산 기반 추천, 실시간 견적 바구니, 지역별 시장가 비교 등 웨딩첼린저의 기능을 소개합니다.',
  },
  {
    path: '/privacy',
    title: '개인정보처리방침 - 웨딩첼린저',
    description: '웨딩첼린저의 개인정보 수집·이용 및 광고 쿠키 처리 방침입니다.',
  },
  {
    path: '/terms',
    title: '이용약관 - 웨딩첼린저',
    description: '웨딩첼린저 서비스 이용약관입니다.',
  },
]
