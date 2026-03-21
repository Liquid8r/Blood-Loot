# Level 1-1 Story & Tutorial Redesign – Implementation Plan

**Status:** Implemented. Tutorial tips removed; dialogue and boss flow updated as below.

## 1. Remove All Previous Tutorial Tips

**Goal:** Remove every existing `showTutorial(...)` call so we can add new variants later.

**Locations to remove or disable:**
- `xp_orb` – XP orbs (around line 3265)
- `item_drop` – Items from enemies (around line 3316)
- `blood_pool` – Blood pools (around line 3787)
- `extraction` – Post-boss extraction hint (around line 3808)
- `manhole` – Manholes spawn enemies (around line 5592)
- `miniboss` – Mini-boss appeared (around line 5630)
- `boss` – Boss appeared (around line 5888)

**Approach:** Remove or comment out each `showTutorial("...", ...)` invocation. Keep the tutorial infrastructure (`showTutorial`, `getTutorialSeen`, `setTutorialSeen`, overlay rendering) so new tips can be added later.

---

## 2. Dialogue & Quest Flow (Correct Order)

### 2.1 Commander “extract” dialogue (after all manholes welded)

- **When:** After last manhole is welded, dialogue runs: character → Commander.
- **Commander line:** Must mention extract and include **(Push "x")** in the text so it appears in the speech bubble.
- **Example:** `"Well done! Now extract and we'll debrief at base. (Push \"x\")"`
- **No boss yet:** Boss does not spawn until after the full malfunction sequence below.

### 2.2 Quest status when waiting for extract

- **Text:** `Extract (Push "x")` in the quest/objective box so the next step is explicit.

### 2.3 Player presses X

- **Trigger:** Only when `level11StoryPhase === "extractReady"`.
- **Effect:**
  1. Switch to a “malfunction” phase (e.g. keep `malfunction` or rename for clarity).
  2. **Character line:** e.g. `"Rockets are jammed. I might not make it back..."`
  3. **Commander line:** e.g. `"We've picked up something big on the radar. Hold position."`
  4. No boss spawn, no red overlay, no BOSS ALERT at this moment.

### 2.4 Short reading time after Commander’s “radar” line

- **Rule:** After the Commander’s “something big on radar” line is fully shown (typewriter + display hold), wait **2 seconds** “reading time” (no new dialogue, no boss yet).

### 2.5 BOSS ALERT + red board (still no boss)

- **After the 2 s reading time:**
  1. **BOSS ALERT** text appears and **blinks** on screen (same banner as today).
  2. **Red overlay** on the game board (existing red emergency tint).
  3. **No boss spawn yet.** No pause, no camera move yet.

### 2.6 Two seconds later: spawn boss, pause, camera

- **After 2 seconds of BOSS ALERT + red:**
  1. **Spawn boss** (at a door, as now).
  2. **Pause game.**
  3. **BOSS ALERT** keeps **blinking**.
  4. **Camera** moves to boss (boss centered on screen).
  5. Camera **stays on boss for 2 seconds**.

### 2.7 End of boss intro

- After the 2 s hold on boss:
  1. **BOSS ALERT** disappears (stop blinking, hide banner).
  2. **Camera** moves back to the character.
  3. When character is centered again, **unpause** and set phase to e.g. `bossSpawned`.
  4. **Only from this moment** do minions/other mobs start spawning again (door spawns enabled only after camera is back).

---

## 3. Phase / State Machine (Suggested)

| Phase            | Meaning |
|------------------|--------|
| `clear`          | Clearing mice. |
| `weldHint`       | After ~10 kills; weld manholes. |
| `welded`         | All manholes welded; playing “welded” dialogue (character + Commander with “extract (Push \"x\")”). |
| `extractReady`   | Commander finished; quest shows “Extract (Push \"x\")”; waiting for X. |
| `malfunction`    | Player pressed X; playing malfunction dialogue (character “rockets jammed” → Commander “something big on radar”). |
| `radarRead`      | Commander’s radar line done; 2 s reading time (timer). |
| `bossAlert`      | BOSS ALERT blinking + red overlay; 2 s timer; no boss yet. |
| `bossSpawn`      | Spawn boss, pause, camera to boss, 2 s hold. |
| `bossPanBack`    | BOSS ALERT off, camera pan back to character. |
| `bossSpawned`    | Camera back; unpause; door/minion spawns allowed again. |

Transitions:

- `welded` → (dialogue done) → `extractReady`
- `extractReady` + key X → `malfunction` (start malfunction dialogue)
- `malfunction` → (dialogue + 2 s read) → `bossAlert`
- `bossAlert` → (after 2 s) → spawn boss, pause, camera → `bossSpawn` (or keep in same phase with sub-state)
- After 2 s on boss → hide BOSS ALERT, pan back → `bossPanBack`
- When camera at player → `bossSpawned`, unpause, allow spawns

---

## 4. Door / Minion Spawns

- **Current:** `level11DoorSpawnsAllowed()` true for `extractReady`, `malfunction`, `redAlert`, `bossWarn`.
- **New:** Door/minion spawns **only** when `level11StoryPhase === "bossSpawned"` (and possibly `extractReady` if we want spawns while waiting for X – confirm with design). So:
  - **Not** during: `malfunction`, `radarRead`, `bossAlert`, or during camera pan/hold.
  - **Yes** when: `bossSpawned` (and optionally `extractReady`).

---

## 5. Dialogue Text Overflow (Snakkebobler)

- **Problem:** Text can extend outside the speech bubble.
- **Fix:**
  - Compute **bubble inner width** in pixels (bubble rect minus left/right padding and portrait).
  - **maxCharsPerLine** from that width and font size (e.g. `fontSize * 0.6` for “Press Start 2P”).
  - Word-wrap dialogue lines so no line exceeds that length; ensure last word doesn’t overflow (break at spaces, fallback to char break).
  - Use the **same** width for both typewriter “visible” text and any pre-computed line breaks so what’s displayed matches the box.

---

## 6. Implementation Checklist

- [x] **Tutorials:** Remove all `showTutorial(...)` calls (7 places); keep infra.
- [ ] **Dialogue copy:** Update “welded” Commander line to include `(Push "x")`. Update malfunction to character “Rockets are jammed. I might not make it back...” and Commander “We've picked up something big on the radar. Hold position.” (or agreed wording).
- [x] **Quest box:** In `extractReady`, show `Extract (Push "x")`.
- [x] **Phases:** Introduce `radarRead`, `bossAlert`; defer boss spawn until after 2 s of BOSS ALERT + red.
- [x] **Timers:** 2 s after Commander’s radar line → show BOSS ALERT + red; 2 s after that → spawn boss, pause, camera, 2 s hold; then BOSS ALERT off, pan back, then `bossSpawned`.
- [x] **Spawns:** Restrict door/minion spawns to only after camera is back (`bossSpawned`), or per design.
- [x] **Speech bubble:** Fix word-wrap so text never goes outside the bubble; verify with long Commander/character lines.
- [ ] **Banner:** BOSS ALERT blinks from start of `bossAlert` until camera starts panning back (then remove banner).

This plan ensures: no tutorials for now, clear “extract (Push x)” in dialogue and quest, correct order (extract → malfunction → radar → 2 s read → BOSS ALERT + red → 2 s → boss spawn & camera → 2 s hold → back to player → spawns), and no text overflow in bubbles.
