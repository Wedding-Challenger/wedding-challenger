import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import HallFilter from '../HallFilter';
import { NO_DISTRICT } from '../../lib/halls';

const halls = [
  { id: 1, location: '서울 강남구' },
  { id: 2, location: '서울 강남구' },
  { id: 3, location: '서울 서초구' },
  { id: 4, location: '서울' },
  { id: 5, location: '세종' },
  { id: 6, location: '경남 창원시' },
];

// Node 환경이라 DOM 이 없다 — 컴포넌트를 함수로 불러 나온 엘리먼트 트리에서 버튼을 찾는다
function buttons(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => buttons(n, out));
  else if (node && typeof node === 'object' && node.props) {
    if (node.type === 'button') out.push(node);
    buttons(node.props.children, out);
  }
  return out;
}
const label = (btn) => [].concat(btn.props.children).join('');

function setup(props) {
  const onAreaChange = vi.fn();
  const onDistrictChange = vi.fn();
  const all = { halls, area: null, district: null, onAreaChange, onDistrictChange, ...props };
  return { tree: HallFilter(all), html: renderToString(<HallFilter {...all} />), onAreaChange, onDistrictChange };
}

describe('HallFilter 시·군·구 줄', () => {
  it('시·도를 고르지 않으면 둘째 줄이 없다', () => {
    const { tree, html } = setup();
    expect(html).not.toContain('시·군·구');
    expect(buttons(tree).map(label)).toEqual(['전체 6', '서울 4', '세종 1', '경남 1']);
  });

  it('시·도를 고르면 그 아래 「{시·도} 전체」와 시·군·구 칩(기타 포함)을 보여 준다', () => {
    const { tree, html } = setup({ area: '서울' });
    expect(html).toContain('role="group" aria-label="서울 시·군·구"');
    expect(buttons(tree).map(label)).toEqual([
      '전체 6', '서울 4', '세종 1', '경남 1',
      '서울 전체 4', '강남구 2', '서초구 1', `${NO_DISTRICT} 1`,
    ]);
  });

  it('시·군·구가 하나뿐이면 둘째 줄을 그리지 않는다', () => {
    expect(setup({ area: '경남' }).html).not.toContain('시·군·구');
    expect(setup({ area: '세종' }).html).not.toContain('시·군·구');
  });

  it('시·도를 바꾸거나 전체로 가면 시·군·구를 null 로 돌린다', () => {
    const { tree, onAreaChange, onDistrictChange } = setup({ area: '서울', district: '강남구' });
    const find = (text) => buttons(tree).find((b) => label(b) === text);
    find('경남 1').props.onClick();
    expect(onAreaChange).toHaveBeenLastCalledWith('경남');
    expect(onDistrictChange).toHaveBeenLastCalledWith(null);
    find('전체 6').props.onClick();
    expect(onAreaChange).toHaveBeenLastCalledWith(null);
    expect(onDistrictChange).toHaveBeenCalledTimes(2);
    expect(onDistrictChange).toHaveBeenLastCalledWith(null);
  });

  it('시·군·구 칩과 「{시·도} 전체」 칩은 district 만 바꾼다', () => {
    const { tree, onAreaChange, onDistrictChange } = setup({ area: '서울', district: '강남구' });
    const find = (text) => buttons(tree).find((b) => label(b) === text);
    find('서초구 1').props.onClick();
    expect(onDistrictChange).toHaveBeenLastCalledWith('서초구');
    find('서울 전체 4').props.onClick();
    expect(onDistrictChange).toHaveBeenLastCalledWith(null);
    expect(onAreaChange).not.toHaveBeenCalled();
  });

  it('고른 시·군·구 칩에 aria-pressed 를 단다', () => {
    const { tree } = setup({ area: '서울', district: '강남구' });
    const pressed = buttons(tree).filter((b) => b.props['aria-pressed']).map(label);
    expect(pressed).toEqual(['서울 4', '강남구 2']);
  });
});
