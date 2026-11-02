// 햄스터 월드 투어 — 컴퓨터 플레이어
// AI.step(s, pid) 는 엔진 행동을 "하나" 수행하고 설명을 돌려준다 (UI가 한 걸음씩 연출).
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./data.js') : root.GameData;
  const E = isNode ? require('./engine.js') : root.Engine;
  const { BOARD, GROUPS } = D;

  // 거래 공격성은 어려움 = 쉬움 × 3, 보통 = × 2 (prd-2 §6.1)
  const CFG = {
    easy:   { buyReserve: 50,  buildReserve: 300, maxBuilds: 1,  auctionFactor: 0.8,  bonus: false, tradeProb: 0.10, maxOffers: 2, premium: 0.10, tradeWeight: 0.5, hotelHold: false },
    normal: { buyReserve: 150, buildReserve: 200, maxBuilds: 99, auctionFactor: 1.0,  bonus: true,  tradeProb: 0.20, maxOffers: 4, premium: 0.20, tradeWeight: 0.8, hotelHold: false },
    hard:   { buyReserve: 100, buildReserve: 150, maxBuilds: 99, auctionFactor: 1.15, bonus: true,  tradeProb: 0.30, maxOffers: 6, premium: 0.30, tradeWeight: 1.0, hotelHold: true },
  };
  const cfgOf = (s, pid) => CFG[s.players[pid].difficulty] || CFG.normal;
  // 어려움 AI가 선호하는 그룹 (착지 확률이 높은 주황·빨강)
  const FAVORED = { orange: 1.25, red: 1.2, airport: 1.1 };

  const LINES = {
    buy: ['찍찍! {city}는 내 거야!', '{city} 냠냠, 볼주머니에 쏙!', '{city} 땅 샀다~'],
    rent: ['통행료 고마워~ 찍!', '해바라기씨 맛있다!', '볼이 빵빵해졌어!'],
    pay: ['흑흑, 내 해바라기씨…', '찍… 비싸다', '다음엔 내가 받을 거야!'],
    jail: ['케이지는 싫어… Zzz', '잠깐 낮잠 좀 잘게'],
    build: ['뚝딱뚝딱! 굴 완성!', '여기 내 아지트야!'],
    trade: ['거래하자, 찍?', '좋은 제안이 있어!'],
  };
  function say(s, pid, kind, vars) {
    const arr = LINES[kind];
    let t = arr[Math.floor(E.rand(s) * arr.length)];
    for (const k in vars || {}) t = t.replace('{' + k + '}', vars[k]);
    s.events.push({ type: 'speech', pid, text: t });
  }

  // ---------- 평가 함수 ----------
  function opponentBuildingDanger(s, pid) {
    let n = 0;
    for (const i in s.props) {
      const pr = s.props[i];
      if (pr.owner !== null && pr.owner !== pid) n += pr.houses;
    }
    return n;
  }
  function unownedCount(s) {
    return Object.values(s.props).filter((pr) => pr.owner === null).length;
  }

  function propValue(s, pid, i) {
    const sp = BOARD[i];
    let v = sp.price;
    const c = cfgOf(s, pid);
    if (c.bonus) v *= FAVORED[sp.group] || 1;
    return v;
  }

  // 소유 지도(owners: {pos: pid})로 플레이어의 가치 점수를 계산
  function scoreFor(s, pid, owners, money) {
    let score = money;
    for (const i in owners) {
      if (owners[i] !== pid) continue;
      const pr = s.props[i];
      score += pr.mortgaged ? BOARD[i].price * 0.5 : BOARD[i].price;
    }
    for (const g in GROUPS) {
      if (g === 'airport' || g === 'util') continue;
      const m = GROUPS[g].members;
      if (m.every((x) => owners[x] === pid)) {
        score += m.reduce((sum, x) => sum + BOARD[x].price, 0) * 1.5;
      }
    }
    const airports = GROUPS.airport.members.filter((x) => owners[x] === pid).length;
    score += [0, 0, 50, 150, 300][airports];
    return score;
  }

  function evaluateTrade(s, o) {
    const me = o.to, opp = o.from;
    const c = cfgOf(s, me);
    const before = {};
    for (const i in s.props) before[i] = s.props[i].owner;
    const after = Object.assign({}, before);
    for (const i of o.give.props) after[i] = me;
    for (const i of o.get.props) after[i] = opp;
    const myMoney = s.players[me].money, oppMoney = s.players[opp].money;
    const cardVal = 40;
    const myAfterMoney = myMoney + o.give.money - o.get.money + (o.give.cards - o.get.cards) * cardVal;
    const oppAfterMoney = oppMoney - o.give.money + o.get.money - (o.give.cards - o.get.cards) * cardVal;
    if (myMoney + o.give.money - o.get.money < 0) return false;
    const myDelta = scoreFor(s, me, after, myAfterMoney) - scoreFor(s, me, before, myMoney);
    const oppDelta = scoreFor(s, opp, after, oppAfterMoney) - scoreFor(s, opp, before, oppMoney);
    const margin = s.players[me].difficulty === 'hard' ? 20 : 0;
    return myDelta - c.tradeWeight * Math.max(0, oppDelta) > margin;
  }

  // ---------- 현금 마련 (빚) ----------
  function raiseCash(s, pid, amount) {
    const p = s.players[pid];
    let guard = 200;
    while (p.money < amount && guard-- > 0) {
      const mine = E.ownedBy(s, pid);
      // 1) 독점이 아닌 땅부터 저당 (가치 낮은 순)
      const loose = mine.filter((i) => !E.canMortgage(s, pid, i) && !E.hasMonopoly(s, pid, i))
        .sort((a, b) => BOARD[a].mortgage - BOARD[b].mortgage);
      if (loose.length) { E.act(s, pid, { type: 'mortgage', pos: loose[0] }); continue; }
      // 2) 건물 매각 (싼 그룹부터)
      const sellable = mine.filter((i) => !E.canSell(s, pid, i)).sort((a, b) => BOARD[a].house - BOARD[b].house);
      if (sellable.length) { E.act(s, pid, { type: 'sell', pos: sellable[0] }); continue; }
      // 3) 남은 땅 저당
      const rest = mine.filter((i) => !E.canMortgage(s, pid, i)).sort((a, b) => BOARD[a].mortgage - BOARD[b].mortgage);
      if (rest.length) { E.act(s, pid, { type: 'mortgage', pos: rest[0] }); continue; }
      break;
    }
  }

  // ---------- 결정 ----------
  function decideBuy(s, pid) {
    const i = s.pendingBuy, sp = BOARD[i], p = s.players[pid], c = cfgOf(s, pid);
    if (p.money < sp.price) return false;
    const left = p.money - sp.price;
    if (p.difficulty === 'easy') return left >= c.buyReserve;
    const key = E.wouldComplete(s, pid, i) || E.wouldBlock(s, pid, i);
    if (key) return left >= 20;
    if (p.difficulty === 'hard') {
      const early = s.round < 10 ? 50 : c.buyReserve;
      return left >= (FAVORED[sp.group] ? Math.min(early, 60) : early);
    }
    return left >= c.buyReserve;
  }

  function auctionMax(s, pid) {
    const i = s.auction.pos, sp = BOARD[i], p = s.players[pid], c = cfgOf(s, pid);
    let v = sp.price * c.auctionFactor;
    if (c.bonus) {
      v *= FAVORED[sp.group] || 1;
      if (E.wouldComplete(s, pid, i)) v *= 1.6;
      else if (E.wouldBlock(s, pid, i)) v *= 1.4;
    }
    return Math.floor(Math.min(v, p.money - 50));
  }

  function decideJail(s, pid) {
    const p = s.players[pid];
    const leave = p.difficulty === 'easy' || unownedCount(s) > 8 || opponentBuildingDanger(s, pid) < 6;
    if (!leave) return 'roll';
    if (p.jailCards.length) return 'useJailCard';
    if (p.money >= 50 + (p.difficulty === 'easy' ? 0 : 100)) return 'payFine';
    return 'roll';
  }

  // 건설·저당 해제 — 한 번에 묶어서 수행. 무엇이든 했으면 true
  function manage(s, pid) {
    const p = s.players[pid], c = cfgOf(s, pid);
    let did = false;
    // 저당 해제: 여유가 넉넉할 때, 독점 그룹부터
    const mortgaged = E.ownedBy(s, pid).filter((i) => s.props[i].mortgaged)
      .sort((a, b) => Number(E.hasMonopoly(s, pid, b)) - Number(E.hasMonopoly(s, pid, a)));
    for (const i of mortgaged) {
      if (p.money - E.unmortgageCost(i) >= c.buildReserve * 2) {
        if (!E.act(s, pid, { type: 'unmortgage', pos: i })) did = true;
      }
    }
    // 건설: 가장 적게 지어진 곳부터 (자연스럽게 3채까지 고르게 올라감)
    let builds = 0;
    while (builds < c.maxBuilds) {
      let cands = E.ownedBy(s, pid).filter((i) => !E.canBuild(s, pid, i));
      if (c.hotelHold && s.bankHouses <= 12) cands = cands.filter((i) => s.props[i].houses < 4); // 주택 품절 전략
      cands = cands.filter((i) => p.money - BOARD[i].house >= c.buildReserve);
      if (!cands.length) break;
      cands.sort((a, b) => s.props[a].houses - s.props[b].houses || BOARD[b].rent[3] - BOARD[a].rent[3]);
      E.act(s, pid, { type: 'build', pos: cands[0] });
      builds++;
      did = true;
    }
    if (builds) say(s, pid, 'build');
    return did;
  }

  // 독점을 완성하기 위한 거래 제안 만들기
  function makeOffer(s, pid) {
    const c = cfgOf(s, pid), p = s.players[pid];
    for (const g in GROUPS) {
      if (g === 'airport' || g === 'util') continue;
      const m = GROUPS[g].members;
      const missing = m.filter((x) => s.props[x].owner !== pid);
      if (missing.length !== 1) continue;
      const want = missing[0], owner = s.props[want].owner;
      if (owner === null || s.players[owner].bankrupt) continue;
      if (E.groupHasBuildings(s, want)) continue;
      const mem = s.aiMem;
      const ckey = pid + '>' + owner;
      if ((mem.offers[ckey] || 0) >= c.maxOffers) continue;
      // A) 맞교환: 상대도 하나만 모자란 그룹의 땅을 내가 갖고 있으면
      let offer = null;
      for (const h in GROUPS) {
        if (h === g || h === 'airport' || h === 'util') continue;
        const hm = GROUPS[h].members;
        const theirMissing = hm.filter((x) => s.props[x].owner !== owner);
        if (theirMissing.length === 1 && s.props[theirMissing[0]].owner === pid && !E.groupHasBuildings(s, theirMissing[0])) {
          offer = { from: pid, to: owner, give: { props: [theirMissing[0]], money: 0, cards: 0 }, get: { props: [want], money: 0, cards: 0 } };
          break;
        }
      }
      // B) 현금 매입: 땅값 + 난이도별 웃돈
      if (!offer) {
        const cash = Math.ceil(BOARD[want].price * (1 + c.premium));
        if (p.money - cash < 150) continue;
        offer = { from: pid, to: owner, give: { props: [], money: cash, cards: 0 }, get: { props: [want], money: 0, cards: 0 } };
      }
      const rkey = JSON.stringify([offer.from, offer.to, offer.give, offer.get]);
      if ((mem.rejected[rkey] || 0) > s.round) continue;
      return { offer, rkey, ckey };
    }
    return null;
  }

  function tryTrade(s, pid) {
    const c = cfgOf(s, pid);
    if (E.rand(s) >= c.tradeProb) return '';
    const made = makeOffer(s, pid);
    if (!made) return '';
    s.aiMem.offers[made.ckey] = (s.aiMem.offers[made.ckey] || 0) + 1;
    const target = s.players[made.offer.to];
    say(s, pid, 'trade');
    const before = s.log.length;
    E.act(s, pid, { type: 'proposeTrade', offer: made.offer });
    if (!target.isAI) {
      s.aiMem.pending = made.rkey; // 사람의 응답을 기다림
      return 'trade';
    }
    // 컴퓨터 상대는 즉시 판정됨 — 거절이면 기록
    if (!s.log.slice(before).some((l) => l.text.includes('거래 성사'))) s.aiMem.rejected[made.rkey] = s.round + 3;
    return 'trade';
  }

  // 사람이 AI 제안을 거절하면 UI/엔진 이후 호출: 3바퀴 동안 같은 제안 금지
  function noteRejected(s) {
    if (s.aiMem.pending) s.aiMem.rejected[s.aiMem.pending] = s.round + 3;
    s.aiMem.pending = null;
  }

  // ---------- 한 걸음 ----------
  function step(s, pid) {
    const p = s.players[pid];
    if (s.debts.length && s.debts[0].debtor === pid) {
      raiseCash(s, pid, s.debts[0].amount);
      if (p.money >= s.debts[0].amount) return E.act(s, pid, { type: 'payDebt' }) || 'payDebt';
      E.act(s, pid, { type: 'bankrupt' });
      return 'bankrupt';
    }
    if (s.cardQuiz && s.cardQuiz.pid === pid) { E.act(s, pid, { type: 'cardQuizAnswer', correct: true }); return 'cardQuiz'; } // 안전장치: 컴퓨터는 문제를 풀지 않음
    if (s.targetPick && s.targetPick.pid === pid) {
      // 철거는 건물이 가장 비싼 상대, 나머지는 총자산 1위 상대를 노린다
      const tp = s.targetPick;
      const score = (tid) => tp.act.kind === 'demolish'
        ? E.ownedBy(s, tid).reduce((n, i) => n + s.props[i].houses * BOARD[i].house, 0)
        : E.netWorth(s, tid);
      const target = tp.targets.slice().sort((x, y) => score(y) - score(x))[0];
      s.events.push({ type: 'speech', pid, text: `에잇! ${s.players[target].name}, 각오해!` });
      E.act(s, pid, { type: 'pickTarget', target });
      return 'attack';
    }
    if (s.auction) {
      const max = auctionMax(s, pid);
      const next = s.auction.bid + (s.auction.bid < 100 ? 10 : 20);
      if (next <= max) { E.act(s, pid, { type: 'bid', amount: s.auction.bid === 0 ? Math.min(max, Math.max(10, Math.floor(BOARD[s.auction.pos].price * 0.3))) : next }); return 'bid'; }
      E.act(s, pid, { type: 'pass' });
      return 'pass';
    }
    if (s.tradeOffer && s.tradeOffer.to === pid) {
      E.act(s, pid, { type: 'respondTrade', accept: evaluateTrade(s, s.tradeOffer) });
      return 'respondTrade';
    }
    if (s.current !== pid) return '';

    if (s.phase === 'preRoll') {
      if (!s.turnFlags.tradeTried) {
        s.turnFlags.tradeTried = true;
        if (tryTrade(s, pid)) return 'trade';
      }
      if (!s.turnFlags.managedPre) {
        s.turnFlags.managedPre = true;
        if (manage(s, pid)) return 'manage';
      }
      if (p.inJail) {
        const choice = decideJail(s, pid);
        if (choice !== 'roll' && !E.act(s, pid, { type: choice })) return choice;
      }
      E.act(s, pid, { type: 'roll' });
      if (p.inJail) say(s, pid, 'jail');
      return 'roll';
    }
    if (s.phase === 'buy') {
      const pos = s.pendingBuy;
      if (decideBuy(s, pid)) {
        E.act(s, pid, { type: 'buy' });
        say(s, pid, 'buy', { city: BOARD[pos].name });
        return 'buy';
      }
      E.act(s, pid, { type: 'decline' });
      return 'decline';
    }
    if (s.phase === 'build') { // 내 땅 도착: 여유가 있으면 한 단계 짓기
      const i = s.pendingBuild;
      if (P_money(s, pid) - BOARD[i].house >= cfgOf(s, pid).buildReserve && !E.act(s, pid, { type: 'landBuild' })) { say(s, pid, 'build'); return 'landBuild'; }
      E.act(s, pid, { type: 'skipBuild' });
      return 'skipBuild';
    }
    if (s.phase === 'takeover') { // 색을 완성하거나, 건물이 있고 여유가 넉넉하면 매입
      const i = s.pendingTakeover, c = cfgOf(s, pid), price = E.takeoverPrice(s, i);
      const left = P_money(s, pid) - price;
      const want = left >= c.buildReserve && (E.wouldComplete(s, pid, i) || (s.props[i].houses > 0 && left >= 2 * c.buildReserve));
      if (want && !E.act(s, pid, { type: 'takeover' })) { s.events.push({ type: 'speech', pid, text: `${BOARD[i].name}, 이제 내 거야! 찍찍` }); return 'takeover'; }
      E.act(s, pid, { type: 'skipTakeover' });
      return 'skipTakeover';
    }
    if (s.phase === 'teleport') {
      E.act(s, pid, { type: 'teleport', to: pickTeleport(s, pid) });
      return 'teleport';
    }
    if (s.phase === 'postRoll') {
      if (!s.turnFlags.managed) {
        s.turnFlags.managed = true;
        if (manage(s, pid)) return 'manage';
      }
      if (s.rollAgain) { E.act(s, pid, { type: 'roll' }); return 'roll'; }
      E.act(s, pid, { type: 'endTurn' });
      return 'endTurn';
    }
    return '';
  }

  const P_money = (s, pid) => s.players[pid].money;
  // 텔레포트 목적지: 살 수 있는 빈 땅 중 가장 좋은 곳 → 지을 수 있는 내 땅 → 출발 칸(🌻200)
  function pickTeleport(s, pid) {
    const c = cfgOf(s, pid), money = P_money(s, pid);
    let best = 0, bestScore = 0;
    for (let i = 0; i < 40; i++) {
      const pr = s.props[i];
      if (!pr) continue;
      let score = 0;
      if (pr.owner === null && money - BOARD[i].price >= c.buyReserve) {
        score = 500 + BOARD[i].price + (E.wouldComplete(s, pid, i) ? 1000 : 0) + (E.wouldBlock(s, pid, i) ? 300 : 0);
      } else if (pr.owner === pid && !E.canLandBuild(s, pid, i) && money - BOARD[i].house >= c.buildReserve) {
        score = 300 + BOARD[i].house;
      }
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  E.hooks.raiseCash = raiseCash;
  E.hooks.evaluateTrade = evaluateTrade;

  const api = { step, evaluateTrade, raiseCash, noteRejected, say, CFG };
  if (isNode) module.exports = api;
  else root.AI = api;
})(this);
