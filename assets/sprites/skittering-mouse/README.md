# Skittering Mouse sprites

Base design (reference): **`assets/skittering-mouse-sprite.png`** — use as idle. All other frames are derived from this with **one minimal change** so they work as a stop-motion loop.

## Stop-motion rule

- **move1**: Same as base; only the tail curves *slightly left*.
- **move2**: Same as base; only the tail curves *slightly right* (loops with move1).
- **gape**: Same as base; only the mouth is *open* with teeth (for approach/bite).

See **`docs/art/MOB-SPRITE-SPEC.md`** for the full spec and the “Skittering Mouse: frame-by-frame brief” section.

## Frames

| Frame   | Asset file (in `assets/`) | In-folder name | Description |
|---------|----------------------------|----------------|-------------|
| Idle    | `skittering-mouse-sprite.png` | *(base)*      | Default pose. |
| Move 1  | `skittering-mouse-move1.png`  | `move1.png`   | Base + tail slightly left. |
| Move 2  | `skittering-mouse-move2.png`  | `move2.png`   | Base + tail slightly right. |
| Gape    | `skittering-mouse-gape.png`   | `gape.png`    | Base + mouth open, teeth visible. |
| Hit     | —                            | optional      | Or use code tint on idle. |
| Death   | —                            | optional      | Or use code. |

To use one folder for loading, copy from `assets/` into here as `idle.png` (from base), `move1.png`, `move2.png`, `gape.png`.
