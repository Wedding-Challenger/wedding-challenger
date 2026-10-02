import { describe, expect, it } from 'vitest';
import { areaCounts, displayName, filterHalls, hallArea, hasPhoto } from '../halls';

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
