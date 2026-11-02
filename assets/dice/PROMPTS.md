# 치즈 주사위 이미지 만들기

게임의 주사위는 3D 정육면체라서, **주사위 "면" 그림**을 만들어 넣으면 그 그림을 6개 면에 입혀서 그대로 데굴데굴 굴립니다.
만든 이미지를 `assets/dice/원본/` 에 넣고 Claude에게 "주사위 이미지 넣었어"라고 말하면 잘라서 적용해 드립니다.
(직접 하려면 `python tools/cut_dice.py`)

이미지가 없으면 지금의 유리구슬 주사위가 그대로 나옵니다.

| 방식 | 만들 그림 | 장점 | 주의 |
|---|---|---|---|
| **A. 추천** | 눈이 없는 치즈 면 **1장** | 눈은 게임이 치즈 구멍처럼 그려서 숫자가 항상 정확 | 6면이 같은 질감 |
| B | 눈까지 그린 면 **6장** (1~6, 한 장에 3×2) | 면마다 모양이 달라 더 실감 남 | AI가 눈 개수·배치를 틀리는 일이 잦아 꼭 확인 필요 |

공통 팁
- 햄스터 이미지(예: `assets/hamsters/sunflower.png`)를 **첨부**하면 그림체가 맞습니다.
- 배경은 "투명" 대신 **단색 마젠타(#FF00FF)** 로 요청하세요. (투명을 요청하면 AI가 회색 체크무늬를 그려 넣는 경우가 많음)
- 면은 **정면에서 똑바로 본 평평한 정사각형**이어야 합니다. 비스듬한 입체 주사위 그림은 면에 입힐 수 없어요.

---

## A. 눈 없는 치즈 면 1장 (추천)

```
Using the attached hamster image only as a style reference (same soft 3D toy-like render, warm pastel lighting),
create a single square cheese die face for use as a game texture, viewed perfectly straight-on
(flat, orthographic, no perspective, no tilt).
A slab of bright golden-yellow cheese like Emmental or Gouda: smooth slightly waxy surface with soft highlights,
gently rounded corners and a soft beveled edge with a slightly deeper orange rind along the border.
Only a few tiny natural cheese holes near the corners and edges; the middle area must be smooth and empty
(no dots, no numbers, no pips — they will be added by the game).
The face fills almost the entire image with a thin margin.
Plain solid flat magenta (#FF00FF) background around it, no shadow, no checkerboard, no text. Square 1:1.
```

## B. 눈까지 그린 6면 (한 장, 가로 3 × 세로 2)

```
Using the attached hamster image only as a style reference (same soft 3D toy-like render, warm pastel lighting),
create a game texture sheet of exactly six square cheese die faces arranged in a 3 x 2 grid with even gaps,
each face viewed perfectly straight-on (flat, orthographic, no perspective).
Each face is a slab of bright golden-yellow cheese like Emmental: smooth waxy surface, rounded corners,
soft beveled edge with a slightly deeper orange rind. The pips are round, deep cheese holes
arranged exactly like a standard die:
top row left to right = 1, 2, 3 ; bottom row left to right = 4, 5, 6.
1: one large hole in the center. 2: two holes on a diagonal. 3: three holes on a diagonal.
4: four holes in the corners. 5: four corners plus center. 6: two vertical columns of three.
No other holes, no numbers, no text.
Plain solid flat magenta (#FF00FF) background between and around the faces, no shadow, no checkerboard.
Wide 3:2 image.
```

> B로 만들었다면 각 면의 구멍 개수와 배치가 정확한지 꼭 확인하세요. 틀린 면이 있으면 다시 생성하는 게 좋습니다.

---

## 다른 치즈 느낌

A·B 프롬프트의 치즈 설명 부분만 바꿔 넣으면 됩니다.

| 느낌 | 바꿔 넣을 문구 |
|---|---|
| 체다 | `a slab of rich orange cheddar cheese with a smooth matte surface` |
| 브리 | `a soft creamy white brie cheese with a fluffy white rind border` |
| 만화 치즈 | `a cartoon-style bright yellow cheese with bold clean shading, like a children's game` |
| 고르곤졸라 | `pale cream cheese with soft blue-green marbled veins` |
