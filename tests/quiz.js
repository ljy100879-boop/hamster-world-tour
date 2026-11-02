// 문제 관련 엔진 흐름 확인: 카드 문제(cardQuiz) 맞힘/틀림, 주사위 기회 넘기기(forfeitRoll), peekDice
// 실행: node tests/quiz.js
const E = require('../js/engine.js');
require('../js/ai.js');
const Q = require('../js/questions.js');

let failed = 0;
const check = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) failed++; };

// 다음 주사위가 [a, b] 가 되는 시드
function seedFor(start, a, b) {
  for (let s = start >>> 0; ; s = (s + 1) >>> 0) {
    const d = E.peekDice({ seed: s });
    if (d[0] === a && d[1] === b) return s;
  }
}
let H = 0;
function game() {
  const players = [{ name: '나', hamster: 0, isAI: false }].concat([1, 2, 3].map((k) => ({ name: `P${k}`, hamster: k, isAI: true, difficulty: 'normal' })));
  const s = E.newGame({ players, seed: 7 });
  H = s.players.findIndex((p) => !p.isAI); // 순서 정하기로 섞이므로 사람 위치를 찾음
  s.current = H;
  s.phase = 'preRoll';
  return s;
}

console.log('== peekDice 는 실제 굴림과 같다 ==');
{
  const s = game();
  for (let k = 0; k < 200; k++) {
    s.seed = (s.seed * 7 + k) >>> 0;
    const pk = E.peekDice(s), seed = s.seed;
    s.phase = 'preRoll'; s.rollAgain = false; s.players[H].inJail = false; s.players[H].pos = 0; s.cardQuiz = null; s.debts = [];
    E.act(s, H, { type: 'roll' });
    if (String(s.dice) !== String(pk)) { check(false, `seed ${seed}: peek ${pk} vs roll ${s.dice}`); break; }
    s.current = H;
  }
  check(true, '200번 비교');
}

const { CARDS, BOARD } = require('../js/data.js');
for (const [deck, target] of [['chance', 7], ['chest', 17]]) {
  const goodId = CARDS[deck].find((c) => !E.isBadCard(c) && c.act.type === 'money').id;
  const badId = CARDS[deck].find((c) => E.isBadCard(c) && c.act.type === 'money').id;
  for (const [cardId, bad] of [[goodId, false], [badId, true]]) {
    for (const correct of [true, false]) {
      const fire = bad ? !correct : correct;
      console.log(`== ${deck} ${bad ? '나쁜' : '좋은'} 카드(${cardId}), 문제 ${correct ? '맞힘' : '틀림'} → ${fire ? '발동' : '무효'} ==`);
      const s = game();
      const me = s.players[H];
      s.decks[deck] = [cardId, ...s.decks[deck].filter((id) => id !== cardId)];
      s.seed = seedFor(s.seed, 1, 2); // 1+2=3 (더블 아님)
      me.pos = target - 3;
      const deckLen = s.decks[deck].length;
      E.act(s, H, { type: 'roll' });
      check(s.cardQuiz && s.cardQuiz.pid === H && s.cardQuiz.deck === deck && s.cardQuiz.id === cardId && s.cardQuiz.bad === bad, '문제 대기 상태 (카드·좋고 나쁨 기록)');
      check(E.actor(s) === H, '사람이 행동할 차례');
      check(E.act(s, H, { type: 'endTurn' }) !== '', '문제를 풀기 전에는 턴을 끝낼 수 없음');
      s.events = [];
      const money = me.money;
      check(E.act(s, H, { type: 'cardQuizAnswer', correct }) === '', '답 제출 성공');
      check(!s.cardQuiz, '문제 대기 상태 해제');
      check(s.events.some((e) => e.type === 'card') === fire, fire ? '카드 발동' : '카드 안 뽑음');
      check(fire ? me.money !== money : me.money === money, fire ? '돈이 바뀜' : '돈 그대로');
      check(fire || s.events.some((e) => e.type === 'cardVoid' && e.avoided === bad), fire ? '—' : `cardVoid 이벤트 (avoided=${bad})`);
      check(s.decks[deck].length === deckLen && s.decks[deck][deckLen - 1] === cardId, '카드는 덱 맨 아래로');
    }
  }
}

console.log('== 텔레포트 ==');
{
  const s = game();
  const me = s.players[H];
  s.seed = seedFor(s.seed, 1, 2);
  me.pos = 17;
  E.act(s, H, { type: 'roll' });
  check(s.phase === 'teleport' && E.actor(s) === H, '텔레포트 칸 도착 → 칸 고르기 단계');
  check(E.act(s, H, { type: 'roll' }) !== '' && E.act(s, H, { type: 'endTurn' }) !== '', '고르기 전에는 굴리기·턴 끝 불가');
  const money = me.money;
  check(E.act(s, H, { type: 'teleport', to: 1 }) === '' && me.pos === 1, '1번 칸으로 순간이동');
  check(me.money === money + 200, '출발을 지나 🌻200');
  check(s.phase === 'buy' && s.pendingBuy === 1, '빈 땅이면 구매 단계');
}
{
  const s = game();
  s.seed = seedFor(s.seed, 1, 2); s.players[H].pos = 17;
  E.act(s, H, { type: 'roll' });
  check(E.act(s, H, { type: 'teleport', to: 20 }) === '' && s.phase === 'postRoll' && s.players[H].pos === 20, '그대로 있기');
}

console.log('== 내 땅에 도착하면 건물 짓기 ==');
{
  const s = game();
  const me = s.players[H];
  s.props[3].owner = H; // 같은 색을 다 갖지 않아도
  s.seed = seedFor(s.seed, 1, 2);
  me.pos = 0;
  const rent0 = E.calcRent(s, 3, 7);
  E.act(s, H, { type: 'roll' });
  check(s.phase === 'build' && s.pendingBuild === 3, '건물 짓기 단계');
  const money = me.money;
  check(E.act(s, H, { type: 'landBuild' }) === '' && s.props[3].houses === 1, '굴 1채 건설');
  check(me.money === money - BOARD[3].house, '건설비 지불');
  check(E.calcRent(s, 3, 7) > rent0 * 2, `통행료 상승 ${rent0} → ${E.calcRent(s, 3, 7)}`);
  check(s.phase === 'postRoll', '건설 후 턴 마무리 단계');
}
{
  const s = game();
  s.props[3].owner = H;
  s.seed = seedFor(s.seed, 1, 2); s.players[H].pos = 0;
  E.act(s, H, { type: 'roll' });
  check(E.act(s, H, { type: 'skipBuild' }) === '' && s.phase === 'postRoll' && s.props[3].houses === 0, '안 짓기');
}

console.log('== 내 땅인데 지을 수 없으면 이유 알림 ==');
for (const [label, setup, pos, expect] of [
  ['공항', (s) => { s.props[5].owner = H; }, 5, '공항·공공시설'],
  ['저당', (s) => { s.props[3].owner = H; s.props[3].mortgaged = true; }, 3, '저당'],
  ['돈 부족', (s) => { s.props[3].owner = H; s.players[H].money = 20; }, 3, '해바라기씨가 부족'],
  ['궁전 완성', (s) => { s.props[3].owner = H; s.props[3].houses = 5; s.bankHotels--; }, 3, '궁전까지'],
  ['은행 굴 없음', (s) => { s.props[3].owner = H; s.bankHouses = 0; }, 3, '굴이 다 떨어졌'],
]) {
  const s = game();
  setup(s);
  s.seed = seedFor(s.seed, 1, 2);
  s.players[H].pos = pos - 3;
  if (s.players[H].pos < 0) s.players[H].pos += 40;
  E.act(s, H, { type: 'roll' });
  const ev = s.events.find((e) => e.type === 'buildBlocked');
  check(s.phase === 'postRoll' && ev && ev.pos === pos && ev.reason.includes(expect) && s.log.some((l) => l.text.includes('지을 수 없어요')), `${label}: 건설 단계 없이 이유 "${ev && ev.reason}"`);
}
{
  const s = game();
  const ai = (H + 1) % 4;
  s.current = ai; s.props[5].owner = ai;
  s.seed = seedFor(s.seed, 1, 2); s.players[ai].pos = 2;
  E.act(s, ai, { type: 'roll' });
  check(s.events.some((e) => e.type === 'buildBlocked') && !s.log.some((l) => l.text.includes('지을 수 없어요')), '컴퓨터: 이벤트만, 기록은 남기지 않음');
}

console.log('== 세계 이벤트 (5바퀴마다) ==');
{
  const s = game();
  s.round = 4;
  s.current = s.players.length - 1; s.phase = 'postRoll';
  E.act(s, s.current, { type: 'endTurn' });
  check(s.round === 5 && s.world && E.WORLD[s.world.kind], `5바퀴째 이벤트 발생: ${s.world && s.world.kind}`);
  s.props[3].owner = (H + 1) % 4;
  for (const [kind, mult] of [['boom', 1.5], ['crash', 0.5], ['festival', 2]]) {
    s.world = { kind, group: BOARD[3].group };
    s.world.kind = kind;
    const base = (s.world = null, E.calcRent(s, 3, 7));
    s.world = { kind, group: BOARD[3].group };
    check(E.calcRent(s, 3, 7) === Math.round(base * mult), `${kind}: 통행료 ${base} → ${E.calcRent(s, 3, 7)}`);
  }
}

console.log('== 남의 땅 강제 매입 ==');
{
  const s = game();
  const me = s.players[H], opp = (H + 1) % 4;
  s.props[3].owner = opp; s.props[3].houses = 2; s.bankHouses -= 2;
  s.seed = seedFor(s.seed, 1, 2); me.pos = 0;
  const price = E.takeoverPrice(s, 3);
  check(price === Math.ceil(((BOARD[3].price + 2 * BOARD[3].house) * 1.2) / 10) * 10 && price > BOARD[3].price + 2 * BOARD[3].house, `매입가 ${price} > 땅값+공사비 ${BOARD[3].price + 2 * BOARD[3].house}`);
  E.act(s, H, { type: 'roll' });
  check(s.phase === 'takeover' && s.pendingTakeover === 3, '통행료 낸 뒤 매입 단계');
  const mine = me.money, theirs = s.players[opp].money;
  check(E.act(s, H, { type: 'takeover' }) === '', '강제 매입 성공');
  check(s.props[3].owner === H && s.props[3].houses === 2, '땅과 건물이 내 것');
  check(me.money === mine - price && s.players[opp].money === theirs + price, '매입가가 원래 주인에게');
  check(s.phase === 'postRoll', '매입 후 턴 마무리 단계');
}
{
  const s = game();
  const opp = (H + 1) % 4;
  s.props[3].owner = opp; s.props[3].houses = 5; s.bankHotels -= 1;
  s.seed = seedFor(s.seed, 1, 2); s.players[H].pos = 0;
  E.act(s, H, { type: 'roll' });
  check(s.phase !== 'takeover', '궁전이 있으면 매입 제안 없음');
}
{
  const s = game();
  const opp = (H + 1) % 4;
  s.props[3].owner = opp;
  s.seed = seedFor(s.seed, 1, 2); s.players[H].pos = 0;
  E.act(s, H, { type: 'roll' });
  check(E.act(s, H, { type: 'skipTakeover' }) === '' && s.props[3].owner === opp && s.phase === 'postRoll', '그냥 두기');
}
{
  const s = game();
  const opp = (H + 1) % 4;
  s.props[3].owner = opp;
  s.players[H].money = 50;
  s.seed = seedFor(s.seed, 1, 2); s.players[H].pos = 0;
  E.act(s, H, { type: 'roll' });
  check(s.phase !== 'takeover', '돈이 모자라면 제안 없음');
}

console.log('== 컴퓨터는 문제 없이 바로 카드 ==');
{
  const s = game();
  const ai = (H + 1) % 4;
  s.current = ai;
  s.players[ai].pos = 4; // +3 → 7 찬스
  s.seed = seedFor(s.seed, 1, 2);
  E.act(s, ai, { type: 'roll' });
  check(!s.cardQuiz && s.events.some((e) => e.type === 'card'), '컴퓨터는 카드를 바로 뽑음');
}

console.log('== 주사위 문제 3번 틀림 → 기회 넘김 ==');
{
  const s = game();
  const seed = s.seed;
  check(E.act(s, H, { type: 'forfeitRoll' }) === '', 'forfeitRoll 성공');
  check(s.phase === 'postRoll' && !s.rollAgain, '굴리기 단계 끝');
  check(s.seed === seed, '난수 소모 없음');
  check(E.act(s, H, { type: 'roll' }) !== '', '다시 굴릴 수 없음');
  check(E.act(s, H, { type: 'endTurn' }) === '' && s.current !== H, '턴 넘기기 가능');
}
{
  const s = game();
  s.phase = 'postRoll'; s.rollAgain = true; s.doublesCount = 1;
  check(E.act(s, H, { type: 'forfeitRoll' }) === '' && !s.rollAgain, '더블 후 추가 굴리기도 넘김');
}
{
  const s = game();
  const me = s.players[H];
  me.inJail = true; me.pos = 10; me.jailTurns = 1;
  E.act(s, H, { type: 'forfeitRoll' });
  check(me.inJail && me.jailTurns === 2, '케이지: 시도 횟수 1 증가');
  s.phase = 'preRoll';
  E.act(s, H, { type: 'forfeitRoll' });
  check(me.jailTurns === 2, '케이지: 3번째는 넘겨도 2에서 멈춤 (직접 굴려야 함)');
}

console.log('== 문제 은행 ==');
for (const k of ['history', 'common']) {
  const ok = Q[k].length >= 30 && Q[k].every((x) => x.q && x.a && x.w.length === 2 && new Set([x.a, ...x.w]).size === 3);
  check(ok, `${k}: ${Q[k].length}문제, 보기 3개씩 서로 다름`);
}

console.log(failed ? `실패 ${failed}개` : '모두 정상');
process.exit(failed ? 1 : 0);
