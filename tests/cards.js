// 찬스·볼주머니 카드를 한 장씩 강제로 뽑아 효과가 오류 없이 적용되는지 확인
// 실행: node tests/cards.js
const E = require('../js/engine.js');
const AI = require('../js/ai.js'); // 현금 마련·거래 판단 훅 등록 + 공격 대상 고르기
const { CARDS, BOARD } = require('../js/data.js');

// 다음 주사위가 [1, 1]이 되는 시드 찾기 (출발 칸 기준 +2 칸에 착지)
function seedForSnakeEyes(start) {
  for (let s = start >>> 0; ; s = (s + 1) >>> 0) {
    const t = { seed: s };
    if (Math.floor(E.rand(t) * 6) === 0 && Math.floor(E.rand(t) * 6) === 0) return s;
  }
}

let failed = 0;
for (const deck of ['chance', 'chest']) {
  console.log(`== ${deck === 'chance' ? '해바라기씨 찬스' : '볼주머니'} (${CARDS[deck].length}장) ==`);
  for (const card of CARDS[deck]) {
    const players = [0, 1, 2, 3].map((k) => ({ name: `P${k}`, hamster: k, isAI: true, difficulty: 'normal' }));
    const s = E.newGame({ players, seed: 42 });
    const me = s.players[s.current];
    const opp = s.players[(me.id + 1) % 4];
    // 땅·건물을 나눠 줘서 보너스·세금·철거 효과가 실제로 동작하게
    [1, 3, 6, 15].forEach((i, k) => { s.props[i].owner = k % 2 ? me.id : opp.id; });
    for (const i of [37, 39]) { s.props[i].owner = opp.id; s.props[i].houses = 2; s.bankHouses -= 2; }
    s.decks[deck] = [card.id, ...s.decks[deck].filter((id) => id !== card.id)];
    me.pos = deck === 'chance' ? 5 : 0; // +2 → 7번 찬스 / 2번 볼주머니
    s.seed = seedForSnakeEyes(s.seed);
    const before = s.players.map((p) => p.money);
    const houses = () => Object.values(s.props).reduce((n, p) => n + p.houses, 0);
    const housesBefore = houses();
    const logStart = s.log.length;
    let err = E.act(s, me.id, { type: 'roll' });
    let attack = '';
    if (!err && s.targetPick) {
      const tp = s.targetPick;
      AI.step(s, me.id); // 컴퓨터가 대상 고르기
      attack = ` → 공격 대상 ${tp.targets.map((t) => 'P' + t).join('/')} 중 선택${s.targetPick ? ' (실패: 대기 상태 남음)' : ''}`;
      if (s.targetPick) err = 'targetPick not resolved';
    }
    const lines = s.log.slice(logStart).map((l) => l.text);
    const ok = !err && lines.some((l) => l.includes(card.text));
    if (!ok) failed++;
    const delta = s.players.map((p, k) => p.money - before[k]);
    const hd = houses() - housesBefore;
    console.log(`${ok ? 'OK ' : 'FAIL'} ${card.id.padEnd(4)} → 위치 ${BOARD[me.pos].name}, 돈 변화 [${delta.join(', ')}]${hd ? `, 건물 ${hd}` : ''}${attack}${err ? ' 오류: ' + err : ''}`);
  }
}
console.log(failed ? `${failed}장 실패` : `카드 ${CARDS.chance.length + CARDS.chest.length}장 모두 정상`);
process.exit(failed ? 1 : 0);
