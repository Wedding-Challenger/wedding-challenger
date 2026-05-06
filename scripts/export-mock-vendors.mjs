#!/usr/bin/env node
/**
 * mockData.js 의 vendor 배열들을 추출해 Spring 시드용 vendors.json 으로 출력.
 *
 * 출력: ../wedding-challenger-spring/src/main/resources/seed/vendors.json
 *
 * 변환 규칙:
 *  - mockData id 제거 (DB 가 자동 발급)
 *  - image → imageUrl (백엔드 컬럼명)
 *  - category 는 enum (UPPERCASE) 로 변환
 */
import { studios, dresses, makeups, snaps, rings, bouquets, hanboks } from '../src/data/mockData.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const all = [
  ...studios.map((v) => ({ ...v, category: 'STUDIO' })),
  ...dresses.map((v) => ({ ...v, category: 'DRESS' })),
  ...makeups.map((v) => ({ ...v, category: 'MAKEUP' })),
  ...snaps.map((v) => ({ ...v, category: 'SNAP' })),
  ...rings.map((v) => ({ ...v, category: 'RING' })),
  ...bouquets.map((v) => ({ ...v, category: 'BOUQUET' })),
  ...hanboks.map((v) => ({ ...v, category: 'HANBOK' })),
].map(({ id, image, ...rest }) => ({ ...rest, imageUrl: image }));

const outPath = resolve(
  __dirname,
  '../../wedding-challenger-spring/src/main/resources/seed/vendors.json',
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(all, null, 2));
console.log(`Wrote ${all.length} vendors to ${outPath}`);
