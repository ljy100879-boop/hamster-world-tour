// 햄스터 월드 투어 — 화면/연출. 규칙은 전부 Engine, 컴퓨터 판단은 AI가 맡는다.
(function () {
  'use strict';
  const { BOARD, GROUPS, HAMSTERS, CARDS } = GameData;
  const E = Engine;
  const SAVE_KEY = 'hwt.save';
  const DIFF_NAME = { easy: '쉬움', normal: '보통', hard: '어려움' };

  let S = null;          // 게임 상태
  let HUMAN = 0;         // 사람 플레이어 id
  let busy = false;      // 연출/컴퓨터 턴 진행 중
  let fast = false;      // 빨리 감기
  const disp = [];       // 화면에 그려진 말 위치 (애니메이션용, 상태와 별개)
  const cellEls = [];
  const layers = {};     // 모달 레이어: state(게임 진행), user(사용자가 연 창), card(카드 공개)
  const layerKey = {};
  let refreshing = false; // 열린 사용자 창을 상태 변화에 맞춰 다시 그리는 중

  const $ = (sel, el) => (el || document).querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = E.fmt;
  const hamOf = (p) => HAMSTERS[p.hamster];
  const tokColor = (p) => hamOf(p).color;
  const groupColor = (i) => (BOARD[i].group ? GROUPS[BOARD[i].group].color : '#c9b48f');
  const hopMs = () => (fast ? 55 : 165);
  const aiDelay = () => (fast ? 110 : 650);

  // 3D 아이콘(Fluent Emoji)과 국기(flag-icons) — 파일이 없으면 이모지 글자로 대체
  const ICONS = {
    "✈": "airplane", "⚡": "voltage", "💧": "droplet", "🌻": "sunflower",
    "🐹": "hamster", "💸": "money", "💎": "gem", "🏁": "goflag",
    "🔒": "locked", "🪵": "wood", "👮": "police",
  };
  const FALLBACK = "onerror=\"this.replaceWith(document.createTextNode(this.alt))\"";
  function iconHtml(emoji, cls) {
    const f = ICONS[emoji.replace(/️/g, "")];
    return f ? `<img class="ico ${cls || ""}" src="assets/icons/${f}.png" alt="${emoji}" ${FALLBACK}>` : emoji;
  }
  const flagCode = (sp) => [...sp.flag].map((ch) => String.fromCharCode(ch.codePointAt(0) - 0x1F1E6 + 97)).join("");
  function flagHtml(sp, cls) {
    return `<img class="flagimg ${cls || ""}" src="assets/flags/${flagCode(sp)}.svg" alt="${sp.flag}" ${FALLBACK}>`;
  }
  // 랜드마크 그림: assets/landmarks/<국가코드>.png (직접 만든 그림으로 덮어써도 됨)
  function landmarkHtml(sp, cls) {
    return `<img class="lm ${cls || ""}" src="assets/landmarks/${flagCode(sp)}.png" alt="${sp.landmark || ""}" title="${sp.landmark || ""}" onerror="this.remove()">`;
  }

  // ---------- 저장 ----------
  function save() {
    try {
      if (!S) return;
      if (S.phase === 'gameover') localStorage.removeItem(SAVE_KEY);
      else localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign({}, S, { events: [] })));
    } catch (e) { /* 저장 불가 환경 */ }
  }
  function loadSave() {
    try {
      const t = localStorage.getItem(SAVE_KEY);
      const s = t ? JSON.parse(t) : null;
      return s && s.version === 1 ? s : null;
    } catch (e) { return null; }
  }

  // ---------- 토스트 ----------
  let toastTimer = 0;
  function toast(text, ms) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2200);
  }

  // ---------- 모달 ----------
  function modal(layer, html, cls) {
    let back = layers[layer];
    if (!back) {
      back = document.createElement('div');
      back.className = 'modal-back';
      back.style.zIndex = { state: 50, user: 60, card: 70, quiz: 75 }[layer];
      if (layer === 'user') back.addEventListener('click', (e) => { if (e.target === back) closeModal('user'); });
      $('#modal-root').appendChild(back);
      layers[layer] = back;
    }
    const full = `<div class="modal ${cls || ''}">${html}</div>`;
    if (back._html !== full) { // 내용이 같으면 다시 그리지 않음 (클릭/입력 유지)
      back._html = full;
      back.innerHTML = full;
    }
    if (layer === 'user' && !refreshing) back._refresh = null;
    if (layer === 'user') clearAutoEnd();
    return back.firstElementChild;
  }
  function closeModal(layer) {
    if (layers[layer]) { layers[layer].remove(); layers[layer] = null; layerKey[layer] = null; }
    if (layer === 'user' && S && $('#actions')) renderActions();
  }

  // ---------- 시작 화면 ----------
  let pick = 0, aiCount = 3, aiDiff = 'normal';
  function initStart() {
    $('#start-hero').innerHTML = HAMSTERS.map((h) => Hamster.svg(h)).join('');
    renderPick();
    bindSeg('#ai-count', (v) => { aiCount = Number(v); });
    bindSeg('#ai-diff', (v) => { aiDiff = v; });
    $('#btn-start').onclick = startNew;
    const saved = loadSave();
    const cont = $('#btn-continue');
    cont.classList.toggle('hidden', !saved);
    cont.onclick = () => {
      S = loadSave();
      if (!S) return toast('저장된 게임이 없어요');
      HUMAN = S.players.findIndex((p) => !p.isAI);
      enterGame();
    };
  }
  function renderPick() {
    const box = $('#hamster-pick');
    box.innerHTML = HAMSTERS.map((h, k) => `<button type="button" data-k="${k}" class="${k === pick ? 'on' : ''}">${Hamster.svg(h)}${h.name}</button>`).join('');
    box.querySelectorAll('button').forEach((b) => { b.onclick = () => { pick = Number(b.dataset.k); Sound.squeak(); renderPick(); }; });
  }
  function bindSeg(sel, cb) {
    const box = $(sel);
    box.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        cb(b.dataset.v);
      };
    });
  }
  function startNew() {
    const name = $('#player-name').value.trim() || '나';
    const others = HAMSTERS.map((h, k) => k).filter((k) => k !== pick).slice(0, aiCount);
    const players = [{ name, hamster: pick, isAI: false }]
      .concat(others.map((k) => ({ name: HAMSTERS[k].name, hamster: k, isAI: true, difficulty: aiDiff })));
    const options = {
      freeParkingJackpot: $('#opt-jackpot').checked,
      exactGo400: $('#opt-go400').checked,
      turnLimit: $('#opt-limit').checked ? Number($('#opt-limit-n').value) : 0,
    };
    S = E.newGame({ players, options });
    HUMAN = S.players.findIndex((p) => !p.isAI);
    enterGame();
  }

  function enterGame() {
    cancelQuiz();
    resetMonoSeen();
    endFxDone = false;
    document.querySelectorAll('#end-fx').forEach((x) => x.remove());
    Object.keys(layers).forEach(closeModal);
    Sound.music(true);
    $('#start-screen').classList.add('hidden');
    $('#game-screen').classList.remove('hidden');
    S.events = [];
    $('#buildings').innerHTML = '';
    buildBoard();
    buildCenterDeco();
    buildDice();
    showRollResult(S.dice);
    sizeBoard();
    buildTokens();
    renderAll();
    Sound.squeak();
    pump();
  }
  function backToStart() {
    cancelQuiz();
    document.querySelectorAll('#end-fx').forEach((x) => x.remove());
    Object.keys(layers).forEach(closeModal);
    Sound.music(false);
    $('#game-screen').classList.add('hidden');
    $('#start-screen').classList.remove('hidden');
    initStart();
  }

  // ---------- 보드 ----------
  function cellPos(i) {
    if (i <= 10) return { row: 11, col: 11 - i };
    if (i <= 20) return { row: 11 - (i - 10), col: 1 };
    if (i <= 30) return { row: 1, col: 1 + (i - 20) };
    return { row: 1 + (i - 30), col: 11 };
  }
  function sideClass(i) {
    if (i % 10 === 0) return 'corner';
    if (i < 10) return 'side-bottom';
    if (i < 20) return 'side-left';
    if (i < 30) return 'side-top';
    return 'side-right';
  }
  function buildBoard() {
    const board = $('#board');
    board.querySelectorAll('.cell').forEach((c) => c.remove());
    BOARD.forEach((sp, i) => {
      const c = document.createElement('div');
      const pos = cellPos(i);
      c.className = `cell ${sideClass(i)}`;
      c.style.gridRow = pos.row;
      c.style.gridColumn = pos.col;
      c.dataset.i = i;
      let html;
      if (i % 10 === 0) {
        html = `<div class="ic">${iconHtml(sp.icon)}</div><div class="nm">${sp.name}</div>`;
      } else if (sp.type === 'prop') {
        html = `<div class="bar" style="background:${groupColor(i)}"></div>
          <div class="body"><div class="lmw">${landmarkHtml(sp)}</div><div class="nm${sp.name.length >= 7 ? ' long' : ''}">${sp.name.replace('부에노스', '부에노스<wbr>')}</div>
            <div class="meta">${flagHtml(sp)}<span class="pr">${fmt(sp.price)}</span></div></div>`;
      } else {
        const sub = sp.price ? fmt(sp.price) : sp.amount ? fmt(sp.amount) : '';
        html = `<div class="body"><div class="ic">${iconHtml(sp.icon)}</div><div class="nm">${sp.name}</div><div class="pr">${sub}</div></div>`;
      }
      c.innerHTML = html;
      c.onclick = () => (teleportMode() ? openTeleport(i) : openDetail(i));
      board.insertBefore(c, $('#tokens'));
      cellEls[i] = c;
    });
  }
  function renderCells() {
    for (const k in S.props) {
      const i = Number(k), pr = S.props[i], c = cellEls[i];
      c.classList.toggle('owned', pr.owner !== null);
      c.classList.toggle('mortgaged', pr.mortgaged);
      if (pr.owner !== null) c.style.setProperty('--owner', tokColor(S.players[pr.owner]));
      // 주인이 있으면 가격 대신 지금 통행료 (건물·세계 이벤트 반영)
      const prEl = c.querySelector('.pr');
      if (prEl && BOARD[i].type !== 'util') {
        const rentNow = pr.owner !== null && !pr.mortgaged ? E.calcRent(S, i, 7) : 0;
        const txt = rentNow ? '통행 ' + fmt(rentNow) : fmt(BOARD[i].price);
        if (prEl.textContent !== txt) prEl.textContent = txt;
        prEl.classList.toggle('rent', !!rentNow);
        prEl.classList.toggle('up', rentNow > 0 && E.rentMult(S, i) > 1);
        prEl.classList.toggle('down', rentNow > 0 && E.rentMult(S, i) < 1);
      }
      c.classList.toggle('festival', !!(S.world && S.world.kind === 'festival' && BOARD[i].group === S.world.group));
    }
    $('#board').classList.toggle('teleporting', teleportMode());
    renderBuildings();
  }

  // ---------- 건물 (보드 안쪽 가장자리에 서 있는 입체 건물) ----------
  // 칸의 안쪽(보드 가운데 쪽) 가장자리에 붙어 가운데 빈 공간으로 솟아 있다.
  const bldSide = (i) => (i < 10 ? 'gs-bottom' : i < 20 ? 'gs-left' : i < 30 ? 'gs-top' : 'gs-right');
  // 건물 그림: assets/buildings/house.png, palace.png (사용자 생성) → 없으면 기본 3D 아이콘
  function bldSrc(kind) {
    const own = kind === 'castle' ? 'palace' : 'house';
    return `src="assets/buildings/${own}.png" onerror="this.onerror=null;this.src='assets/icons/${kind}.png'"`;
  }
  function bldHtml(kind, anim) {
    return `<span class="bld ${kind}${anim ? ' standup' : ''}"><i class="gshadow"></i><img ${bldSrc(kind)} alt=""></span>`;
  }
  // only 를 주면 그 칸만 level 로 그리고(새 건물은 일어서는 연출), 아니면 상태 전체와 맞춘다.
  // 아직 연출되지 않은 건설 이벤트가 남은 칸은 건너뛴다 (연출 순서대로 하나씩 늘어나도록).
  function renderBuildings(only, level) {
    const layer = $('#buildings');
    const pending = new Set(S.events.filter((e) => e.type === 'build').map((e) => e.pos));
    for (const k in S.props) {
      const i = Number(k);
      if (only !== undefined ? i !== only : pending.has(i)) continue;
      const h = only !== undefined ? level : S.props[i].houses;
      let g = layer.querySelector(`[data-pos="${i}"]`);
      if (!h) { if (g) g.remove(); continue; }
      if (!g) {
        g = document.createElement('div');
        g.className = 'bld-group ' + bldSide(i);
        g.dataset.pos = i;
        layer.appendChild(g);
      }
      if (Number(g.dataset.h) === h) continue;
      const grew = h > Number(g.dataset.h || 0);
      g.dataset.h = h;
      g.classList.toggle('hotel', h === 5);
      g.innerHTML = h === 5
        ? bldHtml('castle', grew && only !== undefined)
        : Array.from({ length: h }, (_, n) => bldHtml('house', grew && only !== undefined && n === h - 1)).join('');
    }
    layoutBuildings();
  }
  function layoutBuildings() {
    const board = $('#board');
    const W = board.clientWidth, H = board.clientHeight;
    board.querySelectorAll('.bld-group').forEach((g) => {
      const i = Number(g.dataset.pos), c = cellEls[i];
      let x = c.offsetLeft + c.offsetWidth / 2, y = c.offsetTop + c.offsetHeight / 2;
      if (i < 10) y = c.offsetTop;
      else if (i < 20) x = c.offsetLeft + c.offsetWidth;
      else if (i < 30) y = c.offsetTop + c.offsetHeight;
      else x = c.offsetLeft;
      g.style.left = (x / W) * 100 + '%';
      g.style.top = (y / H) * 100 + '%';
    });
  }
  // 건설 연출: 크레인이 흔들리고 망치질 → 굴/궁전이 솟아오름
  async function buildAnim(pos, level) {
    // 창(모달)이 열려 있어도 보이도록 화면 기준(fixed)으로 칸 위에 띄운다
    const c = cellEls[pos], r = c.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.25;
    const el = document.createElement('div');
    el.className = 'construct' + (fast ? ' fast' : '');
    const bd = $('#board');
    el.style.fontSize = (bd.clientWidth + bd.clientHeight) / 200 + 'px'; // 1em = 보드 기준 단위(--u)
    el.style.left = r.left + r.width / 2 - size / 2 + 'px';
    el.style.top = r.top + r.height / 2 - size / 2 + 'px';
    el.style.width = el.style.height = size + 'px';
    const hotel = level === 5;
    el.innerHTML = `<img class="crane" src="assets/icons/construction.png" alt="">
      <i class="cshadow${hotel ? ' big' : ''}"></i><img class="rise${hotel ? ' big' : ''}" ${bldSrc(hotel ? 'castle' : 'house')} alt="">
      <img class="hammer" src="assets/icons/hammer.png" alt="">
      <span class="puff p1"></span><span class="puff p2"></span><span class="puff p3"></span>
      <span class="clabel">${hotel ? '햄스터 궁전 완성!' : `햄스터 굴 ${level}채`}</span>`;
    document.body.appendChild(el);
    highlight(pos);
    Sound.build();
    await sleep(fast ? 380 : 1250);
    el.remove();
    renderBuildings(pos, level);
    renderCells();
  }

  function highlight(i) {
    const c = cellEls[i];
    c.classList.remove('highlight');
    void c.offsetWidth;
    c.classList.add('highlight');
  }

  // ---------- 보드 가운데 해바라기씨 장식 ----------
  // 줄무늬 껍질 씨앗과 얼굴 있는 알맹이 씨앗을 가운데 내용(로고·주사위) 둘레에 화관처럼 둥글게 흩뿌린다
  const SEED_SHELL = `<svg viewBox="0 0 40 60" aria-hidden="true">
    <path d="M20 2 C34 14 38 38 20 58 C2 38 6 14 20 2Z" fill="#3d3a40"/>
    <path d="M20 7 Q25 31 20 53" stroke="#efe9dc" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path d="M12.5 15 Q13.5 35 18 51" stroke="#c9c1b0" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M27.5 15 Q26.5 35 22 51" stroke="#c9c1b0" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="14" cy="16" rx="3" ry="6" fill="#fff" opacity=".25" transform="rotate(-18 14 16)"/></svg>`;
  const SEED_KERNEL = `<svg viewBox="0 0 40 60" aria-hidden="true">
    <path d="M20 4 C33 15 36 38 20 56 C4 38 7 15 20 4Z" fill="#f6e6c2" stroke="#d8bf8a" stroke-width="2"/>
    <circle cx="15" cy="30" r="2.3" fill="#3b2a1a"/><circle cx="25" cy="30" r="2.3" fill="#3b2a1a"/>
    <circle cx="15.7" cy="29.2" r=".8" fill="#fff"/><circle cx="25.7" cy="29.2" r=".8" fill="#fff"/>
    <ellipse cx="12" cy="35" rx="2.6" ry="1.5" fill="#f59bb0" opacity=".8"/><ellipse cx="28" cy="35" rx="2.6" ry="1.5" fill="#f59bb0" opacity=".8"/>
    <path d="M18 35 Q20 37.5 22 35" stroke="#3b2a1a" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;
  function buildCenterDeco() {
    const center = $('.center');
    if ($('.center-deco', center)) return;
    const deco = document.createElement('div');
    deco.className = 'center-deco';
    const N = 18;
    let html = '';
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2 + 0.15;
      const r = 0.41 + (k % 3) * 0.025;                 // 화관 반지름(가운데 영역 대비)
      const x = 50 + Math.cos(a) * r * 100;
      const y = 50 + Math.sin(a) * r * 100;
      const kernel = k % 3 === 1;                       // 셋 중 하나는 얼굴 있는 알맹이
      const size = kernel ? 5.2 : 3.6 + (k % 2) * 0.8;
      const rot = (a * 180) / Math.PI + 90 + ((k * 37) % 50) - 25;
      html += `<span class="seed${kernel ? ' kernel' : ''}" style="left:${x}%;top:${y}%;--sz:${size};--rot:${rot}deg;--delay:${(k % 6) * -0.9}s">${kernel ? SEED_KERNEL : SEED_SHELL}</span>`;
    }
    // 네 귀퉁이에 작은 씨앗 무더기
    [[10, 12], [90, 12], [10, 88], [90, 88]].forEach(([x, y], k) => {
      for (let j = 0; j < 3; j++) {
        html += `<span class="seed small" style="left:${x + (j - 1) * 3}%;top:${y + (j % 2) * 3}%;--sz:2.6;--rot:${k * 50 + j * 70}deg;--delay:${-j}s">${SEED_SHELL}</span>`;
      }
    });
    deco.innerHTML = html;
    center.insertBefore(deco, center.firstChild);
  }

  // ---------- 보드 크기 ----------
  // 화면 높이를 꽉 채우고, 넓은 화면에서는 가로로 최대 1.45배까지 늘린다 (좁은 화면은 정사각형)
  function sizeBoard() {
    const board = $('#board');
    const W = board.parentElement.clientWidth;
    const narrow = window.innerWidth <= 900;
    // 900px 이하: 보드(정사각형)는 아래 하단 시트 자리를 남기고 화면 높이 안에 들어가게 (BUG-004)
    // 세로가 아주 낮은 화면(휴대폰 가로 등)은 시트 최소 높이를 120px로 줄여 보드·굴리기 버튼이 보이게
    const sheetMin = window.innerHeight < 560 ? 120 : 200;
    const h = narrow ? Math.min(W, Math.max(240, window.innerHeight - sheetMin - 24)) : Math.min(W, Math.max(320, window.innerHeight - 24));
    const w = narrow ? h : Math.min(W, h * 1.45);
    board.style.aspectRatio = 'auto';
    board.style.width = w + 'px';
    board.style.height = h + 'px';
    // 휴대폰: 패널은 하단 시트 — 접힌 시트가 보드 아래 남는 높이를 차지 (최소 sheetMin)
    document.documentElement.style.setProperty('--sheet-h', Math.max(sheetMin, window.innerHeight - h - 24) + 'px');
  }

  // ---------- 말 ----------
  function buildTokens() {
    const box = $('#tokens');
    box.innerHTML = '';
    S.players.forEach((p) => {
      const t = document.createElement('div');
      t.className = 'token' + (p.bankrupt ? ' gone' : '');
      t.id = 'tok' + p.id;
      t.style.setProperty('--tok', tokColor(p));
      t.innerHTML = Hamster.svg(hamOf(p));
      box.appendChild(t);
      disp[p.id] = p.pos;
    });
    layoutTokens();
  }
  const tokenEl = (pid) => $('#tok' + pid);
  function layoutTokens() {
    const board = $('#board');
    const W = board.clientWidth, H = board.clientHeight;
    const groups = {};
    S.players.forEach((p) => { if (!p.bankrupt) (groups[disp[p.id]] = groups[disp[p.id]] || []).push(p.id); });
    for (const pos in groups) {
      const ids = groups[pos], c = cellEls[pos];
      const cx = c.offsetLeft + c.offsetWidth / 2, cy = c.offsetTop + c.offsetHeight / 2;
      ids.forEach((pid, k) => {
        const n = ids.length;
        const dx = (k - (n - 1) / 2) * c.offsetWidth * (n > 2 ? 0.26 : 0.34);
        const dy = (k % 2 ? 1 : -1) * (n > 1 ? c.offsetHeight * 0.12 : 0);
        const t = tokenEl(pid);
        t.style.left = ((cx + dx) / W) * 100 + '%';
        t.style.top = ((cy + dy) / H) * 100 + '%';
      });
    }
    S.players.forEach((p) => {
      const t = tokenEl(p.id);
      if (!t) return;
      t.classList.toggle('active', p.id === S.current && S.phase !== 'gameover');
      t.classList.toggle('caged', p.inJail && disp[p.id] === 10);
      t.classList.toggle('fast', fast);
      if (!t.dataset.mood) t.classList.toggle('mood-sleep', p.inJail && disp[p.id] === 10);
    });
  }
  function hop(pid) {
    const t = tokenEl(pid);
    t.classList.remove('hop');
    void t.offsetWidth;
    t.classList.add('hop');
  }
  function mood(pid, m, ms) {
    const t = tokenEl(pid);
    if (!t) return;
    t.classList.remove('mood-happy', 'mood-sad', 'mood-sleep');
    t.classList.add('mood-' + m);
    t.dataset.mood = m;
    clearTimeout(t._moodTimer);
    t._moodTimer = setTimeout(() => {
      t.classList.remove('mood-' + m);
      delete t.dataset.mood;
      layoutTokens();
    }, ms || 1200);
  }
  function bubble(pid, text) {
    const t = tokenEl(pid);
    if (!t) return;
    t.querySelectorAll('.bubble').forEach((b) => b.remove());
    const b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = text;
    t.appendChild(b);
    setTimeout(() => b.remove(), fast ? 900 : 1900);
  }
  function floatMoney(pid, delta) {
    const t = tokenEl(pid);
    if (!t || t.classList.contains('gone')) return;
    const f = document.createElement('div');
    f.className = 'float-money ' + (delta > 0 ? 'plus' : 'minus');
    f.textContent = (delta > 0 ? '+' : '−') + fmt(Math.abs(delta));
    t.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }

  // ---------- 주사위 (유리구슬 같은 투명 3D 주사위) ----------
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  // 정육면체 면 배치: 1 앞, 6 뒤, 2 오른쪽, 5 왼쪽, 3 위, 4 아래 (마주보는 면의 합 = 7)
  // 각 눈을 앞으로 보이게 하는 큐브 회전 [rotateX, rotateY]
  const FACE_ROT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
  const faceHtml = (v) => `<div class="face f${v}">${Array.from({ length: 9 }, (_, k) => (PIPS[v].includes(k) ? '<i></i>' : '<span></span>')).join('')}</div>`;
  function buildDice() {
    // 속심(core): 둥근 모서리 사이 빈틈을 치즈로 채워 한 덩어리처럼 보이게 하는 안쪽 큐브
    const core = [1, 2, 3, 4, 5, 6].map((v) => `<div class="core c${v}"></div>`).join('');
    const cube = core + [1, 2, 3, 4, 5, 6].map(faceHtml).join('');
    $('#dice').innerHTML = [0, 1].map((k) => `<div class="die3d d${k}"><i class="dshadow"></i><div class="tilt"><div class="cube">${cube}</div></div></div>`).join('');
    document.querySelectorAll('#dice .cube').forEach((c) => { c._rx = 0; c._ry = 0; });
  }
  function setCube(cube, v) {
    const [x, y] = FACE_ROT[v];
    cube._rx = x;
    cube._ry = y;
    cube.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
  }
  let diceRolling = false;
  const isCheese = () => $('#dice').classList.contains('tex');
  // 주사위 아래 결과 글자 (정면에 보이는 면이 결과라는 걸 분명히)
  function showRollResult(d, note) {
    const el = $('#roll-result');
    if (!el) return;
    if (!d) { el.innerHTML = ''; return; }
    const dbl = d[0] === d[1];
    el.innerHTML = `🎲 ${d[0]} + ${d[1]} = <b>${d[0] + d[1]}</b>${dbl ? ' · <span class="dbl">더블!</span>' : ''}${note ? ` <span class="note">${note}</span>` : ''}`;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }
  function renderDice() {
    if (diceRolling) return;
    const d = S.dice || [1, 1];
    document.querySelectorAll('#dice .cube').forEach((c, k) => setCube(c, d[k]));
  }
  // 던지는 힘(0~1): 사람은 꾹 누른 정도, 컴퓨터는 무작위. 힘은 연출(높이·회전·시간)에만 쓰이고 눈은 엔진이 정한다.
  let throwPower = null;
  async function animDice(d) {
    const p = throwPower !== null ? throwPower : 0.35 + Math.random() * 0.5;
    throwPower = null;
    diceRolling = true;
    showRollResult(null);
    const cheese = isCheese();
    if (cheese) Sound.cheeseThrow(); else Sound.dice();
    const bd = $('#board');
    const u = (bd.clientWidth + bd.clientHeight) / 200;
    const dur = fast ? 340 : 900 + p * 900;
    const turns = 1 + Math.round(p * 3); // 공중에서 도는 바퀴 수
    document.querySelectorAll('#dice .die3d').forEach((die, k) => {
      const cube = $('.cube', die), shadow = $('.dshadow', die);
      const dir = k ? 1 : -1;
      const h = (5 + p * 19) * u; // 세게 던져도 보드 안에 머무는 높이
      // 날아오르기 → 떨어짐 → 통통 튀기 (바깥 상자)
      // 구간마다 속도 곡선을 따로 준다: 올라갈 땐 감속(UP), 떨어질 땐 가속(DOWN) → 포물선처럼 부드럽게
      const UP = 'cubic-bezier(.25,.6,.4,1)', DOWN = 'cubic-bezier(.6,0,.8,.45)';
      const dx = dir * p * 8 * u;
      const at = (x, y, sx = 1, sy = 1) => `translate(${x}px, ${y}px) scale(${sx}, ${sy})`;
      die.animate([
        { transform: at(0, 0), easing: UP },
        { transform: at(dx * 0.7, -h, 1.04, 1.04), offset: 0.36, easing: DOWN },
        { transform: at(dx, 0, 1.06, 0.92), offset: 0.64, easing: UP },             // 착지: 살짝 눌림
        { transform: at(dx * 0.7, -h * 0.17), offset: 0.77, easing: DOWN },
        { transform: at(dx * 0.35, 0, 1.03, 0.96), offset: 0.88, easing: UP },
        { transform: at(dx * 0.15, -h * 0.04), offset: 0.94, easing: DOWN },
        { transform: at(0, 0) },
      ], { duration: dur });
      // 바닥 그림자: 높이 뜰수록 작고 옅게 (주사위 높이와 같은 리듬)
      const sh = (s, o) => ({ transform: `scale(${s})`, opacity: o });
      shadow.animate([
        Object.assign(sh(1, 1), { easing: UP }),
        Object.assign(sh(0.45, 0.35), { offset: 0.36, easing: DOWN }),
        Object.assign(sh(1.08, 1), { offset: 0.64, easing: UP }),
        Object.assign(sh(0.85, 0.8), { offset: 0.77, easing: DOWN }),
        Object.assign(sh(1.03, 1), { offset: 0.88, easing: UP }),
        Object.assign(sh(0.96, 0.95), { offset: 0.94, easing: DOWN }),
        sh(1, 1),
      ], { duration: dur });
      // 큐브 데굴데굴: 현재 각도에서 여러 바퀴 돈 뒤 나온 눈이 앞으로
      const [fx, fy] = FACE_ROT[d[k]];
      const sx = cube._rx || 0, sy = cube._ry || 0;
      // 끝 각도는 목표 각도와 360° 단위로 같아야 한다 (X는 앞으로, Y는 주사위마다 반대 방향으로 굴림)
      const ex = fx + 360 * Math.ceil((sx + turns * 360 - fx) / 360);
      const yTurns = turns * 270;
      const eyDir = dir > 0
        ? fy + 360 * Math.ceil((sy + yTurns - fy) / 360)
        : fy - 360 * Math.ceil((fy - (sy - yTurns)) / 360);
      // 회전은 하나의 매끄러운 감속 곡선으로 돌다가, 끝에서 아주 살짝 넘어갔다 제자리로
      cube.animate([
        { transform: `rotateX(${sx}deg) rotateY(${sy}deg)`, easing: 'cubic-bezier(.15,.55,.3,1)' },
        { transform: `rotateX(${ex + 6}deg) rotateY(${eyDir + 4 * dir}deg)`, offset: 0.9, easing: 'ease-in-out' },
        { transform: `rotateX(${ex}deg) rotateY(${eyDir}deg)` },
      ], { duration: dur });
      setCube(cube, d[k]); // 끝 자세(같은 방향, 360° 단위로 정리)
    });
    if (cheese) {
      // 착지(64%)와 두 번의 통통 튐(88%·100%)에 맞춰 말캉한 소리
      [[0.64, 1], [0.88, 0.5], [1, 0.25]].forEach(([at, k]) => Sound.cheeseBounce(Math.max(0.35, p) * k, (dur * at) / 1000));
      await sleep(dur);
    } else {
      const ticks = Math.max(2, Math.round(dur / 160));
      for (let k = 0; k < ticks; k++) {
        if (k % 2 === 1) Sound.hop();
        await sleep(dur / ticks);
      }
    }
    diceRolling = false;
    // 더블인데 다시 굴리지 않는 경우(케이지 탈출, 3연속 더블)는 이유를 같이 보여준다
    const recent = S.log.slice(-6).map((l) => l.text).join(' ');
    let note = '';
    if (d[0] === d[1] && recent.includes('3연속 더블')) note = '3연속 더블 → 케이지행';
    else if (d[0] === d[1] && recent.includes('더블로 케이지 탈출')) note = '케이지 탈출! (탈출할 땐 한 번 더 굴리지 않아요)';
    showRollResult(d, note);
    await sleep(fast ? 60 : 280);
  }

  // ---------- 꾹 눌렀다 떼서 굴리기 ----------
  // 누르고 있는 동안 힘 게이지가 오르내리고(핑퐁) 주사위가 덜덜 떨린다. 떼는 순간의 힘으로 던진다.
  let charge = null;
  let suppressClick = false;
  function startCharge() {
    if (charge || busy) return;
    const b = $('#roll-btn');
    if (!b || b.disabled || b.classList.contains('hidden')) return;
    const gauge = $('#power'), dice = $('#dice');
    charge = { start: performance.now(), p: 0, lastRattle: 0 };
    gauge.classList.add('on');
    dice.classList.add('shaking');
    b.classList.add('charging');
    const tick = (now) => {
      if (!charge) return;
      const x = ((now - charge.start) / 1100) % 2;
      charge.p = x < 1 ? x : 2 - x;
      gauge.firstElementChild.style.width = Math.round(charge.p * 100) + '%';
      dice.style.setProperty('--amp', (0.2 + charge.p * 1.2).toFixed(2));
      if (now - charge.lastRattle > 150 - charge.p * 80) { if (isCheese()) Sound.cheeseShake(); else Sound.hop(); charge.lastRattle = now; }
      charge.raf = requestAnimationFrame(tick);
    };
    charge.raf = requestAnimationFrame(tick);
  }
  function releaseCharge() {
    if (!charge) return;
    cancelAnimationFrame(charge.raf);
    const p = Math.max(0.12, charge.p);
    charge = null;
    $('#power').classList.remove('on');
    $('#dice').classList.remove('shaking');
    $('#roll-btn').classList.remove('charging');
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 300);
    rollWithQuiz(p);
  }
  window.addEventListener('pointerup', releaseCharge);
  window.addEventListener('pointercancel', releaseCharge);
  window.addEventListener('blur', releaseCharge);

  // ---------- 수학 문제: 맞혀야 주사위가 굴러간다 (화면 전용, 게임 난수와 무관) ----------
  const QUIZ_SEC = 15;
  let quiz = null;
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function quizLevel() {
    const ai = S.players.find((p) => p.isAI);
    return ai ? ai.difficulty : 'normal';
  }
  // 문제 만들기: 정답 t(= 곧 굴러갈 주사위 두 개의 합, 2~12)가 나오는 식. 만들 수 없으면 null
  const pairsMul = (lo, hi) => { const r = []; for (let a = 2; a <= 6; a++) for (let b = 2; b <= 6; b++) if (a * b >= lo && a * b <= hi) r.push([a, b]); return r; };
  const GEN = {
    add1(t) { const a = ri(Math.max(1, t - 9), Math.min(9, t - 1)); return `${a} + ${t - a}`; },
    sub1(t) { if (t > 8) return null; const b = ri(1, 9 - t); return `${t + b} − ${b}`; },
    add2(t) { const a = ri(1, t - 1); return `${a} + ${t - a}`; },
    sub2(t) { const b = ri(3, 12); return `${t + b} − ${b}`; },
    mul(t) { const ps = pairsMul(t, t); if (!ps.length) return null; const [a, b] = pickOne(ps); return `${a} × ${b}`; },
    div(t) { const d = ri(2, 6); return `${t * d} ÷ ${d}`; },
    mulAdd(t) { const ps = pairsMul(4, t - 1); if (!ps.length) return null; const [a, b] = pickOne(ps); return `${a} × ${b} + ${t - a * b}`; },
    mulSub(t) { const ps = pairsMul(t + 1, t + 9); if (!ps.length) return null; const [a, b] = pickOne(ps); return `${a} × ${b} − ${a * b - t}`; },
    divAdd(t) { const q = ri(1, t - 1), d = ri(2, 5); return `${q * d} ÷ ${d} + ${t - q}`; },
    divSub(t) { const c = ri(1, 6), d = ri(2, 5); return `${(t + c) * d} ÷ ${d} − ${c}`; },
    addSub(t) { const c = ri(1, 9), sum = t + c, a = ri(Math.max(1, sum - 12), Math.min(12, sum - 1)); return `${a} + ${sum - a} − ${c}`; },
  };
  const QUIZ_SET = {
    easy: ['add1', 'add1', 'sub1', 'sub1'],
    normal: ['add2', 'sub2', 'sub2', 'mul', 'mul'],
    hard: ['sub2', 'mul', 'div', 'div', 'mulAdd', 'mulSub', 'divAdd', 'divSub', 'addSub'],
  };
  function makeProblem(level, answer) {
    const set = QUIZ_SET[level] || QUIZ_SET.normal;
    let text = null;
    for (let k = 0; k < 20 && !text; k++) text = GEN[pickOne(set)](answer);
    if (!text) text = GEN[level === 'easy' ? 'add1' : 'sub2'](answer);
    const near = [];
    for (let d = 1; d <= 3; d++) [answer - d, answer + d].forEach((v) => { if (v >= 2 && v <= 12) near.push(v); });
    const wrong = [];
    while (wrong.length < 2) { const v = pickOne(near); if (!wrong.includes(v)) wrong.push(v); }
    const choices = [answer, ...wrong].sort(() => Math.random() - 0.5);
    return { text, answer, choices };
  }
  let rentPayer = null; // 방금 통행료를 낸 햄스터 (돈 이벤트에서 '지불' 소리 대신 슬픈 소리)

  // ---------- 공용 문제 창 ----------
  // quiz = { kind: 'dice'|'card', prob: { text, choices: [문자열], answer: 문자열 }, onResult(ok, timeout), ... }
  function cancelQuiz() {
    if (!quiz) return;
    clearInterval(quiz.timer);
    clearTimeout(quiz.next);
    quiz = null;
    closeModal('quiz');
  }
  function renderQuiz(head, sub, qHtml, long) {
    const q = quiz;
    q.done = false;
    q.end = performance.now() + QUIZ_SEC * 1000;
    if (layers.quiz) layers.quiz._html = null;
    const marks = ['①', '②', '③'];
    const m = modal('quiz', `
      <div class="quiz-head">${head}</div>
      ${sub ? `<div class="quiz-sub">${sub}</div>` : ''}
      <div class="quiz-q${long ? ' long' : ''}">${qHtml}</div>
      <div class="quiz-time"><i></i><span></span></div>
      <div class="quiz-opts${long ? ' long' : ''}">${q.prob.choices.map((v, k) => `<button class="btn quiz-opt" data-k="${k}"><small>${marks[k]}</small>${esc(v)}</button>`).join('')}</div>
      <div class="quiz-msg">&nbsp;</div>`, 'quiz' + (long ? ' wide-quiz' : ''));
    m.querySelectorAll('.quiz-opt').forEach((b) => { b.onclick = () => answerQuiz(Number(b.dataset.k)); });
    const bar = $('.quiz-time i', m), sec = $('.quiz-time span', m);
    clearInterval(q.timer);
    const tick = () => {
      const left = Math.max(0, q.end - performance.now());
      bar.style.width = (left / (QUIZ_SEC * 10)).toFixed(1) + '%';
      bar.parentElement.classList.toggle('hurry', left <= 5000);
      sec.textContent = Math.ceil(left / 1000) + '초';
      if (left <= 0) answerQuiz(null);
    };
    tick();
    q.timer = setInterval(tick, 100);
  }
  // k: 고른 보기 번호 (null = 시간 초과)
  function answerQuiz(k) {
    const q = quiz;
    if (!q || q.done) return;
    q.done = true;
    clearInterval(q.timer);
    const ok = k !== null && q.prob.choices[k] === q.prob.answer;
    layers.quiz.querySelectorAll('.quiz-opt').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.k) === k) b.classList.add(ok ? 'right' : 'wrong');
    });
    if (ok) Sound.quizRight(); else Sound.quizWrong();
    q.onResult(ok, k === null);
  }
  function quizMsg(text, good) {
    const msg = $('.quiz-msg', layers.quiz);
    msg.textContent = text;
    msg.className = 'quiz-msg ' + (good ? 'good' : 'bad');
  }
  function revealAnswer() {
    layers.quiz.querySelectorAll('.quiz-opt').forEach((b) => { if (quiz.prob.choices[b.dataset.k] === quiz.prob.answer) b.classList.add('right'); });
  }
  const cheer = () => pickOne(['딩동댕! 🎉', '정답! 최고예요 👍', '맞았어요! 🌻']);

  // ---------- 주사위 문제: 정답 = 굴러갈 주사위 합, 3번 틀리면 이번 굴리기 기회가 넘어감 ----------
  const DICE_TRIES = 3;
  function rollWithQuiz(power) {
    if (quiz || busy || !canHumanRoll()) return;
    quiz = { kind: 'dice', wrong: 0, power, onResult: diceResult };
    syncRollBtn();
    nextDiceProblem();
  }
  function nextDiceProblem() {
    const d = E.peekDice(S); // 시드를 바꾸지 않고 미리 봄 → 맞힌 뒤 굴리면 같은 숫자
    const p = makeProblem(quizLevel(), d[0] + d[1]);
    quiz.prob = { text: p.text, choices: p.choices.map(String), answer: String(p.answer) };
    const left = DICE_TRIES - quiz.wrong;
    renderQuiz('🧮 정답이 곧 주사위 숫자! 맞히면 굴러가요', `기회 ${'❤️'.repeat(left)}${'🤍'.repeat(quiz.wrong)}`, `${p.text} = <b>?</b>`);
  }
  function diceResult(ok, timeout) {
    const q = quiz;
    if (ok) {
      quizMsg(`${cheer()} 🎲 ${q.prob.answer}칸!`, true);
      q.next = setTimeout(() => { cancelQuiz(); throwPower = q.power; if (!act({ type: 'roll' })) throwPower = null; }, 1100);
      return;
    }
    q.wrong++;
    if (q.wrong >= DICE_TRIES) {
      revealAnswer();
      quizMsg(`${timeout ? '⏰ 시간 초과! ' : ''}3번 틀렸어요. 정답은 ${q.prob.answer} — 이번 주사위 기회는 넘어가요 😢`, false);
      q.next = setTimeout(() => { cancelQuiz(); act({ type: 'forfeitRoll' }); }, 2400);
      return;
    }
    // 정답이 주사위 숫자라 새 문제도 답이 같으므로 정답은 알려 주지 않는다
    quizMsg(`${timeout ? '⏰ 시간 초과! ' : '아쉬워요! '}다른 문제로 다시 도전! (남은 기회 ${DICE_TRIES - q.wrong}번)`, false);
    q.next = setTimeout(() => { if (quiz === q) nextDiceProblem(); }, 1800);
  }

  // ---------- 카드 문제: 찬스 = 한국사, 볼주머니 = 상식. 틀리면 카드 무효 ----------
  const qBags = { chance: [], chest: [] };
  function drawQuestion(deck) {
    const pool = deck === 'chance' ? Questions.history : Questions.common;
    if (!qBags[deck].length) qBags[deck] = pool.map((x, i) => i).sort(() => Math.random() - 0.5);
    return pool[qBags[deck].pop()];
  }
  function syncCardQuiz() {
    if (busy || quiz || !S.cardQuiz || S.cardQuiz.pid !== HUMAN || S.phase === 'gameover') return;
    const cq = S.cardQuiz, deck = cq.deck;
    const card = CARDS[deck].find((c) => c.id === cq.id);
    const item = drawQuestion(deck);
    quiz = { kind: 'card', deck, bad: !!cq.bad, onResult: cardResult, prob: { text: item.q, choices: [item.a, ...item.w].sort(() => Math.random() - 0.5), answer: item.a } };
    const head = deck === 'chance' ? '🌻 찬스 카드 — 한국사 문제!' : '🐹 볼주머니 카드 — 상식 문제!';
    const preview = card ? `<div class="quiz-card ${cq.bad ? 'bad' : 'good'}"><b>${cq.bad ? '😈 나쁜 카드' : '😊 좋은 카드'}</b>${esc(card.text)}</div>` : '';
    const rule = cq.bad ? '맞히면 이 카드를 <b>피해요!</b> 틀리면 그대로 발동해요' : '맞히면 이 카드를 <b>받아요!</b> 틀리면 무효예요';
    renderQuiz(head, preview + rule, esc(item.q), true);
  }
  function cardResult(ok, timeout) {
    const q = quiz;
    const pre = timeout ? '⏰ 시간 초과! ' : '아쉬워요! ';
    if (!ok) revealAnswer();
    const msg = ok
      ? (q.bad ? `${cheer()} 나쁜 카드를 피했어요 😌` : `${cheer()} 카드 효과를 받아요!`)
      : (q.bad ? `${pre}정답은 "${q.prob.answer}" — 나쁜 카드가 발동해요 😱` : `${pre}정답은 "${q.prob.answer}" — 카드가 무효가 됐어요`);
    quizMsg(msg, ok);
    q.next = setTimeout(() => { cancelQuiz(); act({ type: 'cardQuizAnswer', correct: ok }); }, ok ? 1300 : 2600);
  }

  // ---------- 카드 공개 ----------
  function showCard(ev) {
    Sound.card();
    const card = CARDS[ev.deck].find((c) => c.id === ev.id);
    const p = S.players[ev.pid];
    const mine = ev.pid === HUMAN;
    const m = modal('card', `
      <div class="flipcard ${ev.deck}"><div class="inner">
        <div class="ce">${iconHtml(ev.deck === 'chance' ? '🌻' : '🐹', 'card-ico')}</div>
        <div class="ct">${ev.deck === 'chance' ? '해바라기씨 찬스' : '볼주머니 카드'} · ${p.name}</div>
        <div class="cx">${card.text}</div>
      </div></div>
      <div class="btns"><button class="btn primary" data-ok>확인</button></div>`);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; closeModal('card'); resolve(); };
      $('[data-ok]', m).onclick = finish;
      if (!mine) setTimeout(finish, fast ? 600 : 1700);
    });
  }

  // ---------- 세계 이벤트 공개 ----------
  function showWorld(ev) {
    const w = E.WORLD[ev.kind];
    const good = ev.kind === 'boom' || ev.kind === 'festival' || ev.kind === 'harvest';
    if (good) Sound.worldGood(); else Sound.worldBad();
    const grp = ev.group ? `<div class="wg"><i style="background:${GROUPS[ev.group].color}"></i>${GROUPS[ev.group].name} 도시들</div>` : '';
    const lasting = ev.kind === 'boom' || ev.kind === 'crash' || ev.kind === 'festival' ? `<div class="wl">다음 세계 이벤트(${E.WORLD_EVERY}바퀴 뒤)까지 계속돼요</div>` : '';
    const m = modal('card', `
      <div class="worldcard ${ev.kind}">
        <div class="wt">🌍 ${S.round}바퀴 세계 이벤트!</div>
        <div class="wn">${w.name}</div>
        <div class="wx">${w.text}</div>${grp}${lasting}
      </div>
      <div class="btns"><button class="btn primary" data-ok>확인</button></div>`);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; closeModal('card'); resolve(); };
      $('[data-ok]', m).onclick = finish;
      setTimeout(finish, fast ? 1200 : 4000);
    });
  }

  // ---------- 이벤트 연출 ----------
  async function playEvents() {
    while (S.events.length) {
      const ev = S.events.shift();
      switch (ev.type) {
        case 'dice':
          await animDice(ev.dice);
          break;
        case 'move':
          for (const pos of ev.path) {
            disp[ev.pid] = pos;
            layoutTokens();
            hop(ev.pid);
            Sound.hop();
            await sleep(hopMs());
          }
          break;
        case 'land': // 특수 칸 도착음 (REQ-136)
          Sound.arrive(ev.kind);
          await sleep(fast ? 60 : (ev.kind === 'gotojail' ? 700 : 300));
          break;
        case 'jail':
          disp[ev.pid] = 10;
          layoutTokens();
          Sound.bad();
          await sleep(fast ? 100 : 450);
          break;
        case 'money': {
          // 땅 구매·낙찰·건설로 쓴 돈은 기쁜 지출 → 웃는 얼굴 (엔진이 돈 이벤트 바로 뒤에 buy/build 를 보냄)
          const next = S.events[0];
          const gladSpend = ev.delta < 0 && next && (next.type === 'buy' || next.type === 'build') && next.pid === ev.pid;
          floatMoney(ev.pid, ev.delta);
          mood(ev.pid, ev.delta > 0 || gladSpend ? 'happy' : 'sad', gladSpend ? 1800 : undefined);
          if (ev.delta > 0 || gladSpend) Sound.coin(); else if (ev.pid !== rentPayer) Sound.pay(); // 통행료는 슬픈 소리로 대신
          if (ev.delta < 0) rentPayer = null;
          renderPlayers();
          break;
        }
        case 'takeover':
          highlight(ev.pos);
          renderCells();
          Sound.takeover();
          mood(ev.pid, 'happy', 1800);
          mood(ev.from, 'sad', 1800);
          bubble(ev.from, '내 땅이… 😭');
          await sleep(fast ? 250 : 900);
          break;
        case 'buildBlocked': // 내 땅인데 지을 수 없을 때 이유 (REQ-101)
          if (ev.pid === HUMAN) {
            const sp = BOARD[ev.pos], me = S.players[HUMAN];
            const money = sp.house && me.money < sp.house ? ` (건설비 ${fmt(sp.house)} · 가진 씨앗 ${fmt(me.money)})` : '';
            toast(`🏗️ ${sp.name}: ${ev.reason}${money}`, 3500);
            bubble(ev.pid, '못 지어요 😢');
            await sleep(fast ? 150 : 500);
          }
          break;
        case 'cardVoid':
          bubble(ev.pid, ev.avoided ? '휴~ 피했다! 😌' : '카드 무효… 😢');
          mood(ev.pid, ev.avoided ? 'happy' : 'sad', 1500);
          await sleep(fast ? 200 : 600);
          break;
        case 'teleport': {
          const t = tokenEl(ev.pid);
          Sound.teleport();
          if (t) t.classList.add('tp-out');
          await sleep(fast ? 150 : 450);
          disp[ev.pid] = ev.to;
          layoutTokens();
          if (t) { t.classList.remove('tp-out'); t.classList.add('tp-in'); setTimeout(() => t.classList.remove('tp-in'), 600); }
          highlight(ev.to);
          await sleep(fast ? 150 : 500);
          break;
        }
        case 'world':
          renderCells();
          renderCenter();
          await showWorld(ev);
          break;
        case 'forfeit':
          bubble(ev.pid, '기회가 넘어갔어요 😢');
          mood(ev.pid, 'sad', 1500);
          await sleep(fast ? 200 : 600);
          break;
        case 'rent':
          rentPayer = ev.from;
          Sound.sad();
          break;
        case 'card':
          await showCard(ev);
          break;
        case 'speech':
          bubble(ev.pid, ev.text);
          Sound.squeak();
          break;
        case 'buy':
          Sound.happy();
          highlight(ev.pos);
          renderCells();
          break;
        case 'build':
          await buildAnim(ev.pos, ev.level);
          break;
        case 'bankrupt': { // 쳇바퀴 위에서 달리다 떨어지며 퇴장 (REQ-130)
          const t = tokenEl(ev.pid);
          Sound.bad();
          if (t && !t.classList.contains('gone')) {
            const ms = fast ? 450 : 1500;
            const wheel = document.createElement('span');
            wheel.className = 'hwheel';
            t.prepend(wheel);
            t.style.setProperty('--fall', ms + 'ms');
            t.classList.add('wheel-fall');
            await sleep(ms);
            t.classList.remove('wheel-fall');
            wheel.remove();
            t.classList.add('gone');
          }
          break;
        }
        case 'attack':
          if (ev.pid === HUMAN) bubble(ev.pid, '에잇! ⚔️');
          bubble(ev.target, ev.kind === 'jail' ? '억울해요… 🔒' : '으악! 😵');
          mood(ev.target, 'sad', 1800);
          Sound.bad();
          await sleep(fast ? 200 : 650);
          break;
        case 'demolish':
          highlight(ev.pos);
          renderCells();
          Sound.bad();
          await sleep(fast ? 150 : 500);
          break;
        case 'tradeResult':
          if (ev.offer.from === HUMAN) toast(ev.accepted ? '🤝 거래 성사!' : `😤 ${S.players[ev.offer.to].name}: 거절!`);
          if (!ev.accepted && ev.offer.to === HUMAN) AI.noteRejected(S);
          break;
        case 'turn':
          if (ev.pid === HUMAN) Sound.squeak();
          break;
        case 'gameover':
          break; // 소리·연출은 결과 창(showGameOver → playEndFx)에서
        default:
          break;
      }
    }
  }

  // ---------- 진행 루프 ----------
  async function pump() {
    if (busy) return;
    busy = true;
    try {
      for (;;) {
        await playEvents();
        renderAll();
        save();
        if (S.phase === 'gameover') break;
        const a = E.actor(S);
        if (a === null || !S.players[a].isAI) break;
        await sleep(aiDelay());
        if (!S) break;
        AI.step(S, a);
      }
    } catch (err) {
      console.error(err);
      toast('앗, 오류가 났어요: ' + err.message);
    } finally {
      busy = false;
    }
    renderAll();
  }

  // ---------- 할 일이 없으면 자동으로 턴 넘기기 ----------
  // 필수 행동(구매 결정·빚·경매·거래 응답·더블 재굴림)이 없고,
  // 선택 행동(지금 지을 수 있는 건물, 해제할 수 있는 저당)도 없으면 잠시 뒤 턴을 넘긴다.
  let autoTimer = null;
  let autoPaused = false;
  const autoDelay = () => (fast ? 500 : 1500);
  function hasOptionalAction() {
    return E.ownedBy(S, HUMAN).some((i) => !E.canBuild(S, HUMAN, i) || (S.props[i].mortgaged && !E.canUnmortgage(S, HUMAN, i)));
  }
  function autoEndReady() {
    return !!S && S.phase === 'postRoll' && S.current === HUMAN && E.actor(S) === HUMAN && !S.rollAgain &&
      !S.debts.length && !S.targetPick && !S.cardQuiz && !quiz && !S.auction && !S.tradeOffer && !layers.user && !layers.card && !autoPaused && !hasOptionalAction();
  }
  function clearAutoEnd() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }
  function scheduleAutoEnd() {
    if (autoTimer || busy || !autoEndReady()) return;
    autoTimer = setTimeout(() => {
      autoTimer = null;
      if (!busy && autoEndReady()) act({ type: 'endTurn' });
    }, autoDelay());
  }

  function act(action) {
    clearAutoEnd();
    const err = E.act(S, HUMAN, action);
    if (err) { toast(err); return false; }
    // 연출이 끝날 때까지 행동 버튼 잠금 (중복 클릭 방지)
    document.querySelectorAll('#actions button, #roll-btn').forEach((b) => { b.disabled = true; });
    if (busy) renderAll(); else pump();
    return true;
  }

  // ---------- 렌더링 ----------
  function renderAll() {
    if (!S) return;
    renderCells();
    renderPlayers();
    renderCenter();
    renderActions();
    renderLog();
    layoutTokens();
    syncStateModal();
    syncCardQuiz();
    checkNewMonopoly();
    if (layers.user && layers.user._refresh) {
      const r = layers.user._refresh;
      refreshing = true;
      try { r(); } finally { refreshing = false; }
    }
    $('#btn-fast').classList.toggle('on', fast);
    $('#btn-sound').textContent = Sound.muted ? '🔇' : '🔊';
    $('#btn-music').classList.toggle('off', !Sound.musicOn);
  }

  function renderPlayers() {
    $('#players').innerHTML = S.players.map((p) => {
      const props = E.ownedBy(S, p.id).sort((a, b) => a - b);
      const chips = props.map((i) => `<span class="chip${S.props[i].mortgaged ? ' mort' : ''}" style="background:${groupColor(i)}" title="${BOARD[i].name}"></span>`).join('');
      const tag = p.isAI ? `컴퓨터 · ${DIFF_NAME[p.difficulty]}` : '플레이어';
      const extra = (p.inJail ? ' · 🔒케이지' : '') + (p.jailCards.length ? ` · 🎫${p.jailCards.length}` : '') + (p.bankrupt ? ' · 파산' : '');
      return `<div class="pcard${p.id === S.current && S.phase !== 'gameover' ? ' turn' : ''}${p.bankrupt ? ' out' : ''}" style="--tok:${tokColor(p)}">
        ${Hamster.svg(hamOf(p))}
        <div><div class="pname">${esc(p.name)}</div><div class="ptag">${tag}${extra}</div><div class="chips">${chips}</div></div>
        <div class="pmoney">${fmt(p.money)}</div>
      </div>`;
    }).join('');
  }

  function renderCenter() {
    renderDice();
    const parts = [`${S.round}바퀴째${S.options.turnLimit ? ` / ${S.options.turnLimit}` : ''}`, `은행: 굴 ${S.bankHouses} · 궁전 ${S.bankHotels}`];
    if (S.options.freeParkingJackpot) parts.push(`텔레포트 칸 상금 ${fmt(S.jackpot)}`);
    const w = S.world && E.WORLD[S.world.kind];
    if (w && ['boom', 'crash', 'festival'].includes(S.world.kind)) parts.push(`<b class="world-now">${w.name}${S.world.group ? ` · ${GROUPS[S.world.group].name}` : ''}</b>`);
    const nextW = Math.ceil((S.round + 1) / E.WORLD_EVERY) * E.WORLD_EVERY;
    parts.push(`다음 세계 이벤트: ${nextW}바퀴`);
    $('#center-info').innerHTML = parts.join('<br>');
  }

  function renderLog() {
    $('#log').innerHTML = S.log.slice(-120).map((l) => `<div class="${l.cls}">${esc(l.text)}</div>`).join('');
  }

  function esc(t) {
    return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // 가운데 굴리기 버튼: 사람이 지금 굴릴 수 있을 때만 보인다
  function canHumanRoll() {
    return !!S && S.phase !== 'gameover' && S.current === HUMAN && E.actor(S) === HUMAN && !S.debts.length && !S.targetPick && !S.cardQuiz && !S.auction && !S.tradeOffer &&
      (S.phase === 'preRoll' || (S.phase === 'postRoll' && S.rollAgain));
  }
  function syncRollBtn() {
    const b = $('#roll-btn');
    if (!b) return;
    const show = canHumanRoll();
    b.classList.toggle('hidden', !show);
    if (!show) return;
    b.disabled = busy || !!quiz;
    const me = S.players[HUMAN];
    const label = me.inJail && S.phase === 'preRoll' ? '꾹 눌러 더블 노리기' : S.rollAgain ? '꾹 눌러 한 번 더!' : '꾹 눌러 굴리기';
    const txt = $('.rb-txt', b);
    if (txt.textContent !== label) txt.textContent = label;
  }

  function renderActions() {
    syncRollBtn();
    const box = $('#actions');
    const me = S.players[HUMAN];
    const a = E.actor(S);
    let html = '';
    if (S.phase === 'gameover') {
      html = `<div class="msg">게임 종료! ${esc(S.players[S.winner].name)} 승리</div>
        <div class="btns"><button class="btn primary" data-a="newgame">새 게임</button><button class="btn" data-a="result">결과 보기</button></div>`;
    } else if (a !== HUMAN) {
      const p = S.players[a];
      const what = S.targetPick ? '공격 대상 고르는 중 ⚔️' : S.auction ? '경매 고민 중' : S.debts.length ? '해바라기씨 마련 중' : '차례';
      html = `<div class="msg thinking">${esc(p.name)} ${what}</div><div class="sub">컴퓨터 햄스터가 생각하고 있어요</div>`;
    } else if (S.debts.length) {
      const d = S.debts[0];
      const to = d.to === null ? '은행' : S.players[d.to].name;
      html = `<div class="msg">💸 ${esc(to)}에게 ${fmt(d.amount)}을(를) 내야 해요</div>
        <div class="sub">${esc(d.reason)} · 보유 ${fmt(me.money)}${me.money < d.amount ? ` · ${fmt(d.amount - me.money)} 부족` : ''}</div>
        <div class="btns">
          <button class="btn primary" data-a="payDebt" ${me.money < d.amount ? 'disabled' : ''}>지불하기</button>
          <button class="btn" data-a="manage">🏠 건물 매각·저당</button>
          <button class="btn danger" data-a="bankrupt">파산 선언</button>
        </div>`;
    } else if (S.targetPick) {
      html = '<div class="msg">⚔️ 공격할 햄스터를 고르세요</div>';
    } else if (S.cardQuiz) {
      html = '<div class="msg">📝 카드 문제를 풀고 있어요</div>';
    } else if (S.auction) {
      html = '<div class="msg">🔨 경매 진행 중</div>';
    } else if (S.tradeOffer) {
      html = '<div class="msg">🤝 거래 제안이 도착했어요</div>';
    } else if (S.phase === 'preRoll') {
      if (me.inJail) {
        html = `<div class="msg">🔒 케이지 안이에요 (${me.jailTurns + 1}/3번째 시도)</div>
          <div class="sub">더블이 나오면 탈출! 3번째에도 실패하면 벌금을 내고 나가요.</div>
          <div class="btns">
            <button class="btn" data-a="payFine" ${me.money < 50 ? 'disabled' : ''}>벌금 🌻50</button>
            ${me.jailCards.length ? '<button class="btn good" data-a="useJailCard">🎫 탈출권 사용</button>' : ''}
          </div>
          <div class="sub">🎲 더블을 노리려면 가운데 주사위 아래 버튼을 꾹 눌렀다 떼세요</div>`;
      } else {
        html = `<div class="msg">🐹 내 차례!</div><div class="sub">가운데 주사위 아래 버튼(또는 스페이스바)을 꾹 눌렀다 떼면 던져요</div>`;
      }
      html += buildHint();
    } else if (S.phase === 'buy') {
      html = `<div class="msg">📍 ${BOARD[S.pendingBuy].name}에 도착!</div>
        <div class="btns"><button class="btn primary" data-a="showBuy">구매 창 열기</button></div>`;
    } else if (S.phase === 'build') {
      html = `<div class="msg">🏗️ 내 땅 ${BOARD[S.pendingBuild].name}에 도착!</div>
        <div class="btns"><button class="btn primary" data-a="showBuy">건설 창 열기</button></div>`;
    } else if (S.phase === 'takeover') {
      html = `<div class="msg">💥 ${BOARD[S.pendingTakeover].name}을(를) 강제 매입할 수 있어요</div>
        <div class="btns"><button class="btn primary" data-a="showBuy">매입 창 열기</button></div>`;
    } else if (S.phase === 'teleport') {
      html = `<div class="msg">🌀 텔레포트! 가고 싶은 칸을 보드에서 누르세요</div>
        <div class="sub">출발 칸을 지나면 🌻200도 받아요</div>
        <div class="btns"><button class="btn" data-a="stay">그대로 있기</button></div>`;
    } else if (S.phase === 'postRoll' && autoEndReady()) {
      html = `<div class="msg">📍 ${BOARD[me.pos].name}</div><div class="sub">할 일이 없어서 곧 다음 차례로 넘어가요</div>
        <div class="autobar"><i style="animation-duration:${autoDelay()}ms"></i></div>
        <div class="btns"><button class="btn primary" data-a="endTurn" data-primary>바로 넘기기 ✔</button>
          <button class="btn" data-a="pauseAuto">잠깐 멈추기 ✋</button></div>`;
    } else if (S.phase === 'postRoll') {
      const here = BOARD[me.pos];
      html = S.rollAgain
        ? `<div class="msg">🎲 더블! 한 번 더 굴려요</div><div class="sub">가운데 주사위 아래 버튼을 꾹 눌렀다 떼세요</div>`
        : `<div class="msg">📍 ${here.name}</div><div class="sub">건설·저당·거래를 하고 턴을 끝내세요</div>
           <div class="btns"><button class="btn primary big" data-a="endTurn" data-primary>턴 끝내기 ✔</button></div>`;
      html += buildHint();
    }
    if (S.phase !== 'postRoll') autoPaused = false;
    if (autoEndReady()) scheduleAutoEnd(); else clearAutoEnd();
    if (box._html === html && box.querySelector('button:not([disabled])')) return;
    box._html = html;
    box.innerHTML = html;
    box.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => onAction(b.dataset.a); });
  }

  // 같은 색을 다 모은 도시에 지금 지을 수 있는 건물 수 안내 (UI-008) — "내 땅 관리"에선 여러 채를 한 번에 지을 수 있음
  function buildHint() {
    const n = E.ownedBy(S, HUMAN).filter((i) => !E.canBuild(S, HUMAN, i)).length;
    if (!n) return '';
    return `<div class="build-hint"><span>🏠 같은 색을 다 모은 도시 ${n}곳에 지금 건물을 지을 수 있어요. 한 턴에 여러 채도 돼요!</span>
      <button class="btn small" data-a="manage">내 땅 관리 열기</button></div>`;
  }

  // 같은 색을 처음 다 모았을 때 알림 (UI-008). 이어하기로 들어온 게임의 기존 독점은 알리지 않음
  let monoSeen = new Set();
  function propGroups() { return Object.keys(GROUPS).filter((g) => g !== 'airport' && g !== 'util'); }
  function resetMonoSeen() { monoSeen = new Set(propGroups().filter((g) => E.ownsGroup(S, HUMAN, g))); }
  function checkNewMonopoly() {
    if (busy || !S || S.phase === 'gameover') return;
    for (const g of propGroups()) {
      const has = E.ownsGroup(S, HUMAN, g);
      if (has && !monoSeen.has(g)) {
        monoSeen.add(g);
        toast(`🏠 ${GROUPS[g].name} 색을 다 모았어요! '내 땅 관리'에서 건물을 여러 채 지을 수 있어요`, 5000);
        bubble(HUMAN, '다 모았다! 🎉');
      } else if (!has) monoSeen.delete(g); // 거래 등으로 잃으면 다시 모았을 때 또 알림
    }
  }

  function onAction(a) {
    switch (a) {
      case 'newgame': return backToStart();
      case 'result': layerKey.state = null; return showGameOver();
      case 'manage': return openManage();
      case 'pauseAuto': clearAutoEnd(); autoPaused = true; return renderActions();
      case 'showBuy': layerKey.state = null; return syncStateModal();
      case 'stay': return act({ type: 'teleport', to: S.players[HUMAN].pos });
      case 'bankrupt':
        if (window.confirm('정말 파산할까요? 게임에서 지게 됩니다.')) act({ type: 'bankrupt' });
        return;
      default:
        return act({ type: a });
    }
  }

  // ---------- 진행 모달 (구매 · 경매 · 거래 제안 · 결과) ----------
  function syncStateModal() {
    const a = E.actor(S);
    let key = null;
    if (S.phase === 'gameover') key = 'gameover';
    else if (S.targetPick && S.targetPick.pid === HUMAN) key = 'target:' + S.targetPick.text;
    else if (S.auction) key = 'auction:' + JSON.stringify(S.auction) + a + S.players[HUMAN].money;
    else if (S.phase === 'buy' && S.current === HUMAN && a === HUMAN) key = 'buy:' + S.pendingBuy + ':' + S.players[HUMAN].money;
    else if (S.phase === 'build' && S.current === HUMAN && a === HUMAN) key = 'build:' + S.pendingBuild + ':' + S.players[HUMAN].money;
    else if (S.phase === 'takeover' && S.current === HUMAN && a === HUMAN) key = 'takeover:' + S.pendingTakeover + ':' + S.players[HUMAN].money;
    else if (S.tradeOffer && S.tradeOffer.to === HUMAN) key = 'offer';
    if (key === layerKey.state) return;
    if (key === null) { closeModal('state'); return; }
    if (busy && key === 'gameover') return; // 연출이 끝난 뒤 표시
    if (key === 'gameover') showGameOver();
    else if (key.startsWith('target')) showTargetPick();
    else if (key.startsWith('auction')) showAuction();
    else if (key.startsWith('buy')) showBuy();
    else if (key.startsWith('build')) showLandBuild();
    else if (key.startsWith('takeover')) showTakeover();
    else if (key === 'offer') showOffer();
    layerKey.state = key;
  }

  function deedHtml(i) {
    const sp = BOARD[i], pr = S.props[i];
    const color = groupColor(i);
    const head = `<div class="deed-head" style="background:${color}">
        <span class="flag">${sp.flag ? landmarkHtml(sp, 'big') + flagHtml(sp, 'big') : iconHtml(sp.icon, 'big')}</span><div class="dn">${sp.name}</div>
        <div class="dc">${sp.country ? sp.country + ' · ' : ''}${sp.landmark ? sp.landmark + ' · ' : ''}${sp.group ? GROUPS[sp.group].name : ''}</div></div>`;
    let rows = '';
    const lvl = pr ? pr.houses : -1;
    const mono = pr && pr.owner !== null && E.ownsGroup(S, pr.owner, sp.group);
    if (sp.type === 'prop') {
      const names = ['기본 통행료', '굴 1채', '굴 2채', '굴 3채', '굴 4채', '궁전 🏰'];
      rows += `<tr class="${lvl === 0 && !mono ? 'cur' : ''}"><td>${names[0]}</td><td>${fmt(sp.rent[0])}</td></tr>`;
      rows += `<tr class="${lvl === 0 && mono ? 'cur' : ''}"><td>독점 시 (건물 없음)</td><td>${fmt(sp.rent[0] * 2)}</td></tr>`;
      for (let k = 1; k <= 5; k++) rows += `<tr class="${lvl === k ? 'cur' : ''}"><td>${names[k]}</td><td>${fmt(sp.rent[k])}</td></tr>`;
      rows += `<tr><td>건설비 (1채)</td><td>${fmt(sp.house)}</td></tr>`;
    } else if (sp.type === 'airport') {
      const n = pr.owner !== null ? E.countType(S, pr.owner, 'airport') : 0;
      [25, 50, 100, 200].forEach((r, k) => { rows += `<tr class="${n === k + 1 ? 'cur' : ''}"><td>공항 ${k + 1}개 소유</td><td>${fmt(r)}</td></tr>`; });
    } else if (sp.type === 'util') {
      const n = pr.owner !== null ? E.countType(S, pr.owner, 'util') : 0;
      rows += `<tr class="${n === 1 ? 'cur' : ''}"><td>1개 소유</td><td>주사위 × 4</td></tr>`;
      rows += `<tr class="${n === 2 ? 'cur' : ''}"><td>2개 소유</td><td>주사위 × 10</td></tr>`;
    }
    rows += `<tr><td>저당가</td><td>${fmt(sp.mortgage)}</td></tr>`;
    let foot = '주인 없음';
    if (pr.owner !== null) {
      const o = S.players[pr.owner];
      foot = `주인: ${esc(o.name)}${pr.mortgaged ? ' · 저당 중' : ''}${pr.houses === 5 ? ' · 궁전' : pr.houses ? ` · 굴 ${pr.houses}채` : ''}`;
    }
    return `<div class="deed">${head}<table>${rows}</table><div class="deed-foot">가격 ${fmt(sp.price)} · ${foot}</div></div>`;
  }

  const ATTACK_EMOJI = { steal: '💰', stealPct: '🌻', jail: '🔒', fine: '🔧', demolish: '🏚️', pushBack: '⏪' };
  function showTargetPick() {
    const tp = S.targetPick;
    const why = (o) => {
      if (tp.targets.includes(o.id)) return '';
      if (tp.act.kind === 'demolish') return '건물 없음';
      if (tp.act.kind === 'jail' || tp.act.kind === 'pushBack') return '이미 케이지';
      return '고를 수 없음';
    };
    const rows = S.players.filter((o) => o.id !== HUMAN && !o.bankrupt).map((o) => {
      const b = E.buildingCounts(S, o.id);
      const info = [fmt(o.money), `땅 ${E.ownedBy(S, o.id).length}개`];
      if (b.houses || b.hotels) info.push(`굴 ${b.houses} · 궁전 ${b.hotels}`);
      if (o.inJail) info.push('🔒 케이지');
      const no = why(o);
      return `<button class="target-btn" data-t="${o.id}" style="--tok:${tokColor(o)}" ${no ? 'disabled' : ''}>
        <span class="th mood-sad">${Hamster.svg(hamOf(o))}</span>
        <span class="tn">${esc(o.name)}</span><span class="ti">${info.join(' · ')}</span>
        ${no ? `<span class="tx">${no}</span>` : '<span class="tgo">공격! ⚔️</span>'}</button>`;
    }).join('');
    const m = modal('state', `<h2>${ATTACK_EMOJI[tp.act.kind] || '⚔️'} 누구를 공격할까요?</h2>
      <p class="attack-text">${esc(tp.text.replace(/^⚔️\s*/, ''))}</p>
      <div class="target-list">${rows}</div>`);
    m.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => act({ type: 'pickTarget', target: Number(b.dataset.t) }); });
  }

  function showBuy() {
    const i = S.pendingBuy, sp = BOARD[i], me = S.players[HUMAN];
    const can = me.money >= sp.price;
    const m = modal('state', `<h2>${sp.name}에 도착! 구매할까요?</h2>${deedHtml(i)}
      <div class="btns">
        <button class="btn primary" data-b="buy" ${can ? '' : 'disabled'}>구매하기 ${fmt(sp.price)}</button>
        <button class="btn" data-b="decline">경매에 부치기</button>
      </div>
      ${can ? '' : `<div class="empty">해바라기씨가 ${fmt(sp.price - me.money)} 부족해요. 저당으로 마련하거나 경매에서 노려 보세요.</div>`}
      <div class="btns"><button class="btn small" data-b="manage">🏠 내 땅 관리</button></div>`);
    m.querySelectorAll('[data-b]').forEach((b) => {
      b.onclick = () => (b.dataset.b === 'manage' ? openManage() : act({ type: b.dataset.b }));
    });
  }

  // 내 땅에 도착: 한 단계 짓기 (같은 색을 다 갖지 않아도 됨)
  function showLandBuild() {
    const i = S.pendingBuild, sp = BOARD[i], pr = S.props[i], me = S.players[HUMAN];
    const err = E.canLandBuild(S, HUMAN, i);
    const next = pr.houses + 1;
    const mult = E.rentMult(S, i);
    const now = E.calcRent(S, i, 7), after = Math.round(sp.rent[next] * mult);
    const what = next === 5 ? '🏰 햄스터 궁전' : `🏠 햄스터 굴 ${next}채째`;
    const m = modal('state', `<h2>내 땅 ${sp.name}에 도착! 건물을 지을까요?</h2>${deedHtml(i)}
      <div class="build-offer">
        <div>${what} · 건설비 <b>${fmt(sp.house)}</b></div>
        <div class="rent-up">통행료 ${fmt(now)} → <b>${fmt(after)}</b> ⬆</div>
      </div>
      <div class="btns">
        <button class="btn primary" data-b="landBuild" ${err ? 'disabled' : ''}>짓기 ${fmt(sp.house)}</button>
        <button class="btn" data-b="skipBuild">안 지을래요</button>
      </div>
      ${err ? `<div class="empty">${esc(err)}${me.money < sp.house ? ` (${fmt(sp.house - me.money)} 부족)` : ''}</div>` : ''}`);
    m.querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => act({ type: b.dataset.b }); });
  }

  // 남의 땅 강제 매입: (땅값 + 공사비) × 1.2
  function showTakeover() {
    const i = S.pendingTakeover, sp = BOARD[i], pr = S.props[i], me = S.players[HUMAN];
    const owner = S.players[pr.owner];
    const built = sp.type === 'prop' ? pr.houses * sp.house : 0;
    const price = E.takeoverPrice(S, i);
    const err = E.canTakeover(S, HUMAN, i);
    const bldTxt = pr.houses ? ` + 공사비 ${fmt(built)} (굴 ${pr.houses}채)` : '';
    const m = modal('state', `<h2>💥 ${esc(owner.name)}의 ${sp.name}, 강제로 사 버릴까요?</h2>${deedHtml(i)}
      <div class="build-offer takeover-offer">
        <div>땅값 ${fmt(sp.price)}${bldTxt} → × ${E.TAKEOVER_RATE}</div>
        <div class="rent-up">매입가 <b>${fmt(price)}</b> · ${esc(owner.name)}에게 줘요</div>
        ${pr.houses ? '<div class="sub">지어진 건물도 함께 내 것이 돼요</div>' : ''}
      </div>
      <div class="btns">
        <button class="btn primary" data-b="takeover" ${err ? 'disabled' : ''}>강제 매입 ${fmt(price)}</button>
        <button class="btn" data-b="skipTakeover">그냥 둘래요</button>
      </div>
      ${err ? `<div class="empty">${esc(err)}${me.money < price ? ` (${fmt(price - me.money)} 부족)` : ''}</div>` : ''}`);
    m.querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => act({ type: b.dataset.b }); });
  }

  // ---------- 텔레포트: 보드에서 칸을 눌러 고르기 ----------
  function teleportMode() {
    return !!S && S.phase === 'teleport' && S.current === HUMAN && E.actor(S) === HUMAN && !busy;
  }
  function openTeleport(i) {
    const sp = BOARD[i], me = S.players[HUMAN], pr = S.props[i];
    if (i === me.pos) return act({ type: 'teleport', to: i });
    let note = '';
    if (pr && pr.owner === null) note = `빈 땅이에요 · 가격 ${fmt(sp.price)}`;
    else if (pr && pr.owner === HUMAN) note = '내 땅이에요 · 건물을 지을 수 있어요';
    else if (pr) note = `${esc(S.players[pr.owner].name)}의 땅 · 통행료 ${sp.type === 'util' ? '주사위에 따라' : fmt(E.calcRent(S, i, 7))}`;
    else if (sp.type === 'gotojail') note = '앗, 케이지로 가게 돼요!';
    if (i < me.pos) note += (note ? ' · ' : '') + '출발을 지나 🌻200';
    const m = modal('user', `<h2>🌀 ${iconHtml(sp.icon || '', 'inline')} ${esc(sp.name)}(으)로 갈까요?</h2>
      <p style="text-align:center">${note}</p>
      <div class="btns"><button class="btn primary" data-go>순간이동!</button><button class="btn" data-x>다시 고르기</button></div>`);
    $('[data-go]', m).onclick = () => { closeModal('user'); act({ type: 'teleport', to: i }); };
    $('[data-x]', m).onclick = () => closeModal('user');
  }

  function showAuction() {
    const au = S.auction, sp = BOARD[au.pos], me = S.players[HUMAN];
    const a = E.actor(S);
    const myTurn = a === HUMAN;
    const leader = au.bidder !== null ? S.players[au.bidder].name : '없음';
    const bidders = S.players.filter((p) => !p.bankrupt).map((p) => {
      const out = !au.active.includes(p.id);
      return `<span class="bidder${out ? ' out' : ''}${p.id === a ? ' now' : ''}" style="--tok:${tokColor(p)}">${Hamster.svg(hamOf(p))}${esc(p.name)}</span>`;
    }).join('');
    const inc = [1, 10, 50, 100];
    const controls = myTurn
      ? `<div class="btns">${inc.map((d) => `<button class="btn" data-inc="${d}" ${au.bid + d > me.money ? 'disabled' : ''}>+${d}</button>`).join('')}</div>
         <div class="bid-input"><input type="number" min="${au.bid + 1}" max="${me.money}" value="${Math.min(me.money, au.bid + 10)}" id="bid-amt">
           <button class="btn primary" data-bid>입찰</button><button class="btn danger" data-pass>포기</button></div>
         <div class="empty">보유 ${fmt(me.money)}</div>`
      : `<div class="empty thinking">${esc(S.players[a].name)} 고민 중</div>`;
    const m = modal('state', `<h2>🔨 ${sp.name} 경매</h2>
      <div class="auction-bid">${fmt(au.bid)}</div>
      <div class="auction-who">최고 입찰: ${esc(leader)}</div>
      <div class="bidders">${bidders}</div>
      ${controls}
      <details style="margin-top:10px"><summary>도시 정보</summary>${deedHtml(au.pos)}</details>`);
    if (!myTurn) return;
    m.querySelectorAll('[data-inc]').forEach((b) => { b.onclick = () => act({ type: 'bid', amount: au.bid + Number(b.dataset.inc) }); });
    $('[data-bid]', m).onclick = () => act({ type: 'bid', amount: Number($('#bid-amt', m).value) });
    $('[data-pass]', m).onclick = () => act({ type: 'pass' });
  }

  function offerSide(x) {
    const items = x.props.map((i) => `<div class="prow"><span class="sw" style="background:${groupColor(i)}"></span><span class="pn">${BOARD[i].name}${S.props[i].mortgaged ? ' (저당)' : ''}</span><span></span></div>`);
    if (x.money) items.push(`<div class="prow"><span class="sw" style="background:#f2b705"></span><span class="pn">${fmt(x.money)}</span><span></span></div>`);
    if (x.cards) items.push(`<div class="prow"><span class="sw" style="background:#aaa"></span><span class="pn">🎫 탈출권 ${x.cards}장</span><span></span></div>`);
    return items.length ? items.join('') : '<div class="empty">없음</div>';
  }
  function showOffer() {
    const o = S.tradeOffer, from = S.players[o.from];
    const m = modal('state', `<h2>🤝 ${esc(from.name)}의 거래 제안</h2>
      <div class="trade-cols">
        <div><h3>내가 받는 것</h3><div class="prop-list">${offerSide(o.give)}</div></div>
        <div><h3>내가 주는 것</h3><div class="prop-list">${offerSide(o.get)}</div></div>
      </div>
      <div class="btns"><button class="btn good" data-r="1">수락</button><button class="btn danger" data-r="0">거절</button></div>`, 'wide');
    m.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => act({ type: 'respondTrade', accept: b.dataset.r === '1' }); });
  }

  // ---------- 승리 / 패배 연출 (게임마다 한 번) ----------
  let endFxDone = false;
  function playEndFx(won) {
    if (endFxDone) return;
    endFxDone = true;
    Sound.music(false);
    if (won) Sound.victory(); else Sound.lose();
    const me = tokenEl(HUMAN);
    if (me) {
      if (won) { me.classList.add('cheer'); mood(HUMAN, 'happy', 9000); bubble(HUMAN, '야호! 🏆'); }
      else if (!me.classList.contains('gone')) { mood(HUMAN, 'sad', 9000); bubble(HUMAN, '흑흑… 😢'); }
    }
    document.querySelectorAll('#end-fx').forEach((x) => x.remove());
    const fx = document.createElement('div');
    fx.id = 'end-fx';
    fx.className = won ? 'win' : 'lose';
    const rnd = (a, b) => a + Math.random() * (b - a); // 화면 장식용
    let html = `<div class="end-banner">${won ? '🏆 승리! 🏆' : '😢 패배…'}</div>`;
    if (won) {
      const colors = ['#f2a516', '#ff6b6b', '#4dabf7', '#51cf66', '#cc5de8', '#ffd43b', '#ff922b'];
      for (let k = 0; k < 90; k++) {
        const seed = k % 6 === 0;
        html += `<i class="${seed ? 'seed' : 'conf'}" style="left:${rnd(0, 100).toFixed(1)}%;--d:${rnd(0, 2.2).toFixed(2)}s;--t:${rnd(2.4, 4.2).toFixed(2)}s;--r:${rnd(-720, 720).toFixed(0)}deg;--x:${rnd(-80, 80).toFixed(0)}px;background:${seed ? 'none' : colors[k % colors.length]}">${seed ? '🌻' : ''}</i>`;
      }
    } else {
      html += '<div class="clouds"><span>☁️</span><span>🌧️</span><span>☁️</span><span>🌧️</span><span>☁️</span></div>';
      for (let k = 0; k < 70; k++) html += `<i class="drop" style="left:${rnd(0, 100).toFixed(1)}%;--d:${rnd(0, 3).toFixed(2)}s;--t:${rnd(0.7, 1.2).toFixed(2)}s"></i>`;
    }
    fx.innerHTML = html;
    document.body.appendChild(fx);
    setTimeout(() => fx.classList.add('out'), won ? 5500 : 5000);
    setTimeout(() => { fx.remove(); if (me) me.classList.remove('cheer'); }, won ? 6500 : 6000);
  }

  function showGameOver() {
    const w = S.players[S.winner];
    const won = S.winner === HUMAN;
    const ranking = S.players.slice().sort((a, b) => (a.bankrupt - b.bankrupt) || E.netWorth(S, b.id) - E.netWorth(S, a.id));
    const hero = won
      ? `<div class="result-hero win"><span class="rays"></span><span class="crown">👑</span>${Hamster.svg(hamOf(w))}</div>`
      : `<div class="result-hero lose mood-sad">${Hamster.svg(hamOf(S.players[HUMAN]))}</div>`;
    const m = modal('state', `<h2 class="${won ? 'title-win' : 'title-lose'}">${won ? '🎉 승리! 해바라기씨 부자 햄스터!' : '😢 아쉬워요… 다음엔 꼭!'}</h2>
      ${hero}
      <p style="text-align:center">${esc(w.name)} 승리 · ${esc(S.endReason)}</p>
      <div class="rank">${ranking.map((p, k) => `<div><span>${k + 1}. ${esc(p.name)}${p.bankrupt ? ' (파산)' : ''}</span><span>${fmt(E.netWorth(S, p.id))}</span></div>`).join('')}</div>
      <div class="btns"><button class="btn primary" data-g="new">새 게임</button><button class="btn" data-g="board">보드 보기</button></div>`);
    $('[data-g="new"]', m).onclick = backToStart;
    $('[data-g="board"]', m).onclick = () => closeModal('state');
    playEndFx(won);
  }

  // ---------- 사용자 창: 칸 정보 / 땅 관리 / 거래 / 메뉴 ----------
  const SPACE_INFO = {
    go: '지나가거나 도착하면 🌻200을 받아요.',
    chance: '해바라기씨 찬스 카드를 한 장 뽑아요.',
    chest: '볼주머니 카드를 한 장 뽑아요.',
    tax: '은행에 세금을 내요.',
    jail: '그냥 도착하면 구경만 해요. 갇히면 더블·벌금·탈출권으로 나올 수 있어요.',
    teleport: '도착하면 원하는 칸으로 순간이동해요! (출발을 지나면 🌻200)',
    gotojail: '곧바로 햄스터 케이지로! 출발 칸 보너스는 없어요.',
  };
  function openDetail(i) {
    const sp = BOARD[i];
    if (!E.isBuyable(i)) {
      const m = modal('user', `<h2>${iconHtml(sp.icon, 'inline')} ${sp.name}</h2><p style="text-align:center">${SPACE_INFO[sp.type]}${sp.amount ? ` (${fmt(sp.amount)})` : ''}</p>
        <div class="btns"><button class="btn" data-x>닫기</button></div>`);
      $('[data-x]', m).onclick = () => closeModal('user');
      return;
    }
    const render = () => {
      const pr = S.props[i];
      const mine = pr.owner === HUMAN;
      const m = modal('user', `${deedHtml(i)}${mine ? `<div class="btns">${propButtons(i)}</div>` : ''}
        <div class="btns"><button class="btn" data-x>닫기</button></div>`);
      bindPropButtons(m);
      $('[data-x]', m).onclick = () => closeModal('user');
    };
    render();
    layers.user._refresh = render;
  }

  function propButtons(i) {
    const sp = BOARD[i], pr = S.props[i];
    const btn = (type, label, err, cls) => `<button class="btn small ${cls || ''}" data-p="${type}" data-i="${i}" ${err ? `disabled title="${err}"` : ''}>${label}</button>`;
    let h = '';
    if (sp.type === 'prop' && E.ownsGroup(S, HUMAN, sp.group)) {
      h += btn('build', `🏠+ ${fmt(sp.house)}`, E.canBuild(S, HUMAN, i), 'good');
      h += btn('sell', `🏠− +${fmt(sp.house / 2)}`, E.canSell(S, HUMAN, i));
    }
    h += pr.mortgaged
      ? btn('unmortgage', `해제 −${fmt(E.unmortgageCost(i))}`, E.canUnmortgage(S, HUMAN, i))
      : btn('mortgage', `저당 +${fmt(sp.mortgage)}`, E.canMortgage(S, HUMAN, i));
    return h;
  }
  function bindPropButtons(root) {
    root.querySelectorAll('[data-p]').forEach((b) => {
      b.onclick = () => { act({ type: b.dataset.p, pos: Number(b.dataset.i) }); };
    });
  }

  function openManage() {
    const render = () => {
      const me = S.players[HUMAN];
      const mine = E.ownedBy(S, HUMAN).sort((a, b) => a - b);
      const rows = mine.map((i) => {
        const pr = S.props[i];
        const status = pr.mortgaged ? '저당 중' : pr.houses === 5 ? '궁전 🏰' : pr.houses ? `굴 ${pr.houses}채` : BOARD[i].type === 'prop' && E.ownsGroup(S, HUMAN, BOARD[i].group) ? '독점!' : '';
        return `<div class="prow"><span class="sw" style="background:${groupColor(i)}"></span>
          <div><div class="pn">${BOARD[i].name}</div><div class="ps">${status}</div></div>
          <div class="pa">${propButtons(i)}</div></div>`;
      }).join('');
      const m = modal('user', `<h2>🏠 내 땅 관리</h2>
        <p style="text-align:center;margin:0 0 10px">보유 ${fmt(me.money)} · 은행 굴 ${S.bankHouses} · 궁전 ${S.bankHotels}</p>
        <div class="prop-list">${rows || '<div class="empty">아직 땅이 없어요</div>'}</div>
        <p class="empty">같은 색 도시를 모두 가지면 굴을 지을 수 있어요. 굴은 고르게 지어야 하고, 4채 다음은 궁전이에요.</p>
        <div class="btns"><button class="btn" data-x>닫기</button></div>`, 'wide');
      bindPropButtons(m);
      $('[data-x]', m).onclick = () => closeModal('user');
    };
    render();
    layers.user._refresh = render;
  }

  function openTrade() {
    if (S.phase === 'gameover') return;
    if (S.current !== HUMAN || E.actor(S) !== HUMAN || S.auction || S.debts.length || S.tradeOffer || S.cardQuiz || ['buy', 'build', 'teleport', 'takeover'].includes(S.phase)) {
      return toast('거래는 내 차례에 할 수 있어요');
    }
    const opps = S.players.filter((p) => p.id !== HUMAN && !p.bankrupt);
    let target = opps[0].id;
    const sel = { give: new Set(), get: new Set() };
    let giveMoney = 0, getMoney = 0, giveCards = 0, getCards = 0;
    const tradable = (pid) => E.ownedBy(S, pid).filter((i) => !E.groupHasBuildings(S, i)).sort((a, b) => a - b);
    const list = (pid, set, side) => {
      const ids = tradable(pid);
      if (!ids.length) return '<div class="empty">거래할 수 있는 땅이 없어요</div>';
      return ids.map((i) => `<div class="prow${set.has(i) ? ' sel' : ''}" data-side="${side}" data-i="${i}" style="cursor:pointer">
        <span class="sw" style="background:${groupColor(i)}"></span>
        <div><div class="pn">${BOARD[i].name}</div><div class="ps">${fmt(BOARD[i].price)}${S.props[i].mortgaged ? ' · 저당' : ''}</div></div>
        <span>${set.has(i) ? '✔' : ''}</span></div>`).join('');
    };
    const render = () => {
      const me = S.players[HUMAN], th = S.players[target];
      const m = modal('user', `<h2>🤝 거래 제안</h2>
        <div class="tabs">${opps.map((p) => `<button class="btn small${p.id === target ? ' on' : ''}" data-t="${p.id}">${esc(p.name)}</button>`).join('')}</div>
        <div class="trade-cols">
          <div><h3>내가 줄 것</h3><div class="prop-list">${list(HUMAN, sel.give, 'give')}</div>
            <div class="money-in">🌻 <input type="number" min="0" max="${me.money}" value="${giveMoney}" data-m="give"> / ${fmt(me.money)}</div>
            ${me.jailCards.length ? `<div class="money-in">🎫 <input type="number" min="0" max="${me.jailCards.length}" value="${giveCards}" data-c="give"> 장</div>` : ''}</div>
          <div><h3>${esc(th.name)}에게 받을 것</h3><div class="prop-list">${list(target, sel.get, 'get')}</div>
            <div class="money-in">🌻 <input type="number" min="0" max="${th.money}" value="${getMoney}" data-m="get"> / ${fmt(th.money)}</div>
            ${th.jailCards.length ? `<div class="money-in">🎫 <input type="number" min="0" max="${th.jailCards.length}" value="${getCards}" data-c="get"> 장</div>` : ''}</div>
        </div>
        <p class="empty">건물이 있는 색 그룹의 땅은 거래할 수 없어요. 저당 잡힌 땅을 받으면 이자 10%를 내요.</p>
        <div class="btns"><button class="btn primary" data-send>제안하기</button><button class="btn" data-x>닫기</button></div>`, 'wide');
      m.querySelectorAll('[data-t]').forEach((b) => {
        b.onclick = () => { target = Number(b.dataset.t); sel.get.clear(); getMoney = 0; getCards = 0; render(); };
      });
      m.querySelectorAll('[data-side]').forEach((r) => {
        r.onclick = () => {
          const set = sel[r.dataset.side], i = Number(r.dataset.i);
          if (set.has(i)) set.delete(i); else set.add(i);
          render();
        };
      });
      m.querySelectorAll('[data-m]').forEach((inp) => {
        inp.oninput = () => { const v = Math.max(0, Math.floor(Number(inp.value) || 0)); if (inp.dataset.m === 'give') giveMoney = v; else getMoney = v; };
      });
      m.querySelectorAll('[data-c]').forEach((inp) => {
        inp.oninput = () => { const v = Math.max(0, Math.floor(Number(inp.value) || 0)); if (inp.dataset.c === 'give') giveCards = v; else getCards = v; };
      });
      $('[data-x]', m).onclick = () => closeModal('user');
      $('[data-send]', m).onclick = () => {
        const offer = {
          to: target,
          give: { props: [...sel.give], money: giveMoney, cards: giveCards },
          get: { props: [...sel.get], money: getMoney, cards: getCards },
        };
        if (act({ type: 'proposeTrade', offer })) closeModal('user');
      };
    };
    render();
  }

  function openMenu() {
    const m = modal('user', `<h2>☰ 메뉴</h2>
      <div class="btns" style="flex-direction:column">
        <button class="btn" data-m="rules">📖 규칙 요약</button>
        <button class="btn" data-m="home">🏡 처음 화면으로 (자동 저장됨)</button>
        <button class="btn danger" data-m="new">🔄 이 게임 포기하고 새 게임</button>
        <button class="btn" data-m="x">닫기</button>
      </div>`);
    m.querySelectorAll('[data-m]').forEach((b) => {
      b.onclick = () => {
        const v = b.dataset.m;
        if (v === 'x') closeModal('user');
        else if (v === 'home') { save(); backToStart(); }
        else if (v === 'new') {
          if (window.confirm('지금 게임을 버리고 새로 시작할까요?')) {
            try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
            S = null;
            backToStart();
          }
        } else if (v === 'rules') openRules();
      };
    });
  }
  function openRules() {
    const m = modal('user', `<h2>📖 규칙 요약</h2>
      <ul style="line-height:1.7;padding-left:18px;margin:0">
        <li>시작 자금 🌻1,500, 출발을 지나면 🌻200</li>
        <li>주인 없는 땅: 사거나, 거절하면 모두가 참여하는 경매</li>
        <li>같은 색을 모두 가지면 통행료 2배 + 굴 건설 가능 (고르게, 4채 다음 궁전)</li>
        <li>은행의 굴은 32채, 궁전은 12채뿐 — 품절되면 못 지어요</li>
        <li>더블이면 한 번 더! 3연속 더블은 케이지행</li>
        <li>케이지: 벌금 🌻50 / 탈출권 / 더블. 3번째 실패 시 벌금 내고 이동</li>
        <li>저당: 저당가를 받고, 해제할 때 10% 이자. 저당 중엔 통행료 없음</li>
        <li>빚을 못 갚으면 파산. 마지막까지 남은 햄스터가 승리</li>
      </ul>
      <div class="btns"><button class="btn" data-x>닫기</button></div>`);
    $('[data-x]', m).onclick = () => closeModal('user');
  }

  // ---------- 시작 ----------
  function bindRollBtn() {
    const b = $('#roll-btn');
    b.onpointerdown = (e) => { if (e.button === 0) { e.preventDefault(); startCharge(); } };
    b.onclick = () => { if (!suppressClick && !charge && !b.disabled) rollWithQuiz(0.5); }; // 키보드 등
    b.oncontextmenu = (e) => e.preventDefault();
  }

  function bindToolbar() {
    bindRollBtn();
    $('#btn-manage').onclick = () => S && openManage();
    $('#btn-trade').onclick = () => S && openTrade();
    $('#btn-fast').onclick = () => { fast = !fast; renderAll(); toast(fast ? '⏩ 빨리 감기 켜짐' : '빨리 감기 꺼짐'); };
    $('#btn-sound').onclick = () => { Sound.toggle(); renderAll(); };
    $('#btn-music').onclick = () => { toast(Sound.toggleMusic() ? '🎵 배경음악 켜짐' : '배경음악 꺼짐'); renderAll(); };
    $('#btn-menu').onclick = () => S && openMenu();
    window.addEventListener('resize', () => { if (S) { sizeBoard(); layoutTokens(); layoutBuildings(); } });
    document.addEventListener('keydown', (e) => {
      if (quiz) { // 1·2·3 키로 답 고르기
        const k = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code) + 1 || ['Numpad1', 'Numpad2', 'Numpad3'].indexOf(e.code) + 1;
        if (k && !quiz.done) { e.preventDefault(); answerQuiz(k - 1); }
        return;
      }
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (!S || $('#game-screen').classList.contains('hidden')) return;
      if (layers.user || layers.state || layers.card) return;
      if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) return;
      const rb = $('#roll-btn');
      if (rb && !rb.disabled && !rb.classList.contains('hidden')) { e.preventDefault(); if (!e.repeat) startCharge(); return; }
      const b = $('#actions [data-primary]');
      if (!b || b.disabled) return;
      e.preventDefault();
      if (!e.repeat) b.click();
    });
    document.addEventListener('keyup', (e) => {
      if ((e.code === 'Space' || e.code === 'Enter') && charge) { e.preventDefault(); releaseCharge(); }
    });
  }

  // 주사위 면 이미지(assets/dice/)가 있으면 그 텍스처로: face1~6.png(눈 포함) 우선, 없으면 face.png(눈은 게임이 그림)
  function probeDiceTextures() {
    const box = $('#dice');
    const six = new Image();
    six.onload = () => box.classList.add('tex', 'faces');
    six.onerror = () => {
      const one = new Image();
      one.onload = () => box.classList.add('tex');
      one.src = 'assets/dice/face.png';
    };
    six.src = 'assets/dice/face1.png';
  }

  // ---------- 배경: 세계지도 위의 햄스터들 ----------
  // 지도는 경도 -180~180, 위도 90~-60 (tools/make_world_map.py) → (경도, 위도)로 위치 계산
  const WORLD_SPOTS = [ // [경도, 위도, 햄스터 번호, 크기]
    [-98, 40, 2, 1], [-58, -12, 1, 0.85], [20, 4, 3, 1], [3, 48, 1, 1],
    [88, 58, 2, 0.8], [127, 38, 0, 1.1], [104, 14, 3, 0.8], [134, -24, 0, 0.9],
  ];
  function buildWorldBg() {
    const bg = $('#world-bg');
    if (!bg) return;
    const xy = ([lon, lat]) => [lon + 180, 90 - lat];
    $('.wb-hams', bg).innerHTML = WORLD_SPOTS.map(([lon, lat, k, size], n) => {
      const [x, y] = xy([lon, lat]);
      return `<span class="wb-ham" style="left:${(x / 360 * 100).toFixed(2)}%;top:${(y / 150 * 100).toFixed(2)}%;--s:${size};--d:${(n * 0.37).toFixed(2)}s">${Hamster.svg(HAMSTERS[k])}</span>`;
    }).join('');
    // 햄스터들을 잇는 점선 여행 경로 (살짝 휘어진 곡선)
    const pts = WORLD_SPOTS.map(xy);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
      d += ` Q${((x0 + x1) / 2).toFixed(1)},${(Math.min(y0, y1) - 12).toFixed(1)} ${x1},${y1}`;
    }
    $('.wb-route', bg).innerHTML = `<path d="${d}"/>`;
    // 직접 만든 배경 그림이 있으면 그걸로
    const img = new Image();
    img.onload = () => { bg.classList.add('custom'); bg.style.backgroundImage = 'url("assets/background/bg.png")'; };
    img.src = 'assets/background/bg.png';
  }

  // ---------- 눈 깜빡임 (REQ-130): 화면 장식이라 Math.random 사용 ----------
  function blinkLoop() {
    if (document.hidden) return;
    document.querySelectorAll('#tokens .hamster, #start-hero .hamster, #hamster-pick .hamster, .wb-ham .hamster').forEach((el) => {
      if (Math.random() > 0.045 || el.classList.contains('blinking')) return;
      const tok = el.closest('.token');
      if (tok && (tok.dataset.mood || tok.classList.contains('gone') || tok.classList.contains('caged') || tok.classList.contains('wheel-fall'))) return;
      const blink = (after) => {
        el.classList.add('blinking');
        setTimeout(() => { el.classList.remove('blinking'); if (after) setTimeout(after, 140); }, 150);
      };
      blink(Math.random() < 0.2 ? () => blink() : null); // 가끔 두 번 깜빡
    });
  }
  setInterval(blinkLoop, 400);

  // 휴대폰 하단 시트: 손잡이를 누르면 펼치기/접기
  $('#sheet-handle').onclick = () => {
    const side = $('.side');
    const open = side.classList.toggle('expanded');
    $('#sheet-handle').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) side.scrollTop = 0;
  };

  probeDiceTextures();
  buildWorldBg();
  bindToolbar();
  initStart();
  // 햄스터 이미지가 있으면 확인 후 다시 그리기
  Hamster.preload(HAMSTERS, () => {
    buildWorldBg();
    if (S && !$('#game-screen').classList.contains('hidden')) { buildTokens(); renderAll(); }
    else initStart();
  });
  window.HWT = { get state() { return S; }, get busy() { return busy; } }; // 디버그/테스트용
})();
