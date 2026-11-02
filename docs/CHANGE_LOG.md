# CHANGE LOG — 햄스터 월드 투어

승인된 변경의 기록. 새 항목은 **맨 아래에 추가**하고 이전 항목은 지우거나 덮어쓰지 않는다.
현재 기준 요구사항은 [`MASTER_PRD.md`](MASTER_PRD.md). CHG-001~CHG-033은 옛 `prd-1.md`~`prd-33.md`(v0.1~v0.33, 보관 위치 `docs/archive/legacy-prd/`)에서 옮겨 적은 것이다.

- 유형: A 밸런스 · B UI/UX · C 기존 기능 수정 · D 버그 수정 · E 새 기능 · F 문서
- 상태: Proposed · Approved · In Progress · Implemented · Verified · Rejected
- **Verified**는 검증 기록이 실제로 남아 있는 항목에만 붙인다. CHG-001~CHG-023은 당시 검증 방법이 기록되지 않아 Implemented로 둔다.

---

## CHG-001
- Date: 2026-10-30
- Title: 최초 기획 (v0.1 초안)
- Type: E 새 기능
- Status: Implemented
- Related Requirements: SYS-001~SYS-012, REQ-001~REQ-063, REQ-110~REQ-112, NFR-001~NFR-005

### Reason
세계 수도 테마의 모노폴리 규칙 혼자 놀기 게임 기획.
### Before
없음.
### After
골든 햄스터 말 4종, 40칸 세계 수도 보드, 해바라기씨 화폐, 클래식 모노폴리 규칙(구매·경매·통행료·독점·균등 건설·케이지·저당·거래·파산), 카드 16+16장, 컴퓨터 3난이도, 저장/이어하기, 옵션 3종.
### Expected Impact
전체 게임.
### Validation
기록 없음.
### Implementation
`prd-1.md`.
### Remaining Issues
없음.

## CHG-002
- Date: 2026-10-30
- Title: 결정 사항 확정 (v0.2)
- Type: F 문서
- Status: Implemented
- Related Requirements: REQ-001, REQ-002, REQ-112

### Reason
초안의 미정 사항 결정.
### Before
통화·도시 배치·어려움 AI 거래 공격성 미정.
### After
통화 해바라기씨(원작 $ 수치 그대로), 도시 배치 확정(서울이 가장 비싼 칸), 거래 공격성 쉬움 1× · 보통 2× · 어려움 3×.
### Expected Impact
AI 거래, 보드 데이터.
### Validation
기록 없음.
### Implementation
`prd-2.md` §12.
### Remaining Issues
없음.

## CHG-003
- Date: 2026-10-30
- Title: 1차 구현과 구현 결정 (v0.3)
- Type: E 새 기능
- Status: Implemented
- Related Requirements: REQ-021, REQ-025, REQ-027~REQ-029, REQ-051, REQ-062, NFR-001~NFR-003

### Reason
기획 기반 첫 구현, 정해지지 않은 규칙 결정.
### Before
문서만 있음.
### After
정적 웹 앱 구현(`index.html`, `css/style.css`, `js/data.js`·`engine.js`·`ai.js`·`hamster.js`·`sound.js`·`ui.js`, `tests/sim.js`). 저당 땅 인수 시 10% 이자 후 저당 유지, 사람은 언제든 건설·저당, 사람 파산 시 즉시 종료, 총자산 계산식, 경매 진행 방식, 궁전 매각 시 굴 5채 값의 절반.
### Expected Impact
전체.
### Validation
`tests/sim.js` 작성 (당시 실행 결과 기록 없음).
### Implementation
`prd-3.md` §13~§14.
### Remaining Issues
없음.

## CHG-004
- Date: 2026-10-30
- Title: 화면 크기 개선 (v0.4)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: UI-003, UI-004

### Reason
"게임판과 말, 폰트가 너무 작다".
### Before
고정폭 영역 안 보드, 칸 글자 보드 폭 1.32%, 말 5.4%, 주사위 7.5%, 패널 폭 340px.
### After
보드가 화면 높이에 꽉 차게, 모서리 칸 비율 1.4, 칸 글자 1.85%, 말 7.6%, 주사위 9%, 패널 폭 400px.
### Expected Impact
레이아웃 CSS.
### Validation
기록 없음.
### Implementation
`prd-4.md` §15.
### Remaining Issues
없음.

## CHG-005
- Date: 2026-10-30
- Title: 칸 아이콘·국기·건물 3D 아이콘, 햄스터 이미지 슬롯 (v0.5)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-005, REQ-130, DATA-005

### Reason
그림 개선 (사용자 결정: AI 생성 햄스터 + 무료 3D 이모지).
### Before
시스템 이모지, 국기 이모지, CSS 도형 건물.
### After
Fluent Emoji 3D PNG 아이콘, flag-icons SVG 국기, 3D 집/성 아이콘. `assets/hamsters/<id>.png` 를 넣으면 자동 사용 (표정 -happy/-sad/-sleep 선택). 파일이 없으면 이모지·SVG로 대체.
### Expected Impact
`assets/`, 렌더링.
### Validation
기록 없음.
### Implementation
`prd-5.md` §16, `assets/LICENSES.md`, `assets/hamsters/PROMPTS.md`.
### Remaining Issues
없음.

## CHG-006
- Date: 2026-10-30
- Title: 햄스터 이미지 적용 (v0.6)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-130, DATA-005

### Reason
사용자가 만든 햄스터 시트 적용.
### Before
내장 SVG 햄스터.
### After
기본 4장 + 표정 12장(512×512 투명 PNG), 시트에 그려진 체크무늬 제거 도구 `tools/cut_hamsters.py`.
### Expected Impact
`assets/hamsters/`.
### Validation
기록 없음.
### Implementation
`prd-6.md` §17.
### Remaining Issues
없음.

## CHG-007
- Date: 2026-10-30
- Title: 도시 랜드마크 그림, 건설 연출 (v0.7)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-005, REQ-132

### Reason
칸 꾸미기와 건설 연출 추가.
### Before
랜드마크 없음, 건물 아이콘만 추가됨.
### After
22개 도시 칸에 랜드마크 3D 그림, 칸 위 공사 장면(크레인·망치·흙먼지, 약 1.2초).
### Expected Impact
`assets/landmarks/`, 건설 연출.
### Validation
기록 없음.
### Implementation
`prd-7.md` §18.
### Remaining Issues
없음.

## CHG-008
- Date: 2026-10-30
- Title: 입체 건물 (v0.8)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-132

### Reason
"줄 칸 건물도 크게, 입체적으로".
### Before
칸의 색 띠 안 평면 아이콘.
### After
칸 안쪽 가장자리에 서서 보드 가운데로 솟은 입체 건물, 그림자, 일어서는 연출.
### Expected Impact
건물 렌더링.
### Validation
기록 없음.
### Implementation
`prd-8.md` §19.
### Remaining Issues
없음.

## CHG-009
- Date: 2026-10-30
- Title: 건물 그림 교체 준비 (v0.9)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: DATA-005

### Reason
"건물 이미지가 투박하다".
### Before
3D 아이콘 건물.
### After
`assets/buildings/house.png`·`palace.png` 지원(없으면 아이콘), 자르기 도구 `tools/cut_buildings.py`, 공용 `tools/cut_sheet.py`(투명/체크무늬/단색 배경 판별).
### Expected Impact
건물 그림, 도구.
### Validation
기록 없음.
### Implementation
`prd-9.md` §20.
### Remaining Issues
없음.

## CHG-010
- Date: 2026-10-30
- Title: 건물 그림 적용 (v0.10)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: DATA-005, REQ-132

### Reason
사용자 생성 해바라기 테마 굴·궁전 적용.
### Before
아이콘 건물, 옛 CSS 도형 건물 스타일 잔재.
### After
새 그림 적용(원래 비율 유지), 옛 `.house`/`.hotel` 스타일이 초록/빨강 상자로 남던 문제 제거.
### Expected Impact
건물 렌더링.
### Validation
기록 없음.
### Implementation
`prd-10.md` §21.
### Remaining Issues
없음.

## CHG-011
- Date: 2026-10-30
- Title: 보드 확대, 메뉴 오른쪽 끝 배치 (v0.11)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: UI-003

### Reason
"게임판을 더 키워 주고 오른쪽 메뉴를 더 오른쪽으로".
### Before
정사각형 보드, 메뉴가 보드 바로 옆.
### After
넓은 화면에서 가로 최대 1.45배 직사각형 보드, 메뉴는 화면 오른쪽 끝, 보드 안 크기 단위는 가로·세로 평균의 1%.
### Expected Impact
`sizeBoard()`, CSS 크기 단위 `--u`.
### Validation
기록 없음.
### Implementation
`prd-11.md` §22.
### Remaining Issues
없음.

## CHG-012
- Date: 2026-10-30
- Title: 소유 칸 물들이기 (v0.12)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: UI-004

### Reason
"땅을 사면 그 말의 색으로 물들게".
### Before
주인 색 테두리 띠.
### After
칸 바탕이 주인 색 52%로 물듦(0.7초), 저당은 바랜 색 + 도장.
### Expected Impact
칸 렌더링.
### Validation
기록 없음.
### Implementation
`prd-12.md` §23.
### Remaining Issues
없음.

## CHG-013
- Date: 2026-10-30
- Title: 꾹 눌렀다 떼서 굴리기 (v0.13)
- Type: C 기존 기능 수정
- Status: Implemented
- Related Requirements: REQ-010

### Reason
"마우스를 눌렀다 떼는 걸로 조절".
### Before
버튼 클릭으로 굴림.
### After
누르는 동안 힘 게이지 핑퐁(약 1.1초 주기), 뗀 순간 힘(최소 12%)으로 던지는 연출. 눈은 무작위 유지.
### Expected Impact
굴리기 입력, 주사위 연출.
### Validation
기록 없음.
### Implementation
`prd-13.md` §24.
### Remaining Issues
없음.

## CHG-014
- Date: 2026-10-30
- Title: 할 일이 없으면 자동 턴 넘기기 (v0.14)
- Type: E 새 기능
- Status: Implemented
- Related Requirements: REQ-015

### Reason
"해야 할 동작이 없으면 자동으로 넘어가게".
### Before
항상 "턴 끝내기"를 눌러야 함.
### After
조건을 모두 만족하면 1.5초(빨리 감기 0.5초) 뒤 자동 종료, [바로 넘기기] / [잠깐 멈추기].
### Expected Impact
턴 종료 흐름.
### Validation
기록 없음.
### Implementation
`prd-14.md` §25.
### Remaining Issues
없음.

## CHG-015
- Date: 2026-10-30
- Title: 유리구슬 3D 주사위 (v0.15)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-133

### Reason
"유리 구슬처럼 투명한 주사위, 모션 개선".
### Before
평면 주사위.
### After
CSS 3D 반투명 유리 주사위, 힘에 따른 비행·회전·통통 튐(0.65~1.65초).
### Expected Impact
주사위 연출.
### Validation
기록 없음.
### Implementation
`prd-15.md` §26.
### Remaining Issues
없음.

## CHG-016
- Date: 2026-10-30
- Title: 주사위 면 그림 지원 (치즈 주사위) (v0.16)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-133, DATA-005

### Reason
"치즈 모양 주사위로".
### Before
유리구슬 주사위만.
### After
`assets/dice/face1~6.png` → `face.png` → 유리구슬 순으로 사용, 자르기 도구 `tools/cut_dice.py`.
### Expected Impact
주사위 그림.
### Validation
기록 없음.
### Implementation
`prd-16.md` §27, `assets/dice/PROMPTS.md`.
### Remaining Issues
없음.

## CHG-017
- Date: 2026-10-30
- Title: 치즈 주사위 그림 적용 (v0.17)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-133

### Reason
사용자 생성 치즈 주사위 6면 시트 적용.
### Before
면 그림 없음.
### After
`face1~6.png` 생성(눈 개수·배치 검수), `cut_dice.py`를 배경 색과 무관한 방식으로 변경.
### Expected Impact
주사위 그림.
### Validation
눈 개수·배치 육안 검수 기록.
### Implementation
`prd-17.md` §28.
### Remaining Issues
없음.

## CHG-018
- Date: 2026-10-30
- Title: 치즈 주사위 소리, 더블 표시 개선 (v0.18)
- Type: D 버그 수정 (오해를 부르는 표시)
- Status: Implemented
- Related Requirements: REQ-013, REQ-134

### Reason
"더블인데 다시 굴리지 않고 넘어간다" 신고.
### Before
케이지 탈출 더블·3연속 더블에서 다시 굴리지 않는 이유가 안 보임, 주사위가 비스듬해 윗면이 결과처럼 보임.
### After
결과 글자("🎲 3 + 3 = 6 · 더블!")와 이유 표시, 주사위 기울기 축소, 치즈 주사위 전용 말랑한 소리.
### Expected Impact
주사위 표시·소리.
### Validation
시드로 더블을 강제해 일반 더블 재굴림 정상 동작 재현 확인 (기록).
### Implementation
`prd-18.md` §29.
### Remaining Issues
없음.

## CHG-019
- Date: 2026-10-30
- Title: 치즈 주사위를 참고 시트에 맞춰 자연스럽게 (v0.19)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-133

### Reason
새 참고 시트 반영.
### Before
면 그림이 무겁고 큐브 모서리에 빈틈.
### After
새 면 텍스처, 치즈색 속심 큐브, 모서리 둥글기 18%. `cut_dice.py`가 가장 최근 원본과 시트 종류(1/6/18면)를 자동 판단.
### Expected Impact
주사위 그림, 도구.
### Validation
기록 없음.
### Implementation
`prd-19.md` §30.
### Remaining Issues
없음.

## CHG-020
- Date: 2026-10-30
- Title: 부드러운 주사위 모션, 가운데 해바라기씨 장식 (v0.20)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-133, UI-005

### Reason
주사위 모션 개선, 보드 가운데 꾸미기.
### Before
끊기는 속도 곡선, 최대 높이 48(화면 밖으로 나감), 가운데 빈 공간.
### After
구간별 곡선(포물선), 착지 눌림, 최대 높이 24, 0.9~1.8초. 가운데 해바라기씨 18개 장식(불투명도 38%, 둥실).
### Expected Impact
주사위·보드 가운데.
### Validation
기록 없음.
### Implementation
`prd-20.md` §31.
### Remaining Issues
없음.

## CHG-021
- Date: 2026-10-30
- Title: 해바라기씨 장식 조정 (v0.21)
- Type: A 밸런스(시각 값)
- Status: Implemented
- Related Requirements: UI-005

### Reason
장식 진하기·움직임 조정 요청.
### Before
불투명도 38%, 둥실둥실 움직임.
### After
불투명도 42%, 움직임 없음.
### Expected Impact
보드 가운데 장식.
### Validation
기록 없음.
### Implementation
`prd-21.md` §32.
### Remaining Issues
없음.

## CHG-022
- Date: 2026-10-30
- Title: 땅을 살 때 웃는 표정 (v0.22)
- Type: D 버그 수정
- Status: Implemented
- Related Requirements: REQ-131

### Reason
"땅을 살 때 슬픈 표정이 나온다".
### Before
돈이 나가면 항상 슬픈 얼굴.
### After
구매·낙찰·건설은 웃는 얼굴 + 동전 소리 (돈 이벤트 다음의 buy/build 이벤트로 판단).
### Expected Impact
`ui.js` 돈 이벤트 처리.
### Validation
기록 없음.
### Implementation
`prd-22.md` §33.
### Remaining Issues
없음.

## CHG-023
- Date: 2026-10-30
- Title: 주사위 아래 굴리기 버튼 (v0.23)
- Type: B UI/UX
- Status: Implemented
- Related Requirements: REQ-010, UI-005

### Reason
"굴리기 버튼을 주사위 아래에, 동글동글 입체적으로".
### Before
오른쪽 메뉴의 버튼.
### After
보드 가운데 주사위 아래 젤리 사탕 모양 버튼, 사람이 굴릴 수 있을 때만 표시.
### Expected Impact
굴리기 UI.
### Validation
기록 없음.
### Implementation
`prd-23.md` §34.
### Remaining Issues
없음.

## CHG-024
- Date: 2026-10-30
- Title: 찬스 카드 30장으로 확장 (v0.24)
- Type: E 새 기능
- Status: Verified
- Related Requirements: REQ-030, REQ-031

### Reason
"찬스카드의 종류를 다양하게".
### Before
찬스 16장.
### After
찬스 30장(c17~c30 추가, 새 효과 8종).
### Expected Impact
엔진 `drawCard`, `data.js`.
### Validation
`node tests/cards.js`(30장 강제 뽑기), `node tests/sim.js 100` 통과 기록.
### Implementation
`prd-24.md` §35, `tests/cards.js`.
### Remaining Issues
없음.

## CHG-025
- Date: 2026-10-30
- Title: 볼주머니 카드 30장, 공격 카드 (v0.25)
- Type: E 새 기능
- Status: Verified
- Related Requirements: REQ-030~REQ-032, REQ-113, DATA-002

### Reason
"볼주머니 카드도 다양하게, 상대방을 공격하는 패도".
### Before
볼주머니 16장, 공격 카드 없음.
### After
볼주머니 30장(공격 h17~h22, 일반 h23~h30), 대상 고르기 오버레이 `s.targetPick` + 행동 `pickTarget`.
### Expected Impact
엔진·AI·UI.
### Validation
`node tests/cards.js`(60장, 공격 카드는 대상 선택까지), `node tests/sim.js 100` 통과 기록.
### Implementation
`prd-25.md` §36.
### Remaining Issues
없음.

## CHG-026
- Date: 2026-11-02
- Title: 배경음악, 주사위 수학 문제 (v0.26)
- Type: E 새 기능
- Status: Verified
- Related Requirements: REQ-080~REQ-084, REQ-135, REQ-153

### Reason
"유쾌한 테마파크 느낌의 배경음악" / "주사위를 굴릴 때마다 답이 최대 12인 사칙연산 3지선다, 난이도별, 초등학생, 15초".
### Before
배경음악 없음, 바로 굴림.
### After
WebAudio 회전목마 왈츠(🎵 버튼, `bgm.mp3` 대체 지원). 굴리기 전 문제 창(난이도별 문제, 15초, 1·2·3 키), 오답이면 새 문제.
### Expected Impact
`sound.js`, `ui.js`, `index.html`.
### Validation
문제 생성기 종류별 5,000개 계산 검증, 헤드리스 Chrome에서 오답→새 문제→정답→이동 확인, `node tests/sim.js 30` 통과.
### Implementation
`prd-26.md` §37.
### Remaining Issues
배경음악은 직접 들어 보지 못함(합성 코드만 확인).

## CHG-027
- Date: 2026-11-02
- Title: 정답 = 주사위 숫자, 효과음 추가 (v0.27)
- Type: C 기존 기능 수정
- Status: Verified
- Related Requirements: REQ-081, REQ-084, REQ-134

### Reason
"주사위 숫자가 정답이 되게, 주사위 소리 10% 크게, 땅 구매·통행료·정답·오답 효과음".
### Before
정답 0~12 무작위, 오답 시 정답 공개.
### After
엔진 `peekDice`로 정답 = 주사위 합(2~12), 오답 시 정답 비공개. 주사위 소리 ×1.1, happy/sad/quizRight/quizWrong 소리.
### Expected Impact
`engine.js`(peekDice 추가), `sound.js`, `ui.js`.
### Validation
난이도×정답 2~12 각 2,000개 계산 검증, peekDice 1,000회 = 실제 굴림, 헤드리스 Chrome에서 정답과 주사위 합 일치 확인, `tests/sim.js 30`·`tests/cards.js` 통과.
### Implementation
`prd-27.md` §38.
### Remaining Issues
효과음은 직접 들어 보지 못함.

## CHG-028
- Date: 2026-11-02
- Title: 승리·패배 효과음과 연출 (v0.28)
- Type: E 새 기능
- Status: Verified
- Related Requirements: REQ-140

### Reason
"패배할 시 효과음, 승리할 시 효과음과 모션".
### Before
게임 종료 시 짧은 승리음만.
### After
승리(팡파르, 색종이·🌻, 왕관 햄스터), 패배(오르골, 먹구름·빗방울, 우는 햄스터), 게임마다 한 번, 결과 화면에서 배경음악 정지.
### Expected Impact
`ui.js`, `sound.js`, `css/style.css`.
### Validation
헤드리스 Chrome에서 승리·패배 화면 표시, 6초 뒤 연출 제거, "보드 보기" 후 재표시 시 반복 없음 확인.
### Implementation
`prd-28.md` §39.
### Remaining Issues
소리는 직접 들어 보지 못함.

## CHG-029
- Date: 2026-11-02
- Title: 카드 문제, 주사위 문제 3번 틀리면 기회 넘김 (v0.29)
- Type: E 새 기능
- Status: Verified
- Related Requirements: REQ-033, REQ-085, REQ-090, REQ-094, DATA-001~DATA-003

### Reason
"찬스=한국사, 볼주머니=상식 문제, 틀리면 카드 무효 / 주사위 문제 3번 틀리면 기회 넘김".
### Before
카드는 바로 적용, 주사위 문제는 무한 재도전.
### After
`js/questions.js`(한국사 46·상식 46), 오버레이 `s.cardQuiz` + `cardQuizAnswer`, 행동 `forfeitRoll`, 남은 기회 ❤️.
### Expected Impact
엔진·AI(안전장치)·UI.
### Validation
`node tests/quiz.js` 신설·통과, `tests/cards.js`·`tests/sim.js 50` 통과, 헤드리스 Chrome에서 카드 무효/발동·3회 오답 기회 넘김 확인.
### Implementation
`prd-29.md` §40.
### Remaining Issues
없음.

## CHG-030
- Date: 2026-11-02
- Title: 나쁜 카드 규칙, 텔레포트, 내 땅 건설, 통행료 표시, 세계 이벤트 (v0.30)
- Type: E 새 기능 + C 기존 기능 수정
- Status: Verified
- Related Requirements: REQ-002, REQ-022, REQ-091~REQ-093, REQ-100, REQ-101, REQ-113, REQ-120, REQ-121, UI-004, UI-005, DATA-001

### Reason
"나쁜 카드는 맞히면 무효·틀리면 발동 / 톱밥 휴게소를 텔레포트로 / 내 땅 도착 시 건설 / 건물 있으면 통행료 비싸게 / 5턴마다 폭등·폭락·축제·풍년·흉년".
### Before
틀리면 모든 카드 무효, 20번 칸 톱밥 휴게소(아무 일 없음), 내 땅 도착 시 아무 일 없음, 칸에 가격만 표시, 세계 이벤트 없음.
### After
카드를 먼저 공개하고 좋은/나쁜 카드별 결과 규칙, 쓰지 않은 카드는 덱 맨 아래로. 20번 칸 텔레포트(`phase: 'teleport'`). 내 땅 한 단계 건설(`phase: 'build'`, 독점·균등 불필요). 주인 있는 칸에 현재 통행료 표시. 5바퀴마다 세계 이벤트(`s.world`, `rentMult`).
### Expected Impact
`data.js`(20번 칸), `engine.js`, `ai.js`, `ui.js`, `sound.js`, `index.html`. 옛 옵션 이름 "톱밥 휴게소 상금" → "텔레포트 칸 상금".
### Validation
`node tests/quiz.js`(좋음/나쁨×맞힘/틀림, 텔레포트, 건설, 세계 이벤트 배율), `tests/cards.js`, `node tests/sim.js 100`(100판 모두 종료) 통과, 헤드리스 Chrome 화면 확인.
### Implementation
`prd-30.md` §41.
### Remaining Issues
통행료 상승폭은 원작 표 그대로(굴 1채 ≈ 5배) — 더 올릴지는 미정.

## CHG-031
- Date: 2026-11-02
- Title: 남의 땅 강제 매입 (v0.31)
- Type: E 새 기능
- Status: Verified
- Related Requirements: REQ-102, REQ-113, DATA-001, DATA-003

### Reason
"궁전을 짓기 전인 남의 땅에 가면 강제로 매입, 땅값+공사비보다 조금 비싸게".
### Before
통행료만 지불.
### After
통행료를 다 낸 뒤 `phase: 'takeover'`, 매입가 (땅값+공사비)×1.2(10 단위 올림), 원래 주인에게 지불, 건물 포함.
### Expected Impact
엔진·AI·UI·사운드.
### Validation
`node tests/quiz.js`(매입가, 땅·건물·돈 이동, 궁전·돈 부족 시 제안 없음, 그냥 두기), `node tests/sim.js 100`(99판 종료, 1판 걸음 제한), 헤드리스 Chrome 매입 확인.
### Implementation
`prd-31.md` §42. 이 작업 중 `prd-30.md` 생성 누락을 발견해 함께 복구.
### Remaining Issues
없음.

## CHG-032
- Date: 2026-11-02
- Title: 세계지도 배경, 시작 화면 제목 폰트 (v0.32)
- Type: B UI/UX
- Status: Verified
- Related Requirements: UI-001, UI-002, DATA-005

### Reason
"세계지도 위 햄스터 이미지를 화면 가득 반투명하게, 제목을 동글동글 귀여운 폰트로".
### Before
단색 그라데이션 배경, 제목 Jua.
### After
Natural Earth로 만든 `world-map.svg` + 햄스터 8마리 + 점선 경로(38%), `bg.png` 대체 지원, 도구 `tools/make_world_map.py`. 제목 카페24 써라운드(휴대폰 한 줄).
### Expected Impact
`index.html`, `ui.js`, `css/style.css`, `assets/background/`.
### Validation
헤드리스 Chrome에서 PC 시작·게임 화면, 390px 폭(가로 스크롤 없음) 확인.
### Implementation
`prd-32.md` §43.
### Remaining Issues
없음.

## CHG-033
- Date: 2026-11-02
- Title: 시작 화면 제목 글꼴·색 변경 (v0.33)
- Type: B UI/UX
- Status: Verified
- Related Requirements: UI-001

### Reason
"폰트랑 글씨 색깔 바꿔줘" — 견본 페이지에서 사용자가 선택.
### Before
카페24 써라운드, 오렌지.
### After
메이플스토리 Bold, 꿀 노랑 #ffd43b + 초코 테두리·그림자 #7a3f0c.
### Expected Impact
`css/style.css`, `assets/LICENSES.md`.
### Validation
헤드리스 Chrome에서 PC·휴대폰 화면, 배포 사이트에서 글꼴 로드·색 확인.
### Implementation
`prd-33.md` §44. GitHub Pages 배포 (커밋 5f7c243).
### Remaining Issues
없음.

## CHG-034
- Date: 2026-11-02
- Title: 문서 체계 이전 — Master PRD + Change Log
- Type: F 문서
- Status: Implemented
- Related Requirements: 전체 (ID 신설: SYS-001~012, REQ-*, UI-001~007, DATA-001~005, NFR-001~006)

### Reason
요청마다 PRD 사본(prd-N.md)이 쌓여 기준 문서가 흩어지는 문제 — 사용자가 "Web Game Development & PRD Management System" 규칙을 지정.
### Before
루트에 누적 사본 `prd-1.md`~`prd-33.md`(각 파일이 이전 전체 + 새 절), 최신 번호가 기준. 문서와 코드가 다른 곳이 일부 있었음(옛 §3.1 눈 깜빡임 등).
### After
`docs/MASTER_PRD.md`(현재 요구사항, 안정 ID), `docs/CHANGE_LOG.md`(CHG-001~), `docs/BUGS/`, `docs/FEATURES/`, `docs/AI_TASKS/`. 옛 PRD 33개는 `docs/archive/legacy-prd/`로 이동(내용 변경 없음). `CLAUDE.md`의 문서 작업 방식 갱신. 게임 코드는 바꾸지 않음.
### Expected Impact
문서 작업 방식. 게임 동작 영향 없음.
### Validation
Master PRD의 보드 40칸·통행료 표 22행·상수·카드 60장·AI 값·엔진 행동 이름을 코드에서 직접 뽑아 대조(일치). 대조 중 발견한 불일치는 BUG-001, KI-001~KI-004로 기록. 코드 변경이 없어 게임 테스트는 다시 돌리지 않음.
### Implementation
`docs/` 신설, `prd-*.md` → `docs/archive/legacy-prd/`, `CLAUDE.md`.
### Remaining Issues
BUG-001(창 등장 애니메이션 이름 충돌), KI-001~KI-004(옛 문서와 코드가 다른 연출·배치) — 결정 필요.

## CHG-035
- Date: 2026-11-02
- Title: 코드를 Master PRD에 맞춤 — 눈 깜빡임, 쳇바퀴 파산 연출, 휴대폰 하단 시트, BUG-001
- Type: D 버그 수정 (문서와 다른 구현 바로잡기)
- Status: Verified
- Related Requirements: REQ-130, UI-006, UI-007, DATA-005, BUG-001, KI-001~KI-004

### Reason
CHG-034에서 찾은 문서·코드 불일치에 대해 사용자 결정: "코드를 문서에 맞추고".
### Before
- 눈 깜빡임 없음 (숨쉬기만)
- 파산하면 말이 기울며 위로 사라짐 (0.8초)
- 휴대폰: 보드 아래로 패널을 한 열로 쌓음 (스크롤해야 보임)
- 모든 창이 건설 장면용 `rise` 애니메이션으로 열림 (BUG-001), `@keyframes spin` 중복
### After
- 눈 깜빡임: 약 0.4초마다 햄스터별 4.5% 확률로 0.15초 감기, 그중 20%는 두 번. 그림 햄스터는 새 `<id>-blink.png`(4장 생성), SVG 햄스터는 감은 눈 모양. 표정·케이지·파산 중엔 안 함
- 파산: 쳇바퀴가 나타나 돌고, 햄스터가 달리다 튕겨 떨어지며 사라짐 (1.5초 / 빨리 감기 0.45초) → 말 퇴장
- 휴대폰(≤900px): 패널을 하단 시트로 (보드 아래 남는 높이, 최소 200px, 손잡이로 82%까지 펼침)
- 건설 장면 keyframes 이름을 `rise-build`로 바꿔 창은 원래 `rise`(아래에서 부드럽게 올라옴)로 열림, 중복 `spin` 삭제
- KI-004는 다시 확인한 결과 코드가 이미 문서와 같아 변경 없음
### Expected Impact
화면 연출과 휴대폰 배치만. 규칙 엔진·AI·저장 데이터 변경 없음.
### Validation
- 헤드리스 Chrome (PC 1400×850): 6초 동안 깜빡임 12회 관찰, 감은 눈 프레임 4장 표시 확인, 실제 이벤트 경로로 파산 연출 재생(쳇바퀴 표시 → 떨어짐 → 쳇바퀴 제거 · 말 사라짐), 창의 애니메이션 이름이 `rise`
- 헤드리스 Chrome (휴대폰 390×844): 시트 `position: fixed`, 보드 아래 끝 y=380 < 시트 위 끝 y=394 (보드 안 가림), 손잡이로 펼치면 시트 높이 450 → 692px, 가로 스크롤 없음
- `node tests/quiz.js`, `node tests/cards.js`, `node tests/sim.js 30`, 모든 js `node --check` 통과
- 실제 휴대폰 기기·터치 스크롤 감각은 시험하지 않음
### Implementation
`js/hamster.js`(blink 프레임 감지), `js/ui.js`(깜빡임 루프, 파산 연출, 시트 높이 `--sheet-h`, 손잡이), `index.html`(시트 손잡이), `css/style.css`(깜빡임·쳇바퀴·하단 시트, keyframes 정리), 새 도구 `tools/make_blink.py`, 새 그림 `assets/hamsters/*-blink.png` 4장. 함께: `.gitignore`에 `*.pdf`, `*.pptx` 추가 (발표 자료를 공개 저장소에 올리지 않음 — 사용자 요청).
### Remaining Issues
없음.
