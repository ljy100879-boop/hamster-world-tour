// 컴퓨터끼리 N판 자동 시뮬레이션 — 크래시/무한 루프/불변식 위반 검사
// 실행: node tests/sim.js [판수]
const E = require('../js/engine.js');
const AI = require('../js/ai.js');
const { BOARD, CONST, CARDS } = require('../js/data.js');

const GAMES = Number(process.argv[2] || 100);
const MAX_STEPS = 20000;
const diffs = ['easy', 'normal', 'hard'];
const stats = { finished: 0, capped: 0, rounds: [], wins: { easy: 0, normal: 0, hard: 0 }, trades: 0, auctions: 0 };

function checkInvariants(s, g, step) {
  let houses = 0, hotels = 0;
  for (const i in s.props) {
    const pr = s.props[i];
    if (pr.houses === 5) hotels++; else houses += pr.houses;
    if (pr.houses && BOARD[i].type !== 'prop') throw new Error('building on non-city');
    if (pr.houses && pr.mortgaged) throw new Error('building on mortgaged');
    if (pr.owner !== null && s.players[pr.owner].bankrupt) throw new Error('bankrupt owns property');
  }
  if (houses + s.bankHouses !== CONST.BANK_HOUSES) throw new Error(`house count ${houses}+${s.bankHouses}`);
  if (hotels + s.bankHotels !== CONST.BANK_HOTELS) throw new Error(`hotel count ${hotels}+${s.bankHotels}`);
  for (const p of s.players) if (p.money < 0) throw new Error(`negative money ${p.name} ${p.money} (game ${g} step ${step})`);
  if (s.decks.chance.length + s.players.reduce((n, p) => n + p.jailCards.filter((d) => d === 'chance').length, 0) !== CARDS.chance.length) throw new Error('chance deck size');
  if (s.decks.chest.length + s.players.reduce((n, p) => n + p.jailCards.filter((d) => d === 'chest').length, 0) !== CARDS.chest.length) throw new Error('chest deck size');
}

for (let g = 0; g < GAMES; g++) {
  const players = [0, 1, 2, 3].map((k) => ({ name: `AI${k}`, hamster: k, isAI: true, difficulty: diffs[(g + k) % 3] }));
  const s = E.newGame({ players, seed: 1000 + g });
  let step = 0;
  while (s.phase !== 'gameover' && step < MAX_STEPS) {
    const pid = E.actor(s);
    const before = JSON.stringify([s.phase, s.current, s.debts.length, !!s.auction, s.auction && s.auction.bid, s.auction && s.auction.active.length, s.players.map((p) => [p.money, p.pos, p.inJail]), s.dice, s.round, !!s.targetPick]);
    const r = AI.step(s, pid);
    s.events.length = 0;
    const after = JSON.stringify([s.phase, s.current, s.debts.length, !!s.auction, s.auction && s.auction.bid, s.auction && s.auction.active.length, s.players.map((p) => [p.money, p.pos, p.inJail]), s.dice, s.round, !!s.targetPick]);
    if (before === after && r !== 'manage' && r !== 'trade') throw new Error(`stuck: game ${g} step ${step} actor ${pid} phase ${s.phase} result '${r}'`);
    checkInvariants(s, g, step);
    step++;
  }
  stats.trades += s.log.filter((l) => l.text.includes('거래 성사')).length;
  stats.auctions += s.log.filter((l) => l.text.includes('경매 시작')).length;
  if (s.phase === 'gameover') {
    stats.finished++;
    stats.rounds.push(s.round);
    stats.wins[s.players[s.winner].difficulty]++;
  } else stats.capped++;
}

const avg = stats.rounds.reduce((a, b) => a + b, 0) / (stats.rounds.length || 1);
console.log(`games=${GAMES} finished=${stats.finished} capped(${MAX_STEPS} steps)=${stats.capped}`);
console.log(`avg rounds=${avg.toFixed(1)} wins=${JSON.stringify(stats.wins)} trades=${stats.trades} auctions=${stats.auctions}`);
console.log('OK: no crashes, no stuck states, invariants held');
