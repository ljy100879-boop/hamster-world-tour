"""건물 시트(왼쪽: 햄스터 굴, 오른쪽: 햄스터 궁전)를 잘라 투명 PNG로 저장한다.

assets/buildings/원본/ 에 이미지 1장(파일 이름 자유)을 넣고 실행:
    python tools/cut_buildings.py
결과: assets/buildings/house.png, assets/buildings/palace.png
"""
import os
import sys
from cut_sheet import cut

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'buildings')
SRC = os.path.join(ROOT, '원본')

if __name__ == '__main__':
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))) if os.path.isdir(SRC) else []
    if not files:
        sys.exit('assets/buildings/원본/ 폴더에 건물 이미지를 넣어 주세요.')
    cut(os.path.join(SRC, files[-1]), 2, 1, [['house', 'palace']], ROOT, square=False)
