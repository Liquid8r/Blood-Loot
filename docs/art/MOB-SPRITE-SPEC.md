# Mob sprite & animation spec (Blood Loot)

All enemy mobs share the same animation vocabulary. Each mob type has a folder under `assets/sprites/<mob-id>/` with the following frames.

## Stop-motion rules (how to get frames that “fill in” for each other)

- **One base, minimal change**: Every frame is the *same* creature, same size, same pose, same colours. Only one or two things change between frames so they read as one continuous motion.
- **One variable per step**: For movement, change *only* tail *or* only leg phase *or* only head angle – not all at once. That way 2–3 frames can loop naturally (e.g. tail left → tail right → repeat).
- **Tail**: Very visible. Frame A: tail almost straight back, *slightly* to the left. Frame B: same, but *slightly* to the right. Same length and thickness; only the lean changes.
- **Legs**: If we add a third move frame, one leg slightly in front in one frame, the other in front in the next – subtle, so the body doesn’t “jump”.
- **Head**: At most a barely visible angle change between frames; avoid big re-draws.
- **Gape**: Same body as the move (or idle) frames – *only* the mouth opens and shows teeth. So we need “move1 with mouth open”, “move2 with mouth open” (or one gape that matches the main “approach” pose), not a completely new character design.
- **Work from the base**: Describe each new frame as “base sprite, but with [single concrete change]”. When generating or briefing art, always reference the approved base so variants stay on-model.

## Required frames per mob

| Frame ID    | File name   | Description |
|------------|-------------|-------------|
| **idle**   | `idle.png`  | Default pose, subtle (optional: 2 frames for idle loop). |
| **move**   | `move1.png`, `move2.png` | Walk/run cycle (2–4 frames). Skittering Mouse: quick, jittery. |
| **gape**   | `gape.png`  | Mouth open, teeth visible – used for attack/bite or charge-up. |
| **hit**    | `hit.png`   | Hurt/flinch (optional: can use tint + base sprite in code). |
| **death**  | `death.png` | Dead pose or single frame for death animation (optional: 2–3 frames). |

- **Base / design reference**: The first approved look for a mob (e.g. `assets/skittering-mouse-sprite.png`) is kept as the design reference and can double as `idle.png` until we add a dedicated idle.
- **Naming**: All frames for one mob live in `assets/sprites/<mob-id>/` with the names above (e.g. `gape.png`, `move1.png`). Generated assets may first live in `assets/` with a prefix (e.g. `skittering-mouse-gape.png`); copy into the mob folder for a single load path.

## Mob IDs (current & planned)

- `skittering-mouse` – Biom 1, base infested mall mouse (idle, move1, move2, gape; hit/death optional).
- *(Later: bloated-gnawer, nerve-twitched-runner, rotten, sewer-ratling, etc.)*

## Skittering Mouse: frame-by-frame brief (stop-motion)

**Base (idle)**: `skittering-mouse-sprite.png` – approved design. Small infested mall mouse, top-down/slightly angled, bloodshot eyes, dark grey/brown fur, slight reddish patches. Mouth closed. This is the reference; all other frames must match it.

| Frame   | Rule | Description |
|--------|------|-------------|
| **idle** | = base | Use base sprite as-is. |
| **move1** | base + one change | *Exactly* the same as base. **Only difference**: tail points almost straight back but curves *slightly to the left* (same length, same thickness). Body, head, legs unchanged. |
| **move2** | base + one change | *Exactly* the same as base. **Only difference**: tail points almost straight back but curves *slightly to the right*. Body, head, legs unchanged. (Loops with move1.) |
| **gape**  | base or move + one change | Same body and pose as base (or as move1 if we want “running gape”). **Only difference**: mouth *open*, teeth visible. Everything else identical so it fits the move loop when the mouse nears the player. |

Optional: a third move frame with a subtle leg-phase change (one foot slightly forward) while tail stays the same, for a 3-frame cycle. Gape can then have 1–2 variants (idle gape, move gape) if we want.

## Image format

- PNG, transparent background.
- Consistent size per mob (e.g. 64×64 or 32×32) so we can swap frames in code without rescaling.
- Same scale and style as the base design for that mob.

## Usage in game

- **Idle**: when not moving and not attacking.
- **Move**: cycle move1 → move2 (or more) while pathing toward player.
- **Gape**: during attack wind-up or on contact (bite); can be blended with move for “running bite”.
- **Hit**: briefly when taking damage (or use white flash + idle).
- **Death**: when HP ≤ 0; then remove or play death animation.
