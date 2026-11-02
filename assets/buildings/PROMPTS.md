# 건물 이미지 만들기 (햄스터 굴 · 햄스터 궁전)

햄스터 이미지와 같은 그림체로 건물 2개(굴, 궁전)를 **한 장에** 만들어 이 폴더의 `원본/` 에 넣으면 됩니다.
넣은 뒤 Claude에게 "건물 이미지 넣었어"라고 말하면 잘라서 적용해 드립니다.
(직접 하려면 `python tools/cut_buildings.py` 실행 → `house.png`, `palace.png` 생성)

- 그림이 없으면 지금의 기본 3D 아이콘이 그대로 나옵니다.
- 이미 배경이 **진짜 투명**인 PNG 2장이 있다면 `house.png`, `palace.png` 이름으로 이 폴더에 바로 넣어도 됩니다.

---

## 만드는 순서

1. ChatGPT / Gemini 에 **햄스터 이미지(예: `assets/hamsters/sunflower.png`)를 첨부**합니다. 그림체를 맞추기 위해서예요.
2. 아래 프롬프트를 붙여 넣습니다.
3. 결과 이미지를 `assets/buildings/원본/` 에 저장합니다 (파일 이름은 아무거나).

> **배경은 "투명" 대신 단색 자홍색(마젠타)으로 요청하세요.** AI에게 투명 배경을 요청하면 지난번처럼 회색 체크무늬를 그림으로 그려 넣는 경우가 많습니다. 건물에 잘 안 쓰이는 색이라 깨끗하게 지울 수 있습니다.

---

## 기본 프롬프트 (첨부: 햄스터 이미지)

```
Using the attached hamster image only as a style reference (same soft 3D render, warm pastel colors,
glossy toy-like materials, soft studio lighting), create a game asset sheet with exactly two buildings
side by side, with plenty of empty space around each, seen from a slightly elevated front three-quarter view.

LEFT — "Hamster burrow house": a small cozy round mound house made of soft brown earth with a grassy top,
a round wooden door with a tiny brass knob, one round window glowing with warm light,
a little sunflower growing beside the door, a few sunflower seeds scattered at the base.

RIGHT — "Hamster palace": a cute miniature palace for hamsters with cream and pastel peach walls,
two round towers with shiny golden domed roofs shaped like sunflower seeds,
a sunflower emblem above an arched door, small golden flags on top. Clearly bigger and grander than the house.

Each building stands on its own small round grassy base. No hamsters, no text.
Plain solid flat magenta (#FF00FF) background filling the whole image, no checkerboard, no gradient,
no shadow cast on the background. Wide 2:1 image.
```

---

## 다른 분위기로 바꾸고 싶다면

위 프롬프트의 LEFT / RIGHT 설명만 바꿔 넣으세요.

| 분위기 | LEFT (굴) | RIGHT (궁전) |
|---|---|---|
| 버섯 마을 | `a cute red-capped mushroom cottage with white dots, round door and window` | `a grand castle made of several giant mushrooms with golden caps and flags` |
| 한옥 | `a tiny cute Korean hanok cottage with a curved tiled roof and paper sliding door` | `a cute miniature Korean palace (like Gyeongbokgung) with layered curved roofs and colorful dancheong patterns` |
| 디저트 | `a small cookie-and-cream house with frosting roof and candy door` | `a tall layered cake palace with strawberry towers and chocolate flags` |
| 동화 마을 | `a tiny storybook cottage with a thatched roof and flower boxes` | `a fairy-tale castle with pastel pink towers and golden spires` |
