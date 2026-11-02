"""치즈(또는 다른) 주사위 면 이미지를 잘라 assets/dice/ 에 저장한다.

assets/dice/원본/ 에서 가장 최근에 넣은 이미지 1장을 쓴다 (파일 이름을 직접 줄 수도 있음):
    python tools/cut_dice.py [이미지 경로]
그림 안의 면(색이 진한 덩어리) 개수를 세어 종류를 판단한다.
- 1개  → face.png  (눈 없는 면, 눈은 게임이 치즈 구멍처럼 그림)
- 6개  → 3×2 시트, face1.png ~ face6.png
- 18개 → 6×3 참고 시트(여러 각도 + 맨 아래 줄에 1~6면), 맨 아래 줄을 face1.png ~ face6.png 로

면은 3D 주사위의 각 면에 꽉 차게 입히므로 배경 없이 면 부분만 잘라 512×512 로 맞춘다.
면을 찾을 때는 배경(흰색·회색·체크무늬·마젠타)과 구별되는 "색이 진한 부분"을 쓴다.
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'dice')
SRC = os.path.join(ROOT, '원본')
SIZE = 512
SIX = [['face1', 'face2', 'face3'], ['face4', 'face5', 'face6']]


def face_mask(rgb):
    a = rgb.astype(int)
    sat = a.max(axis=2) - a.min(axis=2)
    magenta = (a[..., 0] > 200) & (a[..., 2] > 200) & (a[..., 1] < 90)
    return (sat > 110) & ~magenta


def count_faces(mask):
    labels, n = ndimage.label(ndimage.binary_closing(mask, iterations=3))
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    return int((sizes > mask.size * 0.01).sum())


def crop_faces(img, mask, cols, rows, names):
    """names[행][열] (None 이면 건너뜀)"""
    H, W = mask.shape
    for r in range(rows):
        for c in range(cols):
            if names[r][c] is None:
                continue
            y0, y1 = int(H * r / rows), int(H * (r + 1) / rows)
            x0, x1 = int(W * c / cols), int(W * (c + 1) / cols)
            cell = ndimage.binary_closing(mask[y0:y1, x0:x1], iterations=3)
            labels, n = ndimage.label(cell)
            if not n:
                print('빈 칸:', r, c)
                continue
            sizes = ndimage.sum(cell, labels, range(1, n + 1))
            biggest = labels == (int(np.argmax(sizes)) + 1)
            ys, xs = np.nonzero(biggest)
            # 바깥 번짐(글로우)을 피해 3% 안쪽으로 자름
            m = int(max(np.ptp(xs), np.ptp(ys)) * 0.03)
            box = (x0 + xs.min() + m, y0 + ys.min() + m, x0 + xs.max() + 1 - m, y0 + ys.max() + 1 - m)
            face = img.crop(box).resize((SIZE, SIZE), Image.LANCZOS)
            out = os.path.join(ROOT, names[r][c] + '.png')
            face.save(out, optimize=True)
            print('저장:', os.path.relpath(out), (int(box[2] - box[0]), int(box[3] - box[1])))


if __name__ == '__main__':
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        files = [os.path.join(SRC, f) for f in os.listdir(SRC) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))] if os.path.isdir(SRC) else []
        if not files:
            sys.exit('assets/dice/원본/ 폴더에 주사위 이미지를 넣어 주세요.')
        path = max(files, key=os.path.getmtime)
    img = Image.open(path).convert('RGB')
    mask = face_mask(np.asarray(img))
    n = count_faces(mask)
    print('사용 이미지:', os.path.basename(path), '/ 찾은 면:', n)
    six_files = [os.path.join(ROOT, f'face{k}.png') for k in range(1, 7)]
    if n >= 15:
        crop_faces(img, mask, 6, 3, [[None] * 6, [None] * 6, ['face1', 'face2', 'face3', 'face4', 'face5', 'face6']])
    elif n >= 5:
        crop_faces(img, mask, 3, 2, SIX)
    else:
        for f in six_files:
            if os.path.exists(f):
                os.remove(f)  # 면 1개 모드로 바꿀 때 이전 6면 이미지는 지운다
        crop_faces(img, mask, 1, 1, [['face']])
