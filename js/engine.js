// 햄스터 월드 투어 — 게임 규칙 엔진 (UI와 독립, Node에서도 실행 가능)
//
// 상태 흐름
//   s.phase: 'preRoll' | 'buy' | 'postRoll' | 'gameover'   (현재 플레이어의 턴 단계)
//   오버레이(우선순위 순): s.debts(빚) → s.auction(경매) → s.tradeOffer(거래 제안)
//   Engine.actor(s) 가 "지금 행동해야 하는 플레이어"를 알려준다.
(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.GameData;
  const { BOARD, GROUPS, CARDS, CONST } = D;

  const hooks = {
    raiseCash: null,      // (s, pid, amount) => void  — 컴퓨터가 빚을 갚을 현금 마련
    evaluateTrade: null,  // (s, offer) => boolean     — 컴퓨터가 받은 거래 제안 평가
  };

  // ---------- 난수 (시드 고정, 저장/복원 가능) ----------
  function rand(s) {
    s.seed = (s.seed + 0x6D2B79F5) >>> 0;
    let t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const randInt = (s, n) => Math.floor(rand(s) * n);
  function shuffle(s, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(s, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const rollDice = (s) => [randInt(s, 6) + 1, randInt(s, 6) + 1];
  // 다음에 굴릴 주사위를 상태를 바꾸지 않고 미리 보기 (화면의 수학 문제 정답용)
  const peekDice = (s) => rollDice({ seed: s.seed });

  // ---------- 기본 헬퍼 ----------
  const isBuyable = (i) => ['prop', 'airport', 'util'].includes(BOARD[i].type);
  const P = (s, pid) => s.players[pid];
  const alive = (s) => s.players.filter((p) => !p.bankrupt);
  const fmt = (n) => '🌻' + n.toLocaleString();

  function log(s, text, cls) {
    s.log.push({ text, cls: cls || '', round: s.round });
    if (s.log.length > 300) s.log.shift();
  }
  function emit(s, ev) { s.events.push(ev); }

  function groupMembers(i) { return GROUPS[BOARD[i].group].members; }
  function ownsGroup(s, pid, group) {
    return GROUPS[group].members.every((m) => s.props[m].owner === pid);
  }
  function hasMonopoly(s, pid, i) {
    return BOARD[i].type === 'prop' && ownsGroup(s, pid, BOARD[i].group);
  }
  function groupHasBuildings(s, i) {
    if (BOARD[i].type !== 'prop') return false;
    return groupMembers(i).some((m) => s.props[m].houses > 0);
  }
  function ownedBy(s, pid) {
    return Object.keys(s.props).map(Number).filter((i) => s.props[i].owner === pid);
  }
  function countType(s, pid, type) {
    return ownedBy(s, pid).filter((i) => BOARD[i].type === type).length;
  }
  function buildingCounts(s, pid) {
    let houses = 0, hotels = 0;
    for (const i of ownedBy(s, pid)) {
      const h = s.props[i].houses;
      if (h === 5) hotels++; else houses += h;
    }
    return { houses, hotels };
  }
  function netWorth(s, pid) {
    const p = P(s, pid);
    if (p.bankrupt) return 0;
    let total = p.money;
    for (const i of ownedBy(s, pid)) {
      const sp = BOARD[i], pr = s.props[i];
      total += pr.mortgaged ? sp.price - sp.mortgage : sp.price;
      if (pr.houses) total += pr.houses * sp.house;
    }
    return total;
  }
  const unmortgageCost = (i) => Math.ceil(BOARD[i].mortgage * 1.1);
  const mortgageInterest = (i) => Math.ceil(BOARD[i].mortgage * 0.1);

  // ---------- 게임 생성 ----------
  function newGame(opts) {
    const s = {
      version: 1,
      seed: (opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 32)) >>> 0,
      options: Object.assign({ freeParkingJackpot: false, exactGo400: false, turnLimit: 0 }, opts.options || {}),
      players: [],
      props: {},
      bankHouses: CONST.BANK_HOUSES,
      bankHotels: CONST.BANK_HOTELS,
      decks: {},
      current: 0,
      phase: 'preRoll',
      dice: null,
      doublesCount: 0,
      rollAgain: false,
      pendingBuy: null,
      debts: [],
      auction: null,
      auctionQueue: [],
      tradeOffer: null,
      jackpot: 0,
      round: 1,
      winner: null,
      endReason: '',
      log: [],
      events: [],
      lastCard: null,
      turnFlags: {},
      cardQuiz: null, // 사람이 찬스/볼주머니 칸에 도착: { pid, deck, id, bad } — 문제 결과로 카드 발동/무효
      pendingBuild: null, // 'build' 단계: 내 땅에 도착해 건물을 지을 수 있는 칸
      pendingTakeover: null, // 'takeover' 단계: 통행료를 낸 남의 땅을 강제 매입할 수 있는 칸
      world: null, // 5바퀴마다 바뀌는 세계 이벤트 { kind, group, round }
      aiMem: { offers: {}, rejected: {} },
    };
    for (let i = 0; i < BOARD.length; i++) {
      if (isBuyable(i)) s.props[i] = { owner: null, houses: 0, mortgaged: false };
    }
    s.decks.chance = shuffle(s, CARDS.chance.map((c) => c.id));
    s.decks.chest = shuffle(s, CARDS.chest.map((c) => c.id));

    // 순서 정하기: 주사위 굴려 높은 순
    const order = opts.players.map((cfg, k) => {
      const d = rollDice(s);
      return { cfg, k, total: d[0] + d[1], tie: rand(s) };
    });
    order.forEach((o) => log(s, `${o.cfg.name}: 순서 정하기 주사위 ${o.total}`));
    order.sort((a, b) => b.total - a.total || b.tie - a.tie);
    s.players = order.map((o, id) => ({
      id,
      name: o.cfg.name,
      hamster: o.cfg.hamster,
      isAI: !!o.cfg.isAI,
      difficulty: o.cfg.difficulty || 'normal',
      money: CONST.START_MONEY,
      pos: 0,
      inJail: false,
      jailTurns: 0,
      jailCards: [],
      bankrupt: false,
    }));
    log(s, `게임 시작! 순서: ${s.players.map((p) => p.name).join(' → ')}`, 'big');
    return s;
  }

  // ---------- 돈 ----------
  function give(s, pid, amount) {
    if (amount <= 0) return;
    P(s, pid).money += amount;
    emit(s, { type: 'money', pid, delta: amount });
  }

  // 은행(to = null) 또는 다른 플레이어에게 지불. 현금이 모자라면
  // 컴퓨터는 즉시 현금을 마련(안 되면 파산), 사람은 빚 오버레이로 넘어간다.
  function charge(s, pid, to, amount, reason) {
    const p = P(s, pid);
    if (amount <= 0 || p.bankrupt) return true;
    if (p.money < amount && p.isAI && hooks.raiseCash) hooks.raiseCash(s, pid, amount);
    if (p.money >= amount) {
      transfer(s, pid, to, amount);
      return true;
    }
    if (p.isAI) {
      log(s, `${p.name}: ${fmt(amount)}을(를) 낼 수 없어 파산!`, 'bad');
      bankrupt(s, pid, to);
      return false;
    }
    s.debts.push({ debtor: pid, to, amount, reason: reason || '' });
    log(s, `${p.name}: ${fmt(amount)} 부족! 건물 매각·저당으로 현금을 마련하세요.`, 'bad');
    return false;
  }

  function transfer(s, from, to, amount) {
    P(s, from).money -= amount;
    emit(s, { type: 'money', pid: from, delta: -amount });
    if (to !== null && to !== undefined) {
      P(s, to).money += amount;
      emit(s, { type: 'money', pid: to, delta: amount });
    } else if (s.options.freeParkingJackpot) {
      s.jackpot += amount;
    }
  }

  // ---------- 파산 ----------
  function bankrupt(s, pid, creditor) {
    const p = P(s, pid);
    if (p.bankrupt) return;
    const cred = creditor !== null && creditor !== undefined && !P(s, creditor).bankrupt ? creditor : null;
    // 건물은 은행에 반값으로 매각
    for (const i of ownedBy(s, pid)) {
      const pr = s.props[i];
      if (pr.houses === 5) { s.bankHotels++; p.money += BOARD[i].house * 5 / 2; }
      else if (pr.houses > 0) { s.bankHouses += pr.houses; p.money += BOARD[i].house * pr.houses / 2; }
      pr.houses = 0;
    }
    p.bankrupt = true;
    if (cred !== null) {
      const c = P(s, cred);
      if (p.money > 0) { c.money += p.money; emit(s, { type: 'money', pid: cred, delta: p.money }); }
      for (const i of ownedBy(s, pid)) {
        s.props[i].owner = cred;
        if (s.props[i].mortgaged) c.money -= Math.min(c.money, mortgageInterest(i));
      }
      c.jailCards.push(...p.jailCards);
      log(s, `${p.name} 파산! 모든 재산이 ${c.name}에게 넘어갑니다.`, 'bad big');
    } else {
      const props = ownedBy(s, pid);
      for (const i of props) Object.assign(s.props[i], { owner: null, mortgaged: false, houses: 0 });
      for (const deck of p.jailCards) s.decks[deck].push(jailCardId(deck));
      s.auctionQueue.push(...props);
      log(s, `${p.name} 파산! 땅은 은행으로 돌아가 경매에 부쳐집니다.`, 'bad big');
    }
    p.money = 0;
    p.jailCards = [];
    p.inJail = false;
    s.debts = s.debts.filter((d) => d.debtor !== pid);
    if (s.targetPick && s.targetPick.pid === pid) s.targetPick = null;
    if (s.cardQuiz && s.cardQuiz.pid === pid) s.cardQuiz = null;
    if (s.targetPick) s.targetPick.targets = s.targetPick.targets.filter((x) => x !== pid);
    emit(s, { type: 'bankrupt', pid });
  }
  function jailCardId(deck) {
    return CARDS[deck].find((c) => c.act.type === 'jailFree').id;
  }

  // ---------- 이동 ----------
  function passGo(s, pid, landedExactly) {
    const amt = landedExactly && s.options.exactGo400 ? 400 : CONST.GO_SALARY;
    give(s, pid, amt);
    log(s, `${P(s, pid).name}: 출발 통과! ${fmt(amt)} 수령`, 'good');
  }
  function moveBy(s, pid, steps) {
    const p = P(s, pid);
    const path = [];
    for (let k = 1; k <= steps; k++) path.push((p.pos + k) % 40);
    const passed = p.pos + steps >= 40;
    p.pos = (p.pos + steps) % 40;
    emit(s, { type: 'move', pid, path });
    if (passed) passGo(s, pid, p.pos === 0);
  }
  function moveTo(s, pid, target) {
    const p = P(s, pid);
    const steps = (target - p.pos + 40) % 40;
    moveBy(s, pid, steps === 0 ? 40 : steps);
  }
  function sendToJail(s, pid) {
    const p = P(s, pid);
    p.pos = CONST.JAIL_POS;
    p.inJail = true;
    p.jailTurns = 0;
    if (s.current === pid) { s.rollAgain = false; s.doublesCount = 0; }
    emit(s, { type: 'jail', pid });
    log(s, `${p.name}: 햄스터 케이지에 갇혔어요! 🔒`, 'bad');
  }

  // ---------- 세계 이벤트 (5바퀴마다) ----------
  const WORLD = {
    boom: { name: '📈 부동산 폭등', text: '땅값이 치솟았어요! 모든 통행료 1.5배' },
    crash: { name: '📉 부동산 폭락', text: '땅값이 뚝 떨어졌어요! 모든 통행료 절반' },
    festival: { name: '🎉 축제 개막', text: '축제가 열린 색깔 도시들의 통행료 2배' },
    harvest: { name: '🌾 해바라기 풍년', text: '해바라기씨 대풍년! 모든 햄스터가 🌻100씩 받아요' },
    famine: { name: '🥀 흉년', text: '해바라기씨 흉년… 모든 햄스터가 은행에 🌻50씩 내요' },
  };
  const WORLD_EVERY = 5;
  function rentMult(s, i) {
    const w = s.world;
    if (!w) return 1;
    if (w.kind === 'boom') return 1.5;
    if (w.kind === 'crash') return 0.5;
    if (w.kind === 'festival' && BOARD[i].group === w.group) return 2;
    return 1;
  }
  function worldEvent(s) {
    const kinds = Object.keys(WORLD);
    const kind = kinds[randInt(s, kinds.length)];
    const groups = [...new Set(BOARD.filter((b) => b.type === 'prop').map((b) => b.group))];
    const group = kind === 'festival' ? groups[randInt(s, groups.length)] : null;
    s.world = { kind, group, round: s.round };
    const w = WORLD[kind];
    log(s, `🌍 ${s.round}바퀴 세계 이벤트! ${w.name} — ${w.text}${group ? ` (${GROUPS[group].name})` : ''}`, 'big');
    emit(s, { type: 'world', kind, group });
    const live = alive(s);
    if (kind === 'harvest') live.forEach((p) => give(s, p.id, 100));
    if (kind === 'famine') live.forEach((p) => { if (!p.bankrupt) charge(s, p.id, null, 50, '흉년'); });
  }

  // ---------- 통행료 ----------
  function calcRent(s, i, diceTotal, ctx) {
    const base = calcRentBase(s, i, diceTotal, ctx);
    return base ? Math.round(base * rentMult(s, i)) : 0;
  }
  function calcRentBase(s, i, diceTotal, ctx) {
    const sp = BOARD[i], pr = s.props[i];
    if (pr.owner === null || pr.mortgaged) return 0;
    if (sp.type === 'prop') {
      if (pr.houses > 0) return sp.rent[pr.houses];
      return sp.rent[0] * (ownsGroup(s, pr.owner, sp.group) ? 2 : 1);
    }
    if (sp.type === 'airport') {
      const n = countType(s, pr.owner, 'airport');
      return 25 * 2 ** (n - 1) * (ctx && ctx.airportDouble ? 2 : 1);
    }
    if (sp.type === 'util') {
      const n = countType(s, pr.owner, 'util');
      const mult = ctx && ctx.util10 ? 10 : n === 2 ? 10 : 4;
      return diceTotal * mult;
    }
    return 0;
  }

  // ---------- 도착 처리 ----------
  function landOn(s, pid, ctx) {
    const p = P(s, pid);
    const i = p.pos, sp = BOARD[i];
    // 특수 칸 도착 알림 (화면이 칸에 어울리는 도착음을 냄, REQ-136). 규칙에는 영향 없음
    if (sp.type !== 'prop' && sp.type !== 'airport' && sp.type !== 'util') emit(s, { type: 'land', pid, pos: i, kind: sp.type });
    switch (sp.type) {
      case 'prop': case 'airport': case 'util': {
        const pr = s.props[i];
        if (pr.owner === null) {
          s.phase = 'buy';
          s.pendingBuy = i;
          return;
        }
        if (pr.owner === pid) {
          const why = canLandBuild(s, pid, i);
          if (!why) { s.phase = 'build'; s.pendingBuild = i; return; }
          // 지을 수 없으면 이유를 알림 (REQ-101). 기록은 사람만 (컴퓨터 것까지 남기면 기록이 너무 길어짐)
          emit(s, { type: 'buildBlocked', pid, pos: i, reason: why });
          if (!p.isAI) log(s, `${p.name}: ${sp.name}에 건물을 지을 수 없어요 — ${why}`);
          return;
        }
        if (ctx && ctx.noRent) { log(s, `${p.name}: 무료 항공권으로 ${sp.name} 통행료 면제!`, 'good'); return; }
        if (pr.mortgaged) { log(s, `${sp.name}은(는) 저당 중이라 통행료가 없어요.`); return; }
        let diceTotal = s.dice ? s.dice[0] + s.dice[1] : 7;
        if (sp.type === 'util' && ctx && ctx.util10) {
          const d = rollDice(s);
          s.dice = d;
          emit(s, { type: 'dice', dice: d });
          diceTotal = d[0] + d[1];
        }
        const rent = calcRent(s, i, diceTotal, ctx);
        const owner = P(s, pr.owner);
        log(s, `${p.name} → ${owner.name}: ${sp.name} 통행료 ${fmt(rent)}`, 'pay');
        emit(s, { type: 'rent', from: pid, to: pr.owner, amount: rent, pos: i });
        charge(s, pid, pr.owner, rent, `${sp.name} 통행료`);
        // 통행료를 다 낸 뒤, 궁전이 없는 남의 땅이면 강제 매입 제안 (돈이 있을 때만)
        if (!s.debts.length && !p.bankrupt && s.current === pid && !canTakeover(s, pid, i)) {
          s.phase = 'takeover';
          s.pendingTakeover = i;
        }
        return;
      }
      case 'chance': case 'chest':
        // 사람은 문제를 먼저 풀어야 카드를 쓸 수 있음 (화면이 cardQuizAnswer 로 결과를 알려 줌)
        if (!p.isAI) {
          const id = s.decks[sp.type][0];
          const bad = isBadCard(CARDS[sp.type].find((c) => c.id === id));
          s.cardQuiz = { pid, deck: sp.type, id, bad };
          emit(s, { type: 'cardQuiz', pid, deck: sp.type });
          return;
        }
        return drawCard(s, pid, sp.type);
      case 'tax':
        log(s, `${p.name}: ${sp.name} ${fmt(sp.amount)} 납부`, 'pay');
        charge(s, pid, null, sp.amount, sp.name);
        return;
      case 'gotojail':
        return sendToJail(s, pid);
      case 'teleport':
        if (s.options.freeParkingJackpot && s.jackpot > 0) {
          log(s, `${p.name}: 텔레포트 칸 상금 ${fmt(s.jackpot)} 획득!`, 'good');
          give(s, pid, s.jackpot);
          s.jackpot = 0;
        }
        log(s, `${p.name}: 🌀 텔레포트! 가고 싶은 칸을 골라요`);
        s.phase = 'teleport';
        return;
      default:
        return;
    }
  }

  function drawCard(s, pid, deck) {
    const p = P(s, pid);
    const id = s.decks[deck].shift();
    const card = CARDS[deck].find((c) => c.id === id);
    s.lastCard = { deck, id };
    emit(s, { type: 'card', deck, id, pid });
    log(s, `${p.name} [${deck === 'chance' ? '🌻 찬스' : '🐹 볼주머니'}] ${card.text}`, 'card');
    if (card.act.type === 'jailFree') p.jailCards.push(deck);
    else s.decks[deck].push(id);

    const a = card.act;
    switch (a.type) {
      case 'advance':
        moveTo(s, pid, a.to);
        return landOn(s, pid);
      case 'nearestAirport': {
        const target = [5, 15, 25, 35].find((x) => x > p.pos) ?? 5;
        moveTo(s, pid, target);
        return landOn(s, pid, { airportDouble: true });
      }
      case 'nearestUtil': {
        const target = [12, 28].find((x) => x > p.pos) ?? 12;
        moveTo(s, pid, target);
        return landOn(s, pid, { util10: true });
      }
      case 'money':
        if (a.amount > 0) give(s, pid, a.amount);
        else charge(s, pid, null, -a.amount, '카드');
        return;
      case 'back3': {
        const path = [(p.pos + 39) % 40, (p.pos + 38) % 40, (p.pos + 37) % 40];
        p.pos = path[2];
        emit(s, { type: 'move', pid, path });
        return landOn(s, pid);
      }
      case 'gotoJail':
        return sendToJail(s, pid);
      case 'repairs': {
        const b = buildingCounts(s, pid);
        const amt = b.houses * a.house + b.hotels * a.hotel;
        if (amt > 0) charge(s, pid, null, amt, '수리비');
        return;
      }
      case 'payEach':
        for (const o of alive(s)) if (o.id !== pid) charge(s, pid, o.id, a.amount, '카드');
        return;
      case 'collectEach':
        for (const o of alive(s)) if (o.id !== pid) charge(s, o.id, pid, a.amount, '생일 선물');
        return;
      case 'forward':
        moveBy(s, pid, a.n);
        return landOn(s, pid);
      case 'allCollect':
        for (const o of alive(s)) give(s, o.id, a.amount);
        return;
      case 'nearestAirportFree': {
        const target = [5, 15, 25, 35].find((x) => x > p.pos) ?? 5;
        moveTo(s, pid, target);
        return landOn(s, pid, { noRent: true });
      }
      case 'diceBonus': {
        const d = rollDice(s);
        const amt = (d[0] + d[1]) * a.mult;
        log(s, `${p.name}: 복권 주사위 ${d[0]} + ${d[1]} → ${fmt(amt)} 당첨!`, 'good');
        give(s, pid, amt);
        return;
      }
      case 'perProperty': {
        const n = ownedBy(s, pid).filter((i) => !a.kind || BOARD[i].type === a.kind).length;
        if (n) give(s, pid, n * a.amount);
        log(s, `${p.name}: ${a.kind === 'airport' ? '공항' : '땅'} ${n}개 × ${fmt(a.amount)} = ${fmt(n * a.amount)}`);
        return;
      }
      case 'wealthTax': {
        const amt = Math.min(a.max, Math.ceil((netWorth(s, pid) * a.rate) / 10) * 10);
        log(s, `${p.name}: 부자 세금 ${fmt(amt)}`, 'pay');
        charge(s, pid, null, amt, '부자 세금');
        return;
      }
      case 'giveToPoorest': {
        const others = alive(s).filter((o) => o.id !== pid).sort((x, y) => x.money - y.money);
        if (!others.length) return;
        log(s, `${p.name} → ${others[0].name}: ${fmt(a.amount)} 기부`, 'pay');
        charge(s, pid, others[0].id, a.amount, '기부');
        return;
      }
      case 'drawChest':
        return drawCard(s, pid, 'chest');
      case 'drawChance':
        return drawCard(s, pid, 'chance');
      case 'nearestUtilFree': {
        const target = [12, 28].find((x) => x > p.pos) ?? 12;
        moveTo(s, pid, target);
        return landOn(s, pid, { noRent: true });
      }
      case 'attack': {
        const targets = attackTargets(s, pid, a);
        if (!targets.length) { log(s, `${p.name}: 공격할 수 있는 햄스터가 없어 카드가 그냥 넘어가요.`); return; }
        // 대상 선택은 오버레이로 기다린다 (Engine.actor 가 공격자를 돌려줌 → 'pickTarget' 행동)
        s.targetPick = { pid, act: a, text: card.text, targets };
        emit(s, { type: 'targetPick', pid });
        return;
      }
      default:
        return;
    }
  }

  // ---------- 공격 카드 ----------
  function attackTargets(s, pid, a) {
    return alive(s).filter((o) => {
      if (o.id === pid) return false;
      if (a.kind === 'jail' || a.kind === 'pushBack') return !o.inJail;
      if (a.kind === 'stealPct') return o.money > 0;
      if (a.kind === 'demolish') return ownedBy(s, o.id).some((i) => s.props[i].houses > 0);
      return true;
    }).map((o) => o.id);
  }
  function applyAttack(s, pid, tid, a) {
    const p = P(s, pid), t = P(s, tid);
    emit(s, { type: 'attack', pid, target: tid, kind: a.kind });
    switch (a.kind) {
      case 'steal':
        log(s, `⚔️ ${p.name} → ${t.name}: 볼주머니 습격! ${fmt(a.amount)}`, 'bad');
        return charge(s, tid, pid, a.amount, '볼주머니 습격');
      case 'stealPct': {
        const amt = Math.min(a.max, Math.max(10, Math.ceil((t.money * a.rate) / 10) * 10), t.money);
        log(s, `⚔️ ${p.name} → ${t.name}: 해바라기씨 몰래 먹기! ${fmt(amt)}`, 'bad');
        return charge(s, tid, pid, amt, '해바라기씨 도둑');
      }
      case 'jail':
        log(s, `⚔️ ${p.name} → ${t.name}: 케이지 신고!`, 'bad');
        return sendToJail(s, tid);
      case 'fine':
        log(s, `⚔️ ${p.name} → ${t.name}: 쳇바퀴 고장! 수리비 ${fmt(a.amount)}`, 'bad');
        return charge(s, tid, null, a.amount, '쳇바퀴 수리비');
      case 'demolish': {
        // 건물이 가장 많은 땅부터, 고르게 짓기 규칙을 지키며 한 단계 철거
        const cand = ownedBy(s, tid).filter((i) => !canSell(s, tid, i)).sort((x, y) => s.props[y].houses - s.props[x].houses || BOARD[y].house - BOARD[x].house);
        if (!cand.length) return;
        const i = cand[0], pr = s.props[i];
        if (pr.houses === 5) {
          s.bankHotels++;
          if (s.bankHouses >= 4) { s.bankHouses -= 4; pr.houses = 4; } else pr.houses = 0;
        } else { s.bankHouses++; pr.houses--; }
        emit(s, { type: 'demolish', pid: tid, pos: i });
        log(s, `⚔️ ${p.name} → ${t.name}: ${BOARD[i].name} 건물 철거!`, 'bad');
        return;
      }
      case 'pushBack': {
        const path = [];
        for (let k = 1; k <= a.n; k++) path.push((t.pos - k + 40) % 40);
        t.pos = path[path.length - 1];
        emit(s, { type: 'move', pid: tid, path });
        log(s, `⚔️ ${p.name} → ${t.name}: 뒤로 ${a.n}칸!`, 'bad');
        return;
      }
      default:
        return;
    }
  }

  // ---------- 경매 ----------
  function startAuction(s, i) {
    const order = [];
    for (let k = 0; k < s.players.length; k++) {
      const p = s.players[(s.current + k) % s.players.length];
      if (!p.bankrupt) order.push(p.id);
    }
    s.auction = { pos: i, bid: 0, bidder: null, active: order, idx: 0 };
    log(s, `${BOARD[i].name} 경매 시작! (🌻1부터)`, 'big');
    emit(s, { type: 'auction', pos: i });
    auctionCheck(s);
  }
  function auctionCheck(s) {
    const a = s.auction;
    if (!a) return;
    if (a.active.length === 0 || (a.active.length === 1 && a.bidder === a.active[0])) return finishAuction(s);
    a.idx %= a.active.length;
    if (a.active[a.idx] === a.bidder) a.idx = (a.idx + 1) % a.active.length;
  }
  function finishAuction(s) {
    const a = s.auction;
    s.auction = null;
    if (a.bidder !== null) {
      P(s, a.bidder).money -= a.bid;
      emit(s, { type: 'money', pid: a.bidder, delta: -a.bid });
      s.props[a.pos].owner = a.bidder;
      emit(s, { type: 'buy', pid: a.bidder, pos: a.pos });
      log(s, `${P(s, a.bidder).name}: ${BOARD[a.pos].name} 낙찰! (${fmt(a.bid)})`, 'good');
    } else {
      log(s, `아무도 입찰하지 않아 ${BOARD[a.pos].name}은(는) 은행에 남습니다.`);
    }
    if (s.auctionQueue.length) startAuction(s, s.auctionQueue.shift());
  }

  // ---------- 건설 / 저당 ----------
  function canBuild(s, pid, i) {
    const sp = BOARD[i], pr = s.props[i];
    if (!pr || sp.type !== 'prop' || pr.owner !== pid) return '내 도시가 아니에요';
    if (!ownsGroup(s, pid, sp.group)) return '같은 색을 모두 가져야 지을 수 있어요';
    if (groupMembers(i).some((m) => s.props[m].mortgaged)) return '그룹에 저당 잡힌 도시가 있어요';
    if (pr.houses >= 5) return '이미 궁전이 있어요';
    if (pr.houses > Math.min(...groupMembers(i).map((m) => s.props[m].houses))) return '균등하게 지어야 해요';
    if (pr.houses < 4 && s.bankHouses < 1) return '은행에 굴이 다 떨어졌어요';
    if (pr.houses === 4 && s.bankHotels < 1) return '은행에 궁전이 다 떨어졌어요';
    if (P(s, pid).money < sp.house) return '해바라기씨가 부족해요';
    return '';
  }
  // 내 땅에 도착했을 때 짓기: 같은 색을 다 갖지 않아도, 균등 규칙 없이 한 단계
  function canLandBuild(s, pid, i) {
    const sp = BOARD[i], pr = s.props[i];
    if (!pr || pr.owner !== pid) return '내 도시가 아니에요';
    if (sp.type !== 'prop') return '공항·공공시설에는 건물을 지을 수 없어요';
    if (pr.mortgaged) return '저당 잡힌 도시예요 (저당을 풀면 지을 수 있어요)';
    if (pr.houses >= 5) return '이미 궁전까지 다 지었어요';
    if (pr.houses < 4 && s.bankHouses < 1) return '은행에 굴이 다 떨어졌어요';
    if (pr.houses === 4 && s.bankHotels < 1) return '은행에 궁전이 다 떨어졌어요';
    if (P(s, pid).money < sp.house) return '해바라기씨가 부족해요';
    return '';
  }
  // 강제 매입가: (땅값 + 지은 건물 공사비) × 1.2, 10 단위 올림
  const TAKEOVER_RATE = 1.2;
  function takeoverPrice(s, i) {
    const sp = BOARD[i], pr = s.props[i];
    const built = sp.type === 'prop' ? pr.houses * sp.house : 0;
    return Math.ceil(((sp.price + built) * TAKEOVER_RATE) / 10) * 10;
  }
  function canTakeover(s, pid, i) {
    const pr = s.props[i];
    if (!pr || pr.owner === null || pr.owner === pid) return '남의 땅이 아니에요';
    if (pr.houses >= 5) return '궁전이 있는 땅은 매입할 수 없어요';
    if (pr.mortgaged) return '저당 잡힌 땅은 매입할 수 없어요';
    if (P(s, pid).money < takeoverPrice(s, i)) return '해바라기씨가 부족해요';
    return '';
  }
  const BAD_CARD_TYPES = ['gotoJail', 'repairs', 'payEach', 'wealthTax', 'giveToPoorest', 'back3'];
  function isBadCard(card) {
    const a = card.act;
    return (a.type === 'money' && a.amount < 0) || BAD_CARD_TYPES.includes(a.type);
  }
  function canSell(s, pid, i) {
    const pr = s.props[i];
    if (!pr || pr.owner !== pid) return '내 도시가 아니에요';
    if (pr.houses === 0) return '건물이 없어요';
    if (pr.houses < Math.max(...groupMembers(i).map((m) => s.props[m].houses))) return '균등하게 팔아야 해요';
    return '';
  }
  function canMortgage(s, pid, i) {
    const pr = s.props[i];
    if (!pr || pr.owner !== pid) return '내 땅이 아니에요';
    if (pr.mortgaged) return '이미 저당 중이에요';
    if (groupHasBuildings(s, i)) return '그룹의 건물을 먼저 팔아야 해요';
    return '';
  }
  function canUnmortgage(s, pid, i) {
    const pr = s.props[i];
    if (!pr || pr.owner !== pid) return '내 땅이 아니에요';
    if (!pr.mortgaged) return '저당 중이 아니에요';
    if (P(s, pid).money < unmortgageCost(i)) return '해바라기씨가 부족해요';
    return '';
  }

  function doBuild(s, pid, i) {
    const pr = s.props[i], sp = BOARD[i];
    P(s, pid).money -= sp.house;
    emit(s, { type: 'money', pid, delta: -sp.house });
    if (pr.houses === 4) { s.bankHotels--; s.bankHouses += 4; pr.houses = 5; }
    else { s.bankHouses--; pr.houses++; }
    emit(s, { type: 'build', pid, pos: i, level: pr.houses });
    log(s, `${P(s, pid).name}: ${sp.name}에 ${pr.houses === 5 ? '햄스터 궁전 🏰' : `햄스터 굴 🏠(${pr.houses})`} 건설`, 'good');
  }
  function doSell(s, pid, i) {
    const pr = s.props[i], sp = BOARD[i];
    const half = sp.house / 2;
    let refund = half;
    if (pr.houses === 5) {
      s.bankHotels++;
      if (s.bankHouses >= 4) { s.bankHouses -= 4; pr.houses = 4; }
      else { pr.houses = 0; refund += half * 4; } // 굴이 부족하면 궁전을 통째로 매각
    } else { s.bankHouses++; pr.houses--; }
    give(s, pid, refund);
    log(s, `${P(s, pid).name}: ${sp.name} 건물 매각 (+${fmt(refund)})`);
  }
  function doMortgage(s, pid, i) {
    s.props[i].mortgaged = true;
    give(s, pid, BOARD[i].mortgage);
    log(s, `${P(s, pid).name}: ${BOARD[i].name} 저당 (+${fmt(BOARD[i].mortgage)})`);
  }
  function doUnmortgage(s, pid, i) {
    const cost = unmortgageCost(i);
    s.props[i].mortgaged = false;
    P(s, pid).money -= cost;
    emit(s, { type: 'money', pid, delta: -cost });
    log(s, `${P(s, pid).name}: ${BOARD[i].name} 저당 해제 (-${fmt(cost)})`);
  }

  // ---------- 거래 ----------
  // offer = { from, to, give: {props, money, cards}, get: {props, money, cards} }
  function normalizeOffer(o) {
    const side = (x) => ({ props: (x && x.props) || [], money: (x && x.money) || 0, cards: (x && x.cards) || 0 });
    return { from: o.from, to: o.to, give: side(o.give), get: side(o.get) };
  }
  function validateTrade(s, o) {
    const a = P(s, o.from), b = P(s, o.to);
    if (!a || !b || a.bankrupt || b.bankrupt || a.id === b.id) return '거래할 수 없는 상대예요';
    const empty = (x) => !x.props.length && !x.money && !x.cards;
    if (empty(o.give) && empty(o.get)) return '거래 내용이 비어 있어요';
    for (const i of o.give.props) if (!s.props[i] || s.props[i].owner !== a.id) return '내 땅이 아닌 것이 있어요';
    for (const i of o.get.props) if (!s.props[i] || s.props[i].owner !== b.id) return '상대 땅이 아닌 것이 있어요';
    for (const i of [...o.give.props, ...o.get.props]) if (groupHasBuildings(s, i)) return '건물이 있는 그룹의 땅은 거래할 수 없어요';
    if (o.give.money < 0 || o.get.money < 0) return '금액이 올바르지 않아요';
    if (o.give.money > a.money) return '내 해바라기씨가 부족해요';
    if (o.get.money > b.money) return '상대 해바라기씨가 부족해요';
    if (o.give.cards > a.jailCards.length || o.get.cards > b.jailCards.length) return '탈출권 수가 맞지 않아요';
    return '';
  }
  function executeTrade(s, o) {
    const a = P(s, o.from), b = P(s, o.to);
    const moveProps = (props, to) => {
      for (const i of props) {
        s.props[i].owner = to;
        if (s.props[i].mortgaged) {
          log(s, `${P(s, to).name}: 저당 잡힌 ${BOARD[i].name}을(를) 받아 이자 ${fmt(mortgageInterest(i))} 지불`);
          charge(s, to, null, mortgageInterest(i), '저당 이자');
        }
      }
    };
    if (o.give.money) transfer(s, a.id, b.id, o.give.money);
    if (o.get.money) transfer(s, b.id, a.id, o.get.money);
    b.jailCards.push(...a.jailCards.splice(0, o.give.cards));
    a.jailCards.push(...b.jailCards.splice(0, o.get.cards));
    moveProps(o.give.props, b.id);
    moveProps(o.get.props, a.id);
    emit(s, { type: 'trade', from: a.id, to: b.id });
    log(s, `🤝 ${a.name} ↔ ${b.name} 거래 성사! (${describeOffer(s, o)})`, 'good');
  }
  function describeOffer(s, o) {
    const side = (x) => {
      const parts = x.props.map((i) => BOARD[i].name);
      if (x.money) parts.push(fmt(x.money));
      if (x.cards) parts.push(`탈출권 ${x.cards}장`);
      return parts.length ? parts.join(', ') : '없음';
    };
    return `${P(s, o.from).name} 줌: ${side(o.give)} / 받음: ${side(o.get)}`;
  }

  // ---------- 턴 진행 ----------
  function actor(s) {
    if (s.phase === 'gameover') return null;
    if (s.debts.length) return s.debts[0].debtor;
    if (s.targetPick) return s.targetPick.pid;
    if (s.cardQuiz) return s.cardQuiz.pid;
    if (s.auction) return s.auction.active[s.auction.idx];
    if (s.tradeOffer) return s.tradeOffer.to;
    return s.current;
  }

  function endGame(s, winnerId, reason) {
    s.phase = 'gameover';
    s.winner = winnerId;
    s.endReason = reason;
    s.debts = [];
    s.auction = null;
    s.tradeOffer = null;
    s.targetPick = null;
    s.cardQuiz = null;
    log(s, `🏆 게임 종료! ${P(s, winnerId).name} 승리! (${reason})`, 'big good');
    emit(s, { type: 'gameover', winner: winnerId });
  }
  function richest(s) {
    return alive(s).slice().sort((a, b) => netWorth(s, b.id) - netWorth(s, a.id))[0].id;
  }

  // 매 행동 후: 게임 종료 판정, 파산한 현재 플레이어의 턴 넘기기
  function settle(s) {
    if (s.phase === 'gameover') return;
    const live = alive(s);
    if (live.length === 1) return endGame(s, live[0].id, '마지막까지 살아남은 햄스터');
    const human = s.players.find((p) => !p.isAI);
    if (human && human.bankrupt) return endGame(s, richest(s), `${human.name} 파산`);
    if (P(s, s.current).bankrupt && !s.debts.length && !s.auction) nextTurn(s);
  }

  function nextTurn(s) {
    s.tradeOffer = null;
    s.targetPick = null;
    s.cardQuiz = null;
    s.pendingBuy = null;
    s.pendingBuild = null;
    s.pendingTakeover = null;
    s.doublesCount = 0;
    s.rollAgain = false;
    s.turnFlags = {};
    let next = s.current, newRound = false;
    do {
      next = (next + 1) % s.players.length;
      if (next === 0) { s.round++; newRound = true; }
    } while (P(s, next).bankrupt);
    s.current = next;
    s.phase = 'preRoll';
    if (s.options.turnLimit && s.round > s.options.turnLimit) {
      return endGame(s, richest(s), `${s.options.turnLimit}바퀴 종료 · 총자산 1위`);
    }
    if (newRound && s.round % WORLD_EVERY === 0) worldEvent(s);
    emit(s, { type: 'turn', pid: next });
  }

  function doRoll(s, pid) {
    const p = P(s, pid);
    const d = rollDice(s);
    s.dice = d;
    s.turnFlags.rolledOnce = true;
    s.turnFlags.managed = false;
    const dbl = d[0] === d[1];
    emit(s, { type: 'dice', dice: d, pid });
    log(s, `${p.name}: 🎲 ${d[0]} + ${d[1]} = ${d[0] + d[1]}${dbl ? ' (더블!)' : ''}`);
    s.phase = 'postRoll';

    if (p.inJail) {
      s.rollAgain = false;
      if (dbl) {
        p.inJail = false; p.jailTurns = 0;
        log(s, `${p.name}: 더블로 케이지 탈출!`, 'good');
      } else {
        p.jailTurns++;
        if (p.jailTurns < 3) { log(s, `${p.name}: 탈출 실패 (${p.jailTurns}/3)`); return; }
        log(s, `${p.name}: 3번째 실패 — 벌금 ${fmt(CONST.JAIL_FINE)} 내고 나갑니다.`, 'pay');
        p.inJail = false; p.jailTurns = 0;
        charge(s, pid, null, CONST.JAIL_FINE, '케이지 벌금');
        if (p.bankrupt) return;
      }
      moveBy(s, pid, d[0] + d[1]);
      return landOn(s, pid);
    }

    if (dbl) {
      s.doublesCount++;
      if (s.doublesCount === 3) {
        log(s, `${p.name}: 3연속 더블! 과속으로 케이지행`, 'bad');
        return sendToJail(s, pid);
      }
    }
    s.rollAgain = dbl;
    moveBy(s, pid, d[0] + d[1]);
    landOn(s, pid);
  }

  // ---------- 공개 API: 모든 행동은 act()로 ----------
  // 반환: '' (성공) 또는 실패 사유 문자열
  function act(s, pid, a) {
    const err = actInner(s, pid, a);
    if (!err) settle(s);
    return err;
  }

  function actInner(s, pid, a) {
    if (s.phase === 'gameover') return '게임이 끝났어요';
    const p = P(s, pid);
    if (!p || p.bankrupt) return '파산한 플레이어예요';
    const isActor = actor(s) === pid;
    const myTurnFree = s.current === pid && !s.debts.length && !s.targetPick && !s.cardQuiz && !s.auction && !s.tradeOffer;

    switch (a.type) {
      case 'roll':
        if (!myTurnFree) return '지금은 굴릴 수 없어요';
        if (s.phase === 'preRoll' || (s.phase === 'postRoll' && s.rollAgain)) { doRoll(s, pid); return ''; }
        return '지금은 굴릴 수 없어요';

      case 'payFine':
        if (!myTurnFree || s.phase !== 'preRoll' || !p.inJail) return '케이지에 있지 않아요';
        if (p.money < CONST.JAIL_FINE) return '해바라기씨가 부족해요';
        transfer(s, pid, null, CONST.JAIL_FINE);
        p.inJail = false; p.jailTurns = 0;
        log(s, `${p.name}: 벌금 ${fmt(CONST.JAIL_FINE)} 내고 케이지 탈출`, 'pay');
        return '';

      case 'useJailCard': {
        if (!myTurnFree || s.phase !== 'preRoll' || !p.inJail) return '케이지에 있지 않아요';
        if (!p.jailCards.length) return '탈출권이 없어요';
        const deck = p.jailCards.shift();
        s.decks[deck].push(jailCardId(deck));
        p.inJail = false; p.jailTurns = 0;
        log(s, `${p.name}: 케이지 탈출권 사용!`, 'good');
        return '';
      }

      case 'buy': {
        if (!myTurnFree || s.phase !== 'buy') return '살 수 있는 땅이 없어요';
        const i = s.pendingBuy, sp = BOARD[i];
        if (p.money < sp.price) return '해바라기씨가 부족해요';
        p.money -= sp.price;
        emit(s, { type: 'money', pid, delta: -sp.price });
        s.props[i].owner = pid;
        s.pendingBuy = null;
        s.phase = 'postRoll';
        emit(s, { type: 'buy', pid, pos: i });
        log(s, `${p.name}: ${sp.name} 구매! (${fmt(sp.price)})`, 'good');
        return '';
      }

      case 'decline': {
        if (!myTurnFree || s.phase !== 'buy') return '살 수 있는 땅이 없어요';
        const i = s.pendingBuy;
        s.pendingBuy = null;
        s.phase = 'postRoll';
        log(s, `${p.name}: ${BOARD[i].name} 구매 안 함`);
        startAuction(s, i);
        return '';
      }

      case 'endTurn':
        if (!myTurnFree || s.phase !== 'postRoll') return '아직 턴을 끝낼 수 없어요';
        if (s.rollAgain) return '더블! 한 번 더 굴려야 해요';
        nextTurn(s);
        return '';

      case 'bid': {
        if (!s.auction || !isActor) return '내 입찰 차례가 아니에요';
        const amt = Math.floor(a.amount);
        if (amt <= s.auction.bid) return '현재 최고가보다 높아야 해요';
        if (amt > p.money) return '해바라기씨가 부족해요';
        s.auction.bid = amt;
        s.auction.bidder = pid;
        s.auction.idx = (s.auction.idx + 1) % s.auction.active.length;
        log(s, `${p.name}: ${fmt(amt)} 입찰`);
        emit(s, { type: 'bid', pid, amount: amt });
        auctionCheck(s);
        return '';
      }

      case 'pass': {
        if (!s.auction || !isActor) return '내 입찰 차례가 아니에요';
        s.auction.active.splice(s.auction.idx, 1);
        log(s, `${p.name}: 경매 포기`);
        auctionCheck(s);
        return '';
      }

      case 'build': {
        const e = canBuild(s, pid, a.pos);
        if (e) return e;
        doBuild(s, pid, a.pos);
        return '';
      }
      case 'sell': {
        const e = canSell(s, pid, a.pos);
        if (e) return e;
        doSell(s, pid, a.pos);
        return '';
      }
      case 'mortgage': {
        const e = canMortgage(s, pid, a.pos);
        if (e) return e;
        doMortgage(s, pid, a.pos);
        return '';
      }
      case 'unmortgage': {
        const e = canUnmortgage(s, pid, a.pos);
        if (e) return e;
        doUnmortgage(s, pid, a.pos);
        return '';
      }

      case 'cardQuizAnswer': {
        const cq = s.cardQuiz;
        if (!cq || cq.pid !== pid) return '풀 문제가 없어요';
        s.cardQuiz = null;
        const dk = s.decks[cq.deck], dname = cq.deck === 'chance' ? '🌻 찬스' : '🐹 볼주머니';
        if (cq.id != null && dk[0] !== cq.id && dk.includes(cq.id)) { dk.splice(dk.indexOf(cq.id), 1); dk.unshift(cq.id); }
        // 좋은 카드: 맞히면 발동, 틀리면 무효 / 나쁜 카드: 맞히면 피함, 틀리면 발동
        const fire = cq.bad ? !a.correct : !!a.correct;
        if (fire) {
          log(s, `${p.name}: ${a.correct ? '문제를 맞혀' : '문제를 틀려'} ${dname} 카드 발동!`, a.correct ? 'good' : 'bad');
          drawCard(s, pid, cq.deck);
        } else {
          dk.push(dk.shift()); // 쓰지 않은 카드는 덱 맨 아래로
          log(s, cq.bad ? `${p.name}: 문제를 맞혀 나쁜 ${dname} 카드를 피했어요!` : `${p.name}: 문제를 틀려 ${dname} 카드가 무효!`, cq.bad ? 'good' : 'bad');
          emit(s, { type: 'cardVoid', pid, deck: cq.deck, avoided: !!cq.bad });
        }
        return '';
      }

      case 'landBuild': {
        if (!myTurnFree || s.phase !== 'build') return '지금은 지을 수 없어요';
        const i = s.pendingBuild;
        const e = canLandBuild(s, pid, i);
        if (e) return e;
        s.pendingBuild = null;
        s.phase = 'postRoll';
        doBuild(s, pid, i);
        return '';
      }
      case 'takeover': {
        if (!myTurnFree || s.phase !== 'takeover') return '지금은 매입할 수 없어요';
        const i = s.pendingTakeover;
        const e = canTakeover(s, pid, i);
        if (e) return e;
        const pr = s.props[i], from = pr.owner, price = takeoverPrice(s, i);
        s.pendingTakeover = null;
        s.phase = 'postRoll';
        transfer(s, pid, from, price);
        pr.owner = pid;
        emit(s, { type: 'takeover', pid, from, pos: i, price });
        log(s, `${p.name}: ${P(s, from).name}의 ${BOARD[i].name}${pr.houses ? `(건물 ${pr.houses === 5 ? '궁전' : pr.houses + '채'} 포함)` : ''} 강제 매입! (${fmt(price)})`, 'big');
        return '';
      }
      case 'skipTakeover':
        if (!myTurnFree || s.phase !== 'takeover') return '지금은 할 수 없어요';
        s.pendingTakeover = null;
        s.phase = 'postRoll';
        return '';

      case 'skipBuild':
        if (!myTurnFree || s.phase !== 'build') return '지금은 할 수 없어요';
        s.pendingBuild = null;
        s.phase = 'postRoll';
        return '';

      case 'teleport': {
        if (!myTurnFree || s.phase !== 'teleport') return '텔레포트 칸이 아니에요';
        const to = Math.floor(a.to);
        if (!(to >= 0 && to < 40)) return '없는 칸이에요';
        s.phase = 'postRoll';
        if (to === p.pos) { log(s, `${p.name}: 텔레포트하지 않고 그대로 있어요`); return ''; }
        const passed = to < p.pos;
        emit(s, { type: 'teleport', pid, from: p.pos, to });
        p.pos = to;
        log(s, `${p.name}: 🌀 ${BOARD[to].name}(으)로 순간이동!`);
        if (passed) passGo(s, pid, to === 0);
        landOn(s, pid);
        return '';
      }

      case 'forfeitRoll': // 주사위 문제를 3번 틀려 이번 굴리기 기회를 잃음
        if (!myTurnFree) return '지금은 할 수 없어요';
        if (!(s.phase === 'preRoll' || (s.phase === 'postRoll' && s.rollAgain))) return '굴릴 차례가 아니에요';
        if (p.inJail && s.phase === 'preRoll') p.jailTurns = Math.min(p.jailTurns + 1, 2); // 탈출 시도 1번으로 침 (3번째는 직접 굴려야 함)
        s.phase = 'postRoll';
        s.rollAgain = false;
        s.turnFlags.rolledOnce = true;
        log(s, `${p.name}: 주사위 문제 3번 틀림 — 이번 주사위 기회가 넘어가요`, 'bad');
        emit(s, { type: 'forfeit', pid });
        return '';

      case 'pickTarget': {
        const tp = s.targetPick;
        if (!tp || tp.pid !== pid) return '고를 공격 대상이 없어요';
        if (!tp.targets.includes(a.target)) return '그 햄스터는 고를 수 없어요';
        s.targetPick = null;
        applyAttack(s, pid, a.target, tp.act);
        return '';
      }

      case 'proposeTrade': {
        if (s.auction || s.tradeOffer || s.debts.length || s.targetPick || s.cardQuiz) return '지금은 거래할 수 없어요';
        const o = normalizeOffer(Object.assign({}, a.offer, { from: pid }));
        const e = validateTrade(s, o);
        if (e) return e;
        const target = P(s, o.to);
        log(s, `${p.name} → ${target.name}: 거래 제안 (${describeOffer(s, o)})`);
        if (target.isAI) {
          const ok = hooks.evaluateTrade ? hooks.evaluateTrade(s, o) : false;
          emit(s, { type: 'tradeResult', offer: o, accepted: ok });
          if (ok) executeTrade(s, o);
          else log(s, `${target.name}: 거절! 찍찍.`, 'bad');
        } else {
          s.tradeOffer = o;
        }
        return '';
      }

      case 'respondTrade': {
        const o = s.tradeOffer;
        if (!o || o.to !== pid) return '받은 제안이 없어요';
        s.tradeOffer = null;
        emit(s, { type: 'tradeResult', offer: o, accepted: !!a.accept });
        if (!a.accept) { log(s, `${p.name}: 거래 거절`); return ''; }
        if (validateTrade(s, o)) { log(s, '거래 조건이 바뀌어 성사되지 않았어요.'); return ''; }
        executeTrade(s, o);
        return '';
      }

      case 'payDebt': {
        const d = s.debts[0];
        if (!d || d.debtor !== pid) return '갚을 빚이 없어요';
        if (p.money < d.amount) return `${fmt(d.amount - p.money)}이(가) 더 필요해요`;
        s.debts.shift();
        transfer(s, pid, d.to, d.amount);
        log(s, `${p.name}: ${fmt(d.amount)} 지불 완료`);
        return '';
      }

      case 'bankrupt': {
        const d = s.debts[0];
        if (!d || d.debtor !== pid) return '빚이 없을 때는 파산할 수 없어요';
        bankrupt(s, pid, d.to);
        return '';
      }

      default:
        return '알 수 없는 행동';
    }
  }

  // 어떤 땅을 사거나 낙찰받으면 그룹이 완성되는지 / 상대 독점을 막는지
  function wouldComplete(s, pid, i) {
    const sp = BOARD[i];
    if (sp.type !== 'prop') return false;
    return groupMembers(i).every((m) => m === i || s.props[m].owner === pid);
  }
  function wouldBlock(s, pid, i) {
    const sp = BOARD[i];
    if (sp.type !== 'prop') return false;
    const others = groupMembers(i).filter((m) => m !== i).map((m) => s.props[m].owner);
    return others.length > 0 && others[0] !== null && others[0] !== pid && others.every((o) => o === others[0]);
  }

  const api = {
    hooks, newGame, act, actor, netWorth, calcRent, canBuild, canSell, canMortgage, canUnmortgage,
    unmortgageCost, mortgageInterest, ownsGroup, hasMonopoly, groupHasBuildings, ownedBy, countType,
    buildingCounts, validateTrade, normalizeOffer, describeOffer, wouldComplete, wouldBlock,
    groupMembers, isBuyable, rand, fmt, attackTargets, peekDice, canLandBuild, isBadCard, canTakeover, takeoverPrice, TAKEOVER_RATE, rentMult, WORLD, WORLD_EVERY,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(this);
