import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHalls, normalizeHall } from '../halls';
import { getVendors } from '../vendors';
import { FALLBACK_HALLS, fallbackVendors } from '../../data/fallback';

const ok = (result) => ({ ok: true, status: 200, json: async () => ({ code: 'COMMON200', message: '요청에 성공하였습니다.', result }) });

afterEach(() => vi.unstubAllGlobals());
vi.spyOn(console, 'warn').mockImplementation(() => {});

// 백엔드 WeddingHallResponse 실제 응답(로컬 임포트 데이터) 한 건
const HALL = {
  id: 1, name: '더파티움여의도', hallType: null, region: null, location: null, capacityMin: null, capacityMax: null,
  pricePerPerson: 121000, intervalMinutes: null, availableTimes: null, homepage: null, features: null,
  foodMin: 121000, foodMax: 121000, rentMin: 7150000, rentMax: 7150000, decoMin: null, decoMax: null,
  rating: null, description: null, imageUrl: null,
};

describe('웨딩홀 API', () => {
  it('/api/v1/wedding-halls 를 호출하고 평면 응답을 화면 모양으로 바꾼다', async () => {
    const fetch = vi.fn(async () => ok([HALL]));
    vi.stubGlobal('fetch', fetch);
    const [hall] = await getHalls();
    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/wedding-halls');
    expect(hall.features).toEqual([]);
    expect(hall.image).toBe('/images/wedding/hall-default.svg');
    expect(hall.capacity).toEqual({ min: null, max: null });
    expect(hall.priceBreakdown).toEqual({
      food: { min: 121000, max: 121000 },
      rent: { min: 7150000, max: 7150000 },
      deco: { min: 0, max: 0 },
    });
  });

  it('식대가 비면 pricePerPerson 으로 채운다', () => {
    const hall = normalizeHall({ ...HALL, foodMin: null, foodMax: null, pricePerPerson: 90000 });
    expect(hall.priceBreakdown.food).toEqual({ min: 90000, max: 90000 });
  });

  it('네트워크 실패 시 내장 샘플을 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await getHalls()).toBe(FALLBACK_HALLS);
  });

  it('COMMON200 이 아닌 응답도 실패로 보고 내장 샘플을 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ code: 'WHALL001', message: 'x' }) })));
    expect(await getHalls()).toBe(FALLBACK_HALLS);
  });
});

describe('업체 API', () => {
  it('카테고리를 대문자 enum 으로 보내고 items 를 소문자 카테고리로 바꾼다', async () => {
    const fetch = vi.fn(async () => ok({
      items: [{ id: 1, category: 'STUDIO', name: '아뜰리에 스튜디오', price: 1800000, includes: ['원본 300컷'], rating: 4.7, imageUrl: null, attributes: {} }],
      page: 0, size: 100, totalElements: 1, totalPages: 1,
    }));
    vi.stubGlobal('fetch', fetch);
    const [v] = await getVendors('studio');
    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/vendors?size=100&category=STUDIO');
    expect(v).toMatchObject({ category: 'studio', price: 1800000, image: '/images/wedding/studio-default.svg' });
  });

  it('HTTP 오류 시 해당 카테고리 내장 샘플을 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ code: 'COMMON400' }) })));
    expect(await getVendors('dress')).toEqual(fallbackVendors('dress'));
  });
});
