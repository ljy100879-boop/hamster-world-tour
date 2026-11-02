# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"햄스터 월드 투어" — a single-player (human vs 1–3 computer players) property-trading board game following classic Monopoly rules, with world capitals as properties, golden-hamster tokens, and 해바라기씨 (🌻) as currency. Plain static web app: open `index.html` directly in a browser (works from `file://`, no build step, no server, no package.json). UI text and code comments are Korean.

## Spec workflow (important)

- The spec lives in numbered PRDs: `prd-1.md`, `prd-2.md`, … Each user-requested change gets a **new** file: copy the highest-numbered PRD to `prd-(N+1).md`, bump the `문서 버전` line in the header table, and append a numbered section describing the change. Never edit older PRDs.
- The game must match the highest-numbered PRD. Note that `ls` sorts lexically (`prd-10` before `prd-2`); use `ls prd-*.md | sort -V`.
- Implementation decisions that deviate from classic rules are recorded in the PRD (§13 in prd-3 onward), e.g. mortgaged property received via trade/bankruptcy auto-pays 10% interest and stays mortgaged.

## Commands

```bash
node tests/sim.js 100          # N AI-only games: checks for crashes, stuck states, and invariants (house/hotel counts, deck sizes, no negative money)
node tests/cards.js            # forces each chance card once and checks it applies (add new card effect types to engine drawCard())
node tests/quiz.js             # card quiz (good/bad × right/wrong), teleport, land-build, world-event rent, forfeitRoll, peekDice == actual roll
node --check js/ui.js          # syntax check (there is no linter or test framework)
python tools/cut_hamsters.py   # regenerate assets/hamsters/*.png from assets/hamsters/원본/ sheets
python tools/cut_buildings.py  # newest image in assets/buildings/원본/ → house.png, palace.png
python tools/cut_dice.py [img] # newest image in assets/dice/원본/ → face1..6.png (or face.png)
```
The Python tools need Pillow, numpy, scipy. UI behaviour was verified with headless Chrome via puppeteer-core outside the repo; there is no UI test in the repo.

## Architecture

Scripts are classic `<script>` tags (no ES modules, since `file://` blocks them), loaded in order `data → engine → ai → questions → hamster → sound → ui`. Each file is an IIFE that exports a global (`GameData`, `Engine`, `AI`, `Hamster`, `Sound`) or, under Node, `module.exports` — so `data.js`, `engine.js`, `ai.js` run headless in `tests/sim.js`.

**`js/engine.js` — all rules, no DOM.** The whole game is one plain JSON state object `s` (serialized to localStorage as-is).
- Every mutation goes through `Engine.act(s, pid, action)`, which returns `''` on success or a Korean error string, then calls `settle()` (game-over check, skip bankrupt player's turn).
- Turn flow is `s.phase` (`preRoll` → `buy` / `build` (landed on own city: `landBuild`/`skipBuild`) / `teleport` (space 20: `teleport {to}`) / `takeover` (after paying rent on a non-palace city: `takeover`/`skipTakeover` at (price + buildings) × 1.2) → `postRoll`, or `gameover`) plus overlays that take priority in this order: `s.debts` (human couldn't pay), `s.targetPick` (attack card waiting for its user to choose a victim → `pickTarget` action), `s.cardQuiz` (human landed on chance/chest; the top card is pre-picked with `bad` from `isBadCard`; UI asks a question from `js/questions.js` and reports `cardQuizAnswer {correct}` — good card fires on correct, bad card fires on wrong, an unused card goes to the deck bottom), `s.auction`, `s.tradeOffer`. `Engine.actor(s)` returns whoever must act now; UI and AI both key off it.
- Every 5th round `nextTurn` fires a world event (`s.world`; boom/crash/festival multiply rent via `rentMult` inside `calcRent`, harvest/famine move money once).
- Randomness uses a seeded PRNG whose state is `s.seed` (`Engine.rand`). Game outcomes must never use `Math.random` (UI-only cosmetics may).
- The engine pushes animation events into `s.events` (`dice`, `move`, `money`, `card`, `build`, `bankrupt`, `speech`, …); the engine never consumes them.
- `charge()` handles payments: an AI that is short of cash liquidates synchronously through `Engine.hooks.raiseCash` (set by `ai.js`) or goes bankrupt; a human gets a queued debt instead.

**`js/ai.js`** — `AI.step(s, pid)` performs exactly one action so the UI can pace it. Difficulty tuning lives in `CFG`; trade aggressiveness is fixed by the PRD as easy 1×, normal 2×, hard 3×. It also registers `Engine.hooks.evaluateTrade`.

**`js/ui.js` — rendering and pacing.**
- The core loop is `pump()`: play queued `s.events` as animations → `renderAll()` → save → if `Engine.actor` is an AI, wait and call `AI.step`, then repeat; it stops when the human must act.
- Human input goes through `act(action)`. Rolling goes through `rollWithQuiz()` first: a UI-only math quiz whose answer is the upcoming dice total (`Engine.peekDice` reads it without advancing the seed) must be answered before `act({type:'roll'})`; 3 misses send `forfeitRoll`.
- Modals use three layers: `state` (buy/auction/trade offer/game over; derived from engine state in `syncStateModal`), `user` (windows the player opened), and `card`.
- Other moving parts in this file: 3D buildings drawn on the board's inner edge (`renderBuildings`), the hold-to-roll power gauge (`startCharge`/`releaseCharge`), auto end-turn when nothing is left to do, and 3D CSS dice whose face rotations are in `FACE_ROT`. `window.HWT` exposes the state for debugging.

**Sizing.** `sizeBoard()` sets explicit board pixels: it fills the screen height and widens up to 1.45× on wide screens (square at ≤900px). Inside the board, every size uses `calc(N * var(--u))`, where `--u` is the average of `cqw` and `cqh` on the board container. Don't write raw `cqw`/`cqh` in new CSS. Overlays appended to `<body>` (the construction scene) set `font-size` from the board size in JS and use `em` instead.

**Assets are optional, user-supplied, and have fallbacks.** The user generates images with external AI tools; prompt guides live in `assets/*/PROMPTS.md`.

| Asset | Path | Fallback when missing |
|---|---|---|
| Hamsters | `assets/hamsters/<id>.png`, optional `-happy` / `-sad` / `-sleep` variants (detected by `Hamster.preload`) | built-in SVG |
| Buildings | `assets/buildings/house.png`, `palace.png` | Fluent icons in `assets/icons/` (via `onerror`) |
| Dice | `assets/dice/face1..6.png`, else `face.png` (adds `.tex` / `.faces` classes on `#dice`) | glass CSS dice |
| Landmarks | `assets/landmarks/<cc>.png` (`cc` is the country code derived from the city's flag emoji) | none |
| Flags | `assets/flags/<cc>.svg` | none |
| Music | `assets/music/bgm.mp3` (looped) | built-in WebAudio carousel waltz in `sound.js` |

Source sheets stay in each `원본/` folder. AI-generated "transparent" images often have a fake checkerboard painted in; `tools/cut_sheet.py` detects the background type (real alpha, checkerboard, or solid colour) before cutting. Icon and flag licenses are listed in `assets/LICENSES.md`.

## Gotchas

- Saved games (`localStorage` key `hwt.save`, `version: 1`) are raw engine state. Changing the state shape can break "이어하기" (continue).
- `tests/sim.js` caps games at 20,000 steps. Some AI-only games stalemate when nobody completes a monopoly; that counts as `capped`, not a failure.
