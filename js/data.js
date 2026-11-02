// 햄스터 월드 투어 — 정적 게임 데이터 (보드, 카드, 햄스터)
(function (root) {
  'use strict';

  const GROUPS = {
    brown:    { name: '갈색 · 히말라야/초원', color: '#8b5a3c', members: [1, 3] },
    lightblue:{ name: '하늘색 · 동남아시아', color: '#8fd3f0', members: [6, 8, 9] },
    pink:     { name: '분홍 · 아프리카', color: '#e86fb0', members: [11, 13, 14] },
    orange:   { name: '주황 · 남미', color: '#f39233', members: [16, 18, 19] },
    red:      { name: '빨강 · 남유럽', color: '#e2463f', members: [21, 23, 24] },
    yellow:   { name: '노랑 · 서유럽', color: '#f4d03f', members: [26, 27, 29] },
    green:    { name: '초록 · 오세아니아/북미', color: '#2fa45a', members: [31, 32, 34] },
    darkblue: { name: '남색 · 동아시아', color: '#2c4fb5', members: [37, 39] },
    airport:  { name: '국제공항', color: '#5b6573', members: [5, 15, 25, 35] },
    util:     { name: '공공시설', color: '#7d8a96', members: [12, 28] },
  };

  // rent: [기본, 굴1, 굴2, 굴3, 굴4, 궁전]
  function city(name, country, flag, group, price, rent, house) {
    return { type: 'prop', name, country, flag, group, price, rent, house, mortgage: price / 2 };
  }

  const BOARD = [
    { type: 'go', name: '출발', icon: '🏁' },
    city('카트만두', '네팔', '🇳🇵', 'brown', 60, [2, 10, 30, 90, 160, 250], 50),
    { type: 'chest', name: '볼주머니 카드', icon: '🐹' },
    city('울란바토르', '몽골', '🇲🇳', 'brown', 60, [4, 20, 60, 180, 320, 450], 50),
    { type: 'tax', name: '소득세', icon: '💸', amount: 200 },
    { type: 'airport', name: '인천국제공항', icon: '✈️', group: 'airport', price: 200, mortgage: 100 },
    city('하노이', '베트남', '🇻🇳', 'lightblue', 100, [6, 30, 90, 270, 400, 550], 50),
    { type: 'chance', name: '해바라기씨 찬스', icon: '🌻' },
    city('방콕', '태국', '🇹🇭', 'lightblue', 100, [6, 30, 90, 270, 400, 550], 50),
    city('자카르타', '인도네시아', '🇮🇩', 'lightblue', 120, [8, 40, 100, 300, 450, 600], 50),
    { type: 'jail', name: '햄스터 케이지', icon: '🔒' },
    city('카이로', '이집트', '🇪🇬', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
    { type: 'util', name: '쳇바퀴 발전소', icon: '⚡', group: 'util', price: 150, mortgage: 75 },
    city('나이로비', '케냐', '🇰🇪', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
    city('프리토리아', '남아공', '🇿🇦', 'pink', 160, [12, 60, 180, 500, 700, 900], 100),
    { type: 'airport', name: '두바이국제공항', icon: '✈️', group: 'airport', price: 200, mortgage: 100 },
    city('리마', '페루', '🇵🇪', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
    { type: 'chest', name: '볼주머니 카드', icon: '🐹' },
    city('부에노스아이레스', '아르헨티나', '🇦🇷', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
    city('브라질리아', '브라질', '🇧🇷', 'orange', 200, [16, 80, 220, 600, 800, 1000], 100),
    { type: 'teleport', name: '텔레포트', icon: '🌀' },
    city('아테네', '그리스', '🇬🇷', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
    { type: 'chance', name: '해바라기씨 찬스', icon: '🌻' },
    city('로마', '이탈리아', '🇮🇹', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
    city('마드리드', '스페인', '🇪🇸', 'red', 240, [20, 100, 300, 750, 925, 1100], 150),
    { type: 'airport', name: '히드로공항', icon: '✈️', group: 'airport', price: 200, mortgage: 100 },
    city('베를린', '독일', '🇩🇪', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
    city('파리', '프랑스', '🇫🇷', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
    { type: 'util', name: '급수기 상수도', icon: '💧', group: 'util', price: 150, mortgage: 75 },
    city('런던', '영국', '🇬🇧', 'yellow', 280, [24, 120, 360, 850, 1025, 1200], 150),
    { type: 'gotojail', name: '케이지로 가시오', icon: '👮' },
    city('캔버라', '호주', '🇦🇺', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
    city('오타와', '캐나다', '🇨🇦', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
    { type: 'chest', name: '볼주머니 카드', icon: '🐹' },
    city('워싱턴 D.C.', '미국', '🇺🇸', 'green', 320, [28, 150, 450, 1000, 1200, 1400], 200),
    { type: 'airport', name: 'JFK공항', icon: '✈️', group: 'airport', price: 200, mortgage: 100 },
    { type: 'chance', name: '해바라기씨 찬스', icon: '🌻' },
    city('도쿄', '일본', '🇯🇵', 'darkblue', 350, [35, 175, 500, 1100, 1300, 1500], 200),
    { type: 'tax', name: '사치세', icon: '💎', amount: 100 },
    city('서울', '대한민국', '🇰🇷', 'darkblue', 400, [50, 200, 600, 1400, 1700, 2000], 200),
  ];

  // 도시별 랜드마크 이름 (그림: assets/landmarks/<국가코드>.png)
  const LANDMARKS = {
    카트만두: "히말라야 설산", 울란바토르: "초원의 게르", 하노이: "쌀국수", 방콕: "황금 사원", 자카르타: "이스티클랄 모스크",
    카이로: "사막의 낙타", 나이로비: "사파리 기린", 프리토리아: "초원의 사자", 리마: "안데스 라마", 부에노스아이레스: "탱고",
    브라질리아: "아마존 앵무새", 아테네: "파르테논 신전", 로마: "콜로세움", 마드리드: "축구", 베를린: "프레첼",
    파리: "크루아상", 런던: "근위병", 캔버라: "캥거루", 오타와: "단풍잎", "워싱턴 D.C.": "흰머리수리",
    도쿄: "후지산", 서울: "N서울타워",
  };
  for (const sp of BOARD) if (sp.type === "prop") sp.landmark = LANDMARKS[sp.name];

  const CARDS = {
    chance: [
      { id: 'c1', text: '출발 칸으로 이동! (🌻200 수령)', act: { type: 'advance', to: 0 } },
      { id: 'c2', text: '서울로 이동하세요.', act: { type: 'advance', to: 39 } },
      { id: 'c3', text: '마드리드로 이동하세요. 출발을 지나면 🌻200 수령.', act: { type: 'advance', to: 24 } },
      { id: 'c4', text: '카이로로 이동하세요. 출발을 지나면 🌻200 수령.', act: { type: 'advance', to: 11 } },
      { id: 'c5', text: '가장 가까운 공항으로 이동! 주인이 있으면 통행료 2배.', act: { type: 'nearestAirport' } },
      { id: 'c6', text: '가장 가까운 공항으로 이동! 주인이 있으면 통행료 2배.', act: { type: 'nearestAirport' } },
      { id: 'c7', text: '가장 가까운 공공시설로 이동! 주인이 있으면 주사위 × 10 지불.', act: { type: 'nearestUtil' } },
      { id: 'c8', text: '인천국제공항으로 이동하세요. 출발을 지나면 🌻200 수령.', act: { type: 'advance', to: 5 } },
      { id: 'c9', text: '은행 배당금 🌻50 수령!', act: { type: 'money', amount: 50 } },
      { id: 'c10', text: '케이지 탈출권! (필요할 때까지 보관)', act: { type: 'jailFree' } },
      { id: 'c11', text: '뒤로 3칸 이동하세요.', act: { type: 'back3' } },
      { id: 'c12', text: '케이지로 직행! 출발을 지나도 🌻200을 받지 못합니다.', act: { type: 'gotoJail' } },
      { id: 'c13', text: '일반 수리비: 굴당 🌻25, 궁전당 🌻100 지불.', act: { type: 'repairs', house: 25, hotel: 100 } },
      { id: 'c14', text: '쳇바퀴 과속 벌금 🌻15.', act: { type: 'money', amount: -15 } },
      { id: 'c15', text: '모임 회장 당선! 각 플레이어에게 🌻50씩 지급.', act: { type: 'payEach', amount: 50 } },
      { id: 'c16', text: '대출 만기! 🌻150 수령.', act: { type: 'money', amount: 150 } },
      // ---- 햄스터 월드 투어 전용 찬스카드 (prd-24) ----
      { id: 'c17', text: '벚꽃 구경 가자! 도쿄로 이동하세요. 출발을 지나면 🌻200 수령.', act: { type: 'advance', to: 37 } },
      { id: 'c18', text: '크루아상이 먹고 싶어! 파리로 이동하세요. 출발을 지나면 🌻200 수령.', act: { type: 'advance', to: 27 } },
      { id: 'c19', text: '라마를 만나러 리마로 이동하세요. 출발을 지나면 🌻200 수령.', act: { type: 'advance', to: 16 } },
      { id: 'c20', text: '케이지 견학! 햄스터 케이지로 이동해 구경만 해요. (갇히지 않음)', act: { type: 'advance', to: 10 } },
      { id: 'c21', text: '쳇바퀴 전력질주! 앞으로 3칸 이동하세요.', act: { type: 'forward', n: 3 } },
      { id: 'c22', text: '바람을 타고 휘잉~ 앞으로 5칸 이동하세요.', act: { type: 'forward', n: 5 } },
      { id: 'c23', text: '해바라기 축제! 모든 햄스터가 은행에서 🌻50씩 받아요.', act: { type: 'allCollect', amount: 50 } },
      { id: 'c24', text: '세계여행 무료 항공권! 가장 가까운 공항으로 이동. 주인이 있어도 통행료를 내지 않아요.', act: { type: 'nearestAirportFree' } },
      { id: 'c25', text: '해바라기씨 복권! 주사위를 굴려 나온 수 × 🌻20을 받아요.', act: { type: 'diceBonus', mult: 20 } },
      { id: 'c26', text: '부동산 왕 보너스! 가진 땅 1개당 🌻15을 받아요.', act: { type: 'perProperty', amount: 15 } },
      { id: 'c27', text: '부자 햄스터 세금! 총자산의 5%를 은행에 내요. (최대 🌻200)', act: { type: 'wealthTax', rate: 0.05, max: 200 } },
      { id: 'c28', text: '착한 햄스터! 가장 가난한 햄스터에게 🌻60을 나눠 줘요.', act: { type: 'giveToPoorest', amount: 60 } },
      { id: 'c29', text: '볼주머니가 근질근질! 볼주머니 카드를 한 장 더 뽑으세요.', act: { type: 'drawChest' } },
      { id: 'c30', text: '쳇바퀴가 삐걱삐걱… 수리비 🌻30을 내요.', act: { type: 'money', amount: -30 } },
    ],
    chest: [
      { id: 'h1', text: '출발 칸으로 이동! (🌻200 수령)', act: { type: 'advance', to: 0 } },
      { id: 'h2', text: '은행 실수로 🌻200 수령!', act: { type: 'money', amount: 200 } },
      { id: 'h3', text: '병원비 🌻50 지불.', act: { type: 'money', amount: -50 } },
      { id: 'h4', text: '해바라기씨 판매 수익 🌻50!', act: { type: 'money', amount: 50 } },
      { id: 'h5', text: '케이지 탈출권! (필요할 때까지 보관)', act: { type: 'jailFree' } },
      { id: 'h6', text: '케이지로 직행! 출발을 지나도 🌻200을 받지 못합니다.', act: { type: 'gotoJail' } },
      { id: 'h7', text: '휴가 적금 만기! 🌻100 수령.', act: { type: 'money', amount: 100 } },
      { id: 'h8', text: '세금 환급 🌻20.', act: { type: 'money', amount: 20 } },
      { id: 'h9', text: '생일 축하해요! 각 플레이어에게 🌻10씩 받습니다.', act: { type: 'collectEach', amount: 10 } },
      { id: 'h10', text: '생명보험 만기! 🌻100 수령.', act: { type: 'money', amount: 100 } },
      { id: 'h11', text: '병원비 🌻100 지불.', act: { type: 'money', amount: -100 } },
      { id: 'h12', text: '학비 🌻50 지불.', act: { type: 'money', amount: -50 } },
      { id: 'h13', text: '상담료 🌻25 수령.', act: { type: 'money', amount: 25 } },
      { id: 'h14', text: '거리 수리비: 굴당 🌻40, 궁전당 🌻115 지불.', act: { type: 'repairs', house: 40, hotel: 115 } },
      { id: 'h15', text: '귀여움 대회 2등! 🌻10 수령.', act: { type: 'money', amount: 10 } },
      { id: 'h16', text: '유산 상속 🌻100 수령!', act: { type: 'money', amount: 100 } },
      // ---- 공격 카드: 대상 햄스터를 골라서 사용 (prd-25) ----
      { id: 'h17', text: '⚔️ 볼주머니 습격! 원하는 햄스터에게서 🌻100을 빼앗아요.', act: { type: 'attack', kind: 'steal', amount: 100 } },
      { id: 'h18', text: '⚔️ 해바라기씨 몰래 먹기! 원하는 햄스터 현금의 10%를 가져와요. (최대 🌻200)', act: { type: 'attack', kind: 'stealPct', rate: 0.1, max: 200 } },
      { id: 'h19', text: '⚔️ 케이지 신고! 원하는 햄스터를 햄스터 케이지로 보내요.', act: { type: 'attack', kind: 'jail' } },
      { id: 'h20', text: '⚔️ 쳇바퀴 고장 내기! 원하는 햄스터가 은행에 수리비 🌻80을 내요.', act: { type: 'attack', kind: 'fine', amount: 80 } },
      { id: 'h21', text: '⚔️ 굴 철거반 출동! 원하는 햄스터의 굴 1채를 철거해요. (돌려받는 돈 없음)', act: { type: 'attack', kind: 'demolish' } },
      { id: 'h22', text: '⚔️ 뒤로 가! 원하는 햄스터를 뒤로 3칸 보내요. (도착 칸 효과 없음)', act: { type: 'attack', kind: 'pushBack', n: 3 } },
      // ---- 그 밖의 새 볼주머니 카드 ----
      { id: 'h23', text: '해바라기씨 대풍년! 주사위를 굴려 나온 수 × 🌻15을 받아요.', act: { type: 'diceBonus', mult: 15 } },
      { id: 'h24', text: '햄스터 친구 초대! 각 플레이어에게 🌻20씩 받아요.', act: { type: 'collectEach', amount: 20 } },
      { id: 'h25', text: '여행 마일리지! 가진 공항 1개당 🌻25을 받아요.', act: { type: 'perProperty', amount: 25, kind: 'airport' } },
      { id: 'h26', text: '털 손질 미용실 🌻40을 내요.', act: { type: 'money', amount: -40 } },
      { id: 'h27', text: '해바라기씨 찬스 카드를 한 장 뽑으세요!', act: { type: 'drawChance' } },
      { id: 'h28', text: '공짜 산책! 가장 가까운 공공시설로 이동. 주인이 있어도 이용료를 내지 않아요.', act: { type: 'nearestUtilFree' } },
      { id: 'h29', text: '볼주머니 저금통을 열었더니 🌻75!', act: { type: 'money', amount: 75 } },
      { id: 'h30', text: '간식 나눠 먹기! 모든 햄스터에게 🌻15씩 줘요.', act: { type: 'payEach', amount: 15 } },
    ],
  };

  const HAMSTERS = [
    { id: 'sunflower', name: '해바라기', color: '#f2b705', accessory: 'sunflower' },
    { id: 'bori', name: '보리', color: '#e0474c', accessory: 'bow' },
    { id: 'kongtteok', name: '콩떡', color: '#3d7be0', accessory: 'hat' },
    { id: 'ttangkong', name: '땅콩', color: '#2fa45a', accessory: 'glasses' },
  ];

  const CONST = {
    START_MONEY: 1500,
    GO_SALARY: 200,
    JAIL_FINE: 50,
    JAIL_POS: 10,
    BANK_HOUSES: 32,
    BANK_HOTELS: 12,
  };

  const api = { GROUPS, BOARD, CARDS, HAMSTERS, CONST };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameData = api;
})(this);
