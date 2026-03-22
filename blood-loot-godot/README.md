# Blood Loot — Godot edition

**Project folder:** `blood-loot-godot` (kebab-case)  
**Foundation version:** `2.00.0` (see `VERSION` and `project.godot` → `config/version`)

**Relationship to the web/Canvas build:** The HTML5 game in the parent folder (`Blood Loot`) is the **reference** for mechanics (**v1.005.3** in `src/main.js`). This folder is the **living Godot codebase**. **Goal:** reach **feature parity**, then continue development here. See **`../docs/GODOT-PORT-STRATEGY.md`**.

## Engine

- **Godot 4.6** stable (as installed). `config/features` includes `4.6` and Forward Plus.

## Layout

| Path | Purpose |
|------|---------|
| `project.godot` | Project config |
| `scenes/` | `.tscn` scenes (`main.tscn` is the entry) |
| `scripts/` | `.gd` scripts |
| `assets/graphics/` | Sprites, hub art (copy from `../assets/graphics/` when ready) |
| `assets/audio/` | Music and SFX |
| `data/` | JSON / game data as systems are ported |

## Carried-over rules (from web project)

**`docs/CARRYOVER-TRUTHS.md`** — English in code & in-game text; Norwegian in chat with me; design resolution; core gameplay agreements from `PROJECT-CONTEXT.md`.

## Collaboration & art (less manual work for you)

See **`docs/COLLABORATION-PREMISES.md`** — defaults for samarbeid; **chat overstyrer**; jeg kan ta mye av struktur, kode og placeholder-grafikk; hub **1536×1024** er praktisk default for web-lik hub, ikke en lov.

## Screen contract (proportions + same reference points)

- **1920×1080** logical pixels; aspect **locked** with letterboxing (`stretch/aspect=keep`).  
- Details and vocabulary: **`docs/SCREEN-REFERENCE.md`**.  
- Code: autoload **`Design`** (`scripts/design_constants.gd`) — `Design.WIDTH`, `Design.get_center()`, etc.

## Hub (ported from web main menu)

- Scene: `scenes/hub/hub.tscn` — hover swaps pod + highlight art, polygon hit areas match `main.js`, pulsing highlight, **Music / Sound effects** sliders (saved to `user://blood_loot_settings.cfg`).
- **Main** scene instances the hub (`scenes/main.tscn`).
- Zone clicks open **English** placeholder panels until contracts / lab / armory / etc. are fully ported.
- **Menu music:** add `assets/audio/main_menu.ogg` (or `Main Menu.ogg` / `main_menu.mp3`) to auto-play; file is optional if missing from repo.

## Open in Godot

Project Manager → **Edit** this project, or **Import** → select `project.godot` in this folder.

After pulling changes, confirm **Project → Project Settings → Autoload** lists **Design** pointing to `design_constants.gd`.
