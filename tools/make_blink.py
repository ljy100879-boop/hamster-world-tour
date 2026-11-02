"""햄스터 눈 감은 프레임 만들기: assets/hamsters/<id>.png → <id>-blink.png  (REQ-130 눈 깜빡임)
결과는 눈 부분만 있는 겹침용 그림 (나머지 투명) — 게임이 기본 그림 위에 겹쳐 보인다.

사용법: python tools/make_blink.py [id ...]   (생략하면 4마리 모두)

얼굴 위쪽에서 크고 진한 덩어리 2개(눈)를 찾아 주변 털 색으로 덮고, 감은 눈(아래로 휜 곡선)을 그린다.
새 햄스터 그림을 넣었으면 다시 실행하면 된다. 결과가 이상하면 <id>-blink.png 를 지우면 깜빡임만 빠진다.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'hamsters')
IDS = ['sunflower', 'bori', 'kongtteok', 'ttangkong']


def find_eyes(rgba):
    # 1차: 진한 부분을 넉넉히 / 실패하면 2차: 아주 진한 눈동자만, 붙이기 없이 (안경테가 눈과 붙는 경우)
    for limit, closing in ((70, 2), (45, 0)):
        try:
            return _find_eyes(rgba, limit, closing)
        except RuntimeError as e:
            err = e
    raise err


def _find_eyes(rgba, limit, closing):
    a = rgba[..., 3] > 200
    lum = rgba[..., :3].astype(float) @ [0.299, 0.587, 0.114]
    h, w = lum.shape
    dark = a & (lum < limit)
    dark[: int(h * 0.15)] = False          # 귀·액세서리 위쪽 제외
    dark[int(h * 0.62):] = False           # 몸 아래쪽 제외
    if closing:
        dark = ndimage.binary_closing(dark, iterations=closing)
    dark = ndimage.binary_fill_holes(dark)  # 눈 속 하이라이트까지 포함
    lab, n = ndimage.label(dark)
    blobs = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        fill = len(xs) / (bw * bh)
        if len(xs) < (w * h) * 0.002 or fill < 0.45 or not (0.6 < bw / bh < 1.7):
            continue  # 너무 작거나, 안경테·수염처럼 가늘거나 속이 빈 모양 제외
        blobs.append((len(xs), xs.min(), ys.min(), xs.max(), ys.max(), lab == k))
    blobs.sort(key=lambda b: -b[0])
    eyes = sorted(blobs[:2], key=lambda b: b[1])
    if len(eyes) != 2:
        raise RuntimeError(f'눈을 2개 찾지 못함 ({len(blobs)}개 후보)')
    return eyes


def make(id_):
    src = os.path.join(DIR, id_ + '.png')
    img = Image.open(src).convert('RGBA')
    px = np.array(img)
    eyes = find_eyes(px)
    out = px.copy()
    for _, x0, y0, x1, y1, mask in eyes:
        grow = max(3, int((x1 - x0) * 0.12))
        m = ndimage.binary_dilation(mask, iterations=grow)
        ring = ndimage.binary_dilation(m, iterations=grow * 2) & ~m & (px[..., 3] > 200)
        fur = np.median(px[ring][:, :3], axis=0)
        out[m, :3] = fur
    # 덮은 자리를 살짝 흐리게 섞어 경계를 부드럽게
    soft = Image.fromarray(out).filter(ImageFilter.GaussianBlur(2))
    sp = np.array(soft)
    for _, x0, y0, x1, y1, mask in eyes:
        m = ndimage.binary_dilation(mask, iterations=max(4, int((x1 - x0) * 0.2)))
        out[m] = sp[m]
    res = Image.fromarray(out)
    d = ImageDraw.Draw(res)
    for _, x0, y0, x1, y1, _m in eyes:
        cx, cy, ew = (x0 + x1) / 2, y0 + (y1 - y0) * 0.55, (x1 - x0)
        lw = max(3, int(ew * 0.11))
        box = [cx - ew * 0.45, cy - ew * 0.28, cx + ew * 0.45, cy + ew * 0.28]
        d.arc(box, start=20, end=160, fill=(43, 26, 16, 255), width=lw)  # 아래로 휜 감은 눈 ‿
    # 게임은 이 그림을 기본 그림 "위에 겹쳐" 쓴다 → 눈 부분만 남기고 나머지는 투명하게
    # (윤곽까지 겹치면 반투명 가장자리가 두 번 칠해져 깜빡일 때마다 테두리가 진해짐, BUG-002)
    keep = np.zeros(px.shape[:2], bool)
    for _, x0, y0, x1, y1, _m in eyes:
        ew, eh = x1 - x0, y1 - y0
        keep[max(0, int(y0 - eh * 0.35)):int(y1 + eh * 0.35), max(0, int(x0 - ew * 0.35)):int(x1 + ew * 0.35)] = True
    soft_keep = np.asarray(Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(4))) / 255.0
    arr = np.array(res)
    arr[..., 3] = (arr[..., 3] * soft_keep).astype('uint8')
    res = Image.fromarray(arr)
    dst = os.path.join(DIR, id_ + '-blink.png')
    res.save(dst)
    print(f'{dst}: eyes at {[(int(e[1]), int(e[2]), int(e[3]), int(e[4])) for e in eyes]}')


if __name__ == '__main__':
    for i in (sys.argv[1:] or IDS):
        make(i)
