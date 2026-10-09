import { describe, expect, it } from 'vitest';
import { NO_DISTRICT, areaCounts, displayName, districtCounts, filterHalls, hallArea, hallDistrict, hallIllustration, hasPhoto } from '../halls';

describe('displayName', () => {
  it.each([
    ['서울신라호텔((주)호텔신라)', '서울신라호텔'],
    ['(주)봄날앤', '봄날앤'],
    ['㈜라비돌', '라비돌'],
    ['힐스코트(태성산업(주))', '힐스코트'],
    ['W웨딩 마리나컨벤션웨딩홀(더리본(주)마리나웨딩지점)', 'W웨딩 마리나컨벤션웨딩홀'],
    ['(주)플로팅아일랜드', '플로팅아일랜드'],
    ['더 그랜드볼룸', '더 그랜드볼룸'],
  ])('%s → %s', (name, expected) => {
    expect(displayName(name)).toBe(expected);
  });

  it('괄호만 남는 이름은 원래 이름을 쓴다', () => {
    expect(displayName('(비공개)')).toBe('(비공개)');
  });
});

const halls = [
  { id: 1, name: '서울신라호텔((주)호텔신라)', location: '서울 중구' },
  { id: 2, name: '더파티움', location: '서울 영등포구' },
  { id: 3, name: '(주)오션스위츠', location: '제주 제주시' },
  { id: 4, name: '위치없음홀', location: null },
];

describe('지역·필터', () => {
  it('위치 첫 단어로 지역을 묶고 많은 순으로 센다', () => {
    expect(hallArea(halls[0])).toBe('서울');
    expect(hallArea(halls[3])).toBe('기타');
    expect(areaCounts(halls)).toEqual([
      { area: '서울', count: 2 },
      { area: '제주', count: 1 },
      { area: '기타', count: 1 },
    ]);
  });

  it('지역과 검색어(공백·법인 표기 무시)로 거른다', () => {
    expect(filterHalls(halls, { area: '서울' }).map((h) => h.id)).toEqual([1, 2]);
    expect(filterHalls(halls, { query: '신라 호텔' }).map((h) => h.id)).toEqual([1]);
    expect(filterHalls(halls, { query: '영등포' }).map((h) => h.id)).toEqual([2]);
    expect(filterHalls(halls, { area: '제주', query: '파티' })).toEqual([]);
    expect(filterHalls(halls)).toHaveLength(4);
  });

  it('기본 이미지는 사진이 없는 것으로 본다', () => {
    expect(hasPhoto({ image: '/images/wedding/hall-default.svg' })).toBe(false);
    expect(hasPhoto({ image: null })).toBe(false);
    expect(hasPhoto({ image: 'https://cdn.example/hall.jpg' })).toBe(true);
  });
});

const districtHalls = [
  { id: 1, location: '서울 강남구' },
  { id: 2, location: '서울 강남구' },
  { id: 3, location: '서울 서초구' },
  { id: 4, location: '서울 마포구' },
  { id: 5, location: '서울' },
  { id: 6, location: '경남 창원시' },
  { id: 7, location: '세종' },
  { id: 8, location: '세종' },
  { id: 9, location: '  서울   서초구  ' },
];

describe('시·군·구', () => {
  it('위치 둘째 단어가 시·군·구, 없으면 null', () => {
    expect(hallDistrict({ location: '서울 강남구' })).toBe('강남구');
    expect(hallDistrict({ location: '  서울   서초구  ' })).toBe('서초구');
    expect(hallDistrict({ location: '전남광주 여수시' })).toBe('여수시');
    expect(hallDistrict({ location: '세종' })).toBeNull();
    expect(hallDistrict({ location: '' })).toBeNull();
    expect(hallDistrict({ location: null })).toBeNull();
  });

  it('시·도 안의 시·군·구를 많은 순(같으면 가나다)으로 세고, 시·군·구 없는 곳은 맨 뒤 기타로 묶는다', () => {
    expect(districtCounts(districtHalls, '서울')).toEqual([
      { district: '강남구', count: 2 },
      { district: '서초구', count: 2 },
      { district: '마포구', count: 1 },
      { district: NO_DISTRICT, count: 1 },
    ]);
    expect(districtCounts(districtHalls, '경남')).toEqual([{ district: '창원시', count: 1 }]);
    expect(districtCounts(districtHalls, '세종')).toEqual([{ district: NO_DISTRICT, count: 2 }]);
    expect(districtCounts(districtHalls, '부산')).toEqual([]);
  });

  it('시·도와 함께 시·군·구로 거르고, 기타는 시·군·구 없는 것만', () => {
    const ids = (opts) => filterHalls(districtHalls, opts).map((h) => h.id);
    expect(ids({ area: '서울', district: '서초구' })).toEqual([3, 9]);
    expect(ids({ area: '서울', district: NO_DISTRICT })).toEqual([5]);
    expect(ids({ area: '세종', district: NO_DISTRICT })).toEqual([7, 8]);
    // 시·도만 고르면 시·군·구 없는 곳도 보인다
    expect(ids({ area: '서울' })).toEqual([1, 2, 3, 4, 5, 9]);
    // 시·도 없이 시·군·구만 오면 무시한다
    expect(ids({ district: '강남구' })).toHaveLength(districtHalls.length);
    // 다른 시·도의 시·군·구를 고르면 비어 있다
    expect(ids({ area: '경남', district: '강남구' })).toEqual([]);
    expect(ids({ area: '서울', district: '강남구', query: '서초' })).toEqual([]);
  });
});

describe('hallIllustration', () => {
  const ill = (h) => hallIllustration(h).replace('/images/halls/', '');
  it('전용 일러스트가 있는 업체는 이름(법인 표기 무시)으로 찾는다', () => {
    expect(ill({ name: '(주)플로팅아일랜드', location: '서울 서초구', region: '서울(강남)' })).toBe('venues/floating-island.webp');
    expect(ill({ name: '마리나파크 웨딩홀', location: '서울 서초구' })).toBe('venues/marina-park.webp');
    expect(ill({ name: '소노펠리체 컨벤션((주)소노인터내셔널 삼성지점)', location: '서울 강남구' })).toBe('venues/sono-felice.webp');
  });
  it('나머지는 지역 일러스트, 서울은 강남/강남 외 구분', () => {
    expect(ill({ name: 'A', location: '서울 강남구', region: '서울(강남)' })).toBe('regions/seoul-gangnam.webp');
    expect(ill({ name: 'B', location: '서울 마포구', region: '서울(강남 외)' })).toBe('regions/seoul.webp');
    expect(ill({ name: 'C', location: '전남광주 여수시', region: '전남광주' })).toBe('regions/jeolla.webp');
    expect(ill({ name: 'D', location: '광주 서구' })).toBe('regions/gwangju.webp');
    expect(ill({ name: 'E', location: '세종' })).toBe('regions/chungcheong.webp');
    expect(ill({ name: 'F', location: null })).toBe('regions/nationwide.webp');
  });
});
