"""AI가 만든 시트 이미지를 칸별로 잘라 투명 배경 PNG로 저장하는 공용 도구.

배경 처리
- 진짜 투명(알파) PNG면 그대로 사용
- 아니면 테두리와 이어진 배경을 지운다:
  · 회색 체크무늬("가짜 투명") — 무채색·밝은 픽셀
  · 단색 배경(흰색, 연두 등) — 테두리 대표색과 비슷한 픽셀
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

OUT_SIZE = 512


def background_mask(rgb):
    a = rgb.astype(int)
    spread = a.max(axis=2) - a.min(axis=2)
    checker = (spread <= 12) & (a.min(axis=2) >= 205)
    border_checker = np.concatenate([checker[0], checker[-1], checker[:, 0], checker[:, -1]])
    if border_checker.mean() > 0.8:
        candidate = checker  # 체크무늬 또는 흰 배경
    else:
        border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
        bg_color = np.median(border, axis=0)
        candidate = np.abs(a - bg_color).sum(axis=2) <= 60  # 단색(연두 등) 배경
    labels, _ = ndimage.label(candidate)
    edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    return np.isin(labels, list(edge))


def load_rgba(path):
    img = Image.open(path)
    if img.mode in ('RGBA', 'LA') and np.asarray(img.getchannel('A')).min() < 250:
        rgba = img.convert('RGBA')
        fg = np.asarray(rgba.getchannel('A')) > 20
        return rgba, fg
    img = img.convert('RGB')
    fg = ~background_mask(np.asarray(img))
    # 작은 잡티 제거 후 가장자리 1px 깎고 부드럽게
    fg = ndimage.binary_opening(fg, iterations=1)
    fg = ndimage.binary_erosion(fg, iterations=1)
    rgba = img.copy()
    rgba.putalpha(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)))
    return rgba, fg


def cut(path, cols, rows, names, outdir, square=True, tile=False):
    """names[행][열] 이름으로 outdir 에 PNG 저장.
    square=True: 512×512 정사각형(바닥 기준 정렬), False: 원래 비율 유지(긴 변 512).
    tile=True: 여백 없이 잘라 512×512 로 맞춤 (주사위 면 텍스처용)."""
    rgba, fg = load_rgba(path)
    H, W = fg.shape
    labels, n = ndimage.label(fg)
    idx = range(1, n + 1)
    sizes = ndimage.sum(fg, labels, idx)
    cents = ndimage.center_of_mass(fg, labels, idx)
    for r in range(rows):
        for c in range(cols):
            y0, y1 = int(H * r / rows), int(H * (r + 1) / rows)
            x0, x1 = int(W * c / cols), int(W * (c + 1) / cols)
            # 무게중심이 이 칸 안에 있는 덩어리만 이 그림의 일부로 본다 (옆 그림 조각 제외)
            mine = [i + 1 for i, (sz, (cy, cx)) in enumerate(zip(sizes, cents))
                    if sz >= 150 and y0 <= cy < y1 and x0 <= cx < x1]
            keep = np.isin(labels, mine)
            ys, xs = np.nonzero(keep[y0:y1, x0:x1])
            if not len(ys):
                print('빈 칸:', os.path.basename(path), r, c)
                continue
            box = (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1)
            cell = rgba.copy()
            a = np.asarray(cell.getchannel('A')).copy()
            a[~ndimage.binary_dilation(keep, iterations=2)] = 0
            cell.putalpha(Image.fromarray(a))
            piece = cell.crop(box)
            if tile:
                canvas = piece.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
            elif square:
                side = int(max(piece.size) * 1.06)
                canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
                canvas.paste(piece, ((side - piece.width) // 2, side - piece.height - int(side * 0.03)), piece)
                canvas = canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
            else:
                pad = int(max(piece.size) * 0.03)
                canvas = Image.new('RGBA', (piece.width + pad * 2, piece.height + pad * 2), (0, 0, 0, 0))
                canvas.paste(piece, (pad, pad), piece)
                k = OUT_SIZE / max(canvas.size)
                canvas = canvas.resize((round(canvas.width * k), round(canvas.height * k)), Image.LANCZOS)
            out = os.path.join(outdir, names[r][c] + '.png')
            canvas.save(out, optimize=True)
            print('저장:', os.path.relpath(out), piece.size)
