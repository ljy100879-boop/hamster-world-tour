"""햄스터 시트 이미지를 한 마리씩 잘라 투명 배경 PNG로 저장한다.

사용법: python tools/cut_hamsters.py
"""
import os
from cut_sheet import cut

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'hamsters')
SRC = os.path.join(ROOT, '원본')
NAMES = ['sunflower', 'bori', 'kongtteok', 'ttangkong']

# (파일, 열 수, 행 수, 칸별 출력 이름[행][열])
SHEETS = [
    ('해바라기와 리본을 쓴 햄스터 친구들.png', 2, 2, [NAMES[0:2], NAMES[2:4]]),
    ('귀여운 햄스터 감정 스티커 시트.png', 4, 3, [[n + '-happy' for n in NAMES], [n + '-sad' for n in NAMES], [n + '-sleep' for n in NAMES]]),
]

if __name__ == '__main__':
    for fname, cols, rows, names in SHEETS:
        cut(os.path.join(SRC, fname), cols, rows, names, ROOT)
