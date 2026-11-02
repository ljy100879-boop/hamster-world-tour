"""배경용 세계지도 SVG 만들기 (Natural Earth 110m 육지, 퍼블릭 도메인)

사용법:
  curl -L -o land.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
  python tools/make_world_map.py land.geojson

결과: assets/background/world-map.svg
투영: 경위도 그대로(등장방형). 가로 경도 -180~180, 세로 위도 90~-60 (남극 제외)
→ 화면에서 햄스터 위치를 (경도, 위도)로 바로 계산할 수 있다 (js/ui.js WORLD_SPOTS).
"""
import json
import os
import sys

TOP, BOTTOM = 90, -60  # 위도 범위
W, H = 360, TOP - BOTTOM
OCEAN = '#bfe6f2'
LAND = '#a7d98f'
COAST = '#ffffff'


def ring_path(ring):
    pts = []
    for lon, lat in ring:
        lat = max(min(lat, TOP), BOTTOM)
        pts.append(f'{lon + 180:.2f},{TOP - lat:.2f}')
    return 'M' + 'L'.join(pts) + 'Z'


def main(src):
    geo = json.load(open(src, encoding='utf-8'))
    paths = []
    for f in geo['features']:
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            if max(lat for _, lat in poly[0]) < BOTTOM:  # 남극 등 범위 밖
                continue
            paths.append(''.join(ring_path(r) for r in poly))
    out = os.path.join(os.path.dirname(__file__), '..', 'assets', 'background', 'world-map.svg')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">'
           f'<!-- Made with Natural Earth (public domain) -->'
           f'<rect width="{W}" height="{H}" fill="{OCEAN}"/>'
           f'<path d="{"".join(paths)}" fill="{LAND}" stroke="{COAST}" stroke-width="0.6" stroke-linejoin="round"/>'
           f'</svg>')
    open(out, 'w', encoding='utf-8').write(svg)
    print(f'{out}: {len(paths)} polygons, {len(svg) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'land.geojson')
