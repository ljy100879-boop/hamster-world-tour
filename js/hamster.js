// 햄스터 월드 투어 — 골든 햄스터 SVG
// 표정은 바깥 요소의 클래스로 바꾼다: .mood-happy(볼 빵빵) .mood-sad(시무룩) .mood-sleep(Zzz)
// assets/hamsters/<id>.png 가 있으면 그 이미지를 쓰고, 없으면 아래 SVG로 그린다.
// 표정 이미지(<id>-happy.png, -sad.png, -sleep.png)는 선택 — 없으면 CSS 효과로 대신한다.
(function (root) {
  'use strict';

  const FUR = '#e9a23b', FUR_DARK = '#b9741f', CREAM = '#fff3dc', PINK = '#f59bb0';

  function accessory(kind) {
    switch (kind) {
      case 'sunflower': {
        let petals = '';
        for (let k = 0; k < 10; k++) {
          petals += `<ellipse cx="50" cy="14" rx="3.6" ry="7" fill="#ffd21f" stroke="#e0a400" stroke-width=".6" transform="rotate(${k * 36} 50 21)"/>`;
        }
        return `<g class="acc">${petals}<circle cx="50" cy="21" r="5.2" fill="#7a4a1d"/><circle cx="48.6" cy="19.8" r="1" fill="#a8703a"/><circle cx="51.6" cy="22" r="1" fill="#a8703a"/></g>`;
      }
      case 'bow':
        return `<g class="acc" transform="rotate(18 70 30)">
          <path d="M70 30 L56 21 Q53 30 56 39 Z" fill="#e0474c" stroke="#a82a2f" stroke-width="1"/>
          <path d="M70 30 L84 21 Q87 30 84 39 Z" fill="#e0474c" stroke="#a82a2f" stroke-width="1"/>
          <circle cx="70" cy="30" r="4.2" fill="#f2676b" stroke="#a82a2f" stroke-width="1"/></g>`;
      case 'hat':
        return `<g class="acc">
          <ellipse cx="50" cy="33" rx="21" ry="5" fill="#2e63c4" stroke="#1d4590" stroke-width="1"/>
          <path d="M37 33 Q36 15 50 14 Q64 15 63 33 Z" fill="#3d7be0" stroke="#1d4590" stroke-width="1"/>
          <rect x="37.5" y="26" width="25" height="4" fill="#ffd21f"/>
          <circle cx="50" cy="13" r="3" fill="#ffd21f"/></g>`;
      case 'glasses':
        return `<g class="acc">
          <path d="M22 79 Q50 90 78 79 L80 85 Q50 97 20 85 Z" fill="#2fa45a" stroke="#1d7a3e" stroke-width="1"/>
          <path d="M66 86 L72 98 L62 96 Z" fill="#2fa45a" stroke="#1d7a3e" stroke-width="1"/>
          <g fill="none" stroke="#3a2a1a" stroke-width="1.8">
            <circle cx="38" cy="52" r="7.5"/><circle cx="62" cy="52" r="7.5"/><path d="M45.5 51 Q50 48 54.5 51"/>
          </g></g>`;
      default:
        return '';
    }
  }

  function drawSvg(h, extraClass) {
    const acc = accessory(h.accessory);
    const behindAcc = h.accessory === 'glasses' ? '' : acc;
    const frontAcc = h.accessory === 'glasses' ? acc : '';
    return `<svg class="hamster ${extraClass || ''}" viewBox="0 0 100 100" aria-label="${h.name}" role="img">
      <ellipse class="shadow" cx="50" cy="94" rx="26" ry="4" fill="rgba(0,0,0,.15)"/>
      <g class="body">
        <circle cx="26" cy="35" r="10" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="1.2"/>
        <circle cx="26" cy="35" r="5.5" fill="${PINK}"/>
        <circle cx="74" cy="35" r="10" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="1.2"/>
        <circle cx="74" cy="35" r="5.5" fill="${PINK}"/>
        <ellipse cx="50" cy="62" rx="35" ry="31" fill="${FUR}" stroke="${FUR_DARK}" stroke-width="1.4"/>
        <ellipse cx="50" cy="75" rx="22" ry="16" fill="${CREAM}"/>
        <g class="pouch">
          <ellipse cx="24" cy="66" rx="13" ry="11" fill="#f5c983" stroke="${FUR_DARK}" stroke-width="1"/>
          <ellipse cx="76" cy="66" rx="13" ry="11" fill="#f5c983" stroke="${FUR_DARK}" stroke-width="1"/>
        </g>
        <ellipse cx="50" cy="61" rx="17" ry="12" fill="${CREAM}"/>
        <ellipse cx="31" cy="62" rx="6" ry="3.6" fill="#f7a1a8" opacity=".65"/>
        <ellipse cx="69" cy="62" rx="6" ry="3.6" fill="#f7a1a8" opacity=".65"/>
        <g class="eyes-open">
          <circle cx="38" cy="52" r="4.3" fill="#2b1a10"/><circle cx="39.5" cy="50.6" r="1.4" fill="#fff"/>
          <circle cx="62" cy="52" r="4.3" fill="#2b1a10"/><circle cx="63.5" cy="50.6" r="1.4" fill="#fff"/>
        </g>
        <g class="eyes-closed" fill="none" stroke="#2b1a10" stroke-width="1.8" stroke-linecap="round">
          <path d="M34 52 Q38 55 42 52"/><path d="M58 52 Q62 55 66 52"/>
        </g>
        <ellipse cx="50" cy="58" rx="3.2" ry="2.3" fill="${PINK}"/>
        <path class="mouth-happy" d="M45.5 61 Q48 64.5 50 61.5 Q52 64.5 54.5 61" fill="none" stroke="#6b3d1f" stroke-width="1.3" stroke-linecap="round"/>
        <path class="mouth-sad" d="M45.5 64 Q50 60.5 54.5 64" fill="none" stroke="#6b3d1f" stroke-width="1.3" stroke-linecap="round"/>
        <ellipse cx="40" cy="83" rx="5" ry="3.5" fill="#ffd2bd"/>
        <ellipse cx="60" cy="83" rx="5" ry="3.5" fill="#ffd2bd"/>
        <path class="tear" d="M66 56 Q68 61 66 63 Q64 61 66 56 Z" fill="#7fc8f8"/>
        ${behindAcc}${frontAcc}
      </g>
      <text class="zzz" x="74" y="18" font-size="14" fill="#5b6bbf" font-weight="bold">Zz</text>
    </svg>`;
  }

  const DIR = "assets/hamsters/";
  const MOODS = ["happy", "sad", "sleep"];
  const avail = {}; // id -> { base, happy, sad, sleep }

  // 이미지가 있는지 미리 확인 (file:// 에서도 동작하도록 Image 로딩으로 판별)
  function preload(list, done) {
    let pending = 0;
    const probe = (h, m) => {
      pending++;
      const img = new Image();
      img.onload = () => {
        avail[h.id][m] = true;
        if (m === "base") MOODS.concat("blink").forEach((x) => probe(h, x)); // 기본 이미지가 있을 때만 표정·깜빡임 이미지 확인
        fin();
      };
      img.onerror = fin;
      img.src = DIR + h.id + (m === "base" ? "" : "-" + m) + ".png";
    };
    const fin = () => { if (--pending === 0 && done) done(); };
    for (const h of list) { avail[h.id] = {}; probe(h, "base"); }
  }

  function imageHtml(h, a, extraClass) {
    const moods = MOODS.concat("blink").filter((m) => a[m]).map((m) => `<img class="hm hm-${m}" src="${DIR}${h.id}-${m}.png" alt="">`).join("");
    return `<span class="hamster himg ${extraClass || ""}" role="img" aria-label="${h.name}">
      <img class="hb" src="${DIR}${h.id}.png" alt="">${moods}<span class="tear-badge">💧</span><span class="zzz-badge">Zz</span></span>`;
  }

  function svg(h, extraClass) {
    const a = avail[h.id];
    return a && a.base ? imageHtml(h, a, extraClass) : drawSvg(h, extraClass);
  }

  const api = { svg, preload };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Hamster = api;
})(this);
