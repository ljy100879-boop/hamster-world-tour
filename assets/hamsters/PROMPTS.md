# 햄스터 말 이미지 만들기 (AI 이미지 생성 프롬프트)

이 폴더에 아래 파일 이름으로 PNG를 넣으면 게임이 자동으로 그 이미지를 사용합니다.
파일이 없으면 지금의 SVG 햄스터가 그대로 나옵니다. 넣은 뒤 브라우저를 새로고침(F5)하세요.

| 햄스터 | 기본 (필수) | 기쁨 (선택) | 슬픔 (선택) | 잠 (선택) |
|---|---|---|---|---|
| 해바라기 🌻 | `sunflower.png` | `sunflower-happy.png` | `sunflower-sad.png` | `sunflower-sleep.png` |
| 보리 🎀 | `bori.png` | `bori-happy.png` | `bori-sad.png` | `bori-sleep.png` |
| 콩떡 🎩 | `kongtteok.png` | `kongtteok-happy.png` | `kongtteok-sad.png` | `kongtteok-sleep.png` |
| 땅콩 👓 | `ttangkong.png` | `ttangkong-happy.png` | `ttangkong-sad.png` | `ttangkong-sleep.png` |

- 기본 이미지 4장만 있어도 됩니다. 표정 이미지가 없으면 게임이 확대·기울이기·눈물·Zz 효과로 대신 표현합니다.
- 권장 규격: **정사각형 1024×1024, 투명 배경 PNG**, 햄스터가 가운데에 꽉 차게 (여백 조금)

---

## 만드는 순서 (그림체 통일이 핵심)

1. ChatGPT(이미지 생성), Gemini, Midjourney 등에서 **해바라기 햄스터를 먼저** 만듭니다.
2. 마음에 드는 한 장이 나오면, 나머지 3마리는 **그 이미지를 첨부하고** "같은 그림체 참고" 프롬프트로 만듭니다.
3. 배경이 투명하지 않게 나왔다면: Windows 11 **그림판 → "배경 제거"** 버튼, 또는 remove.bg 사이트로 지웁니다.
4. 파일 이름을 위 표대로 바꿔 이 폴더(`assets/hamsters`)에 넣습니다.

> 게임 판의 칸 아이콘은 "광택 있는 3D 이모지" 스타일(Microsoft Fluent 3D)이라, 햄스터도 같은 느낌으로 맞추면 잘 어울립니다.

---

## 1) 해바라기 (첫 번째, 기준 이미지)

```
A cute chubby golden hamster game piece, full body, sitting upright and facing the viewer.
Round body, big glossy black eyes with white highlights, tiny pink nose, pink inner ears,
fluffy golden-orange fur on the head and back, cream-white cheeks and belly, tiny pink paws held in front of the chest.
It wears a small bright yellow sunflower on top of its head.
Soft 3D render in the style of glossy 3D emoji icons, smooth clay-like materials, soft studio lighting, gentle shading.
Centered, whole body visible with a small margin, no ground, no shadow, transparent background, square 1024x1024.
No text, no frame, no other objects.
```

## 2) 보리 — 첨부: 해바라기 이미지

```
Using the attached image as the exact style and character reference,
draw the same golden hamster with the same proportions, rendering, lighting and camera angle,
but instead of the sunflower it wears a red ribbon bow tilted on its right ear.
Transparent background, square 1024x1024, no text.
```

## 3) 콩떡 — 첨부: 해바라기 이미지

```
Using the attached image as the exact style and character reference,
draw the same golden hamster with the same proportions, rendering, lighting and camera angle,
but instead of the sunflower it wears a small blue top hat with a yellow band.
Transparent background, square 1024x1024, no text.
```

## 4) 땅콩 — 첨부: 해바라기 이미지

```
Using the attached image as the exact style and character reference,
draw the same golden hamster with the same proportions, rendering, lighting and camera angle,
but without the sunflower; it wears round brown-rimmed glasses and a green knitted scarf around its neck.
Transparent background, square 1024x1024, no text.
```

---

## (선택) 표정 이미지 — 첨부: 해당 햄스터의 기본 이미지

기쁨 (`-happy.png`) — 돈을 받을 때
```
Same hamster as the attached image, same outfit, same style and camera angle.
Its cheeks are puffed out round and full of sunflower seeds, eyes happily closed in upside-down U shapes, very joyful.
Transparent background, square 1024x1024, no text.
```

슬픔 (`-sad.png`) — 통행료를 낼 때
```
Same hamster as the attached image, same outfit, same style and camera angle.
Droopy ears, teary glossy eyes with one small tear, a tiny frown, looking sad.
Transparent background, square 1024x1024, no text.
```

잠 (`-sleep.png`) — 케이지(감옥)에 있을 때
```
Same hamster as the attached image, same outfit, same style.
Curled up into a round ball sleeping peacefully, eyes closed, calm expression.
Transparent background, square 1024x1024, no text.
```

---

## 원하는 화풍이 다르다면

첫 번째 프롬프트의 `Soft 3D render in the style of glossy 3D emoji icons, smooth clay-like materials` 부분만 바꾸면 됩니다.

| 화풍 | 바꿔 넣을 문구 |
|---|---|
| 수채화 동화책 | `soft watercolor children's picture book illustration, gentle pastel colors, clean outline` |
| 2D 스티커 | `flat 2D kawaii sticker illustration, thick white outline, bold simple shapes` |
| 픽셀 아트 | `cute 32x32 pixel art sprite, limited palette, crisp pixels` |
| 털 질감 실사풍 | `realistic but cute plush toy photo, soft fluffy fur texture, studio lighting` |
