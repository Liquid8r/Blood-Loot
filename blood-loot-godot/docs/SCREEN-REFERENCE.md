# Skjerm-referanse (Blood Loot Godot)

**Arbeidsdefault** for posisjoner og visning — **ikke ufravikelig.** Hvis vi endrer oppløsning eller stretch, oppdaterer vi denne filen og `Design` i samme runde.

Slik snakker vi om posisjoner og hvordan spillet vises på ulik hardware *med dagens innstillinger*.

## Design-oppløsning (logiske piksler)

| Størrelse | Verdi |
|-----------|--------|
| Bredde | **1920** |
| Høyde | **1080** |

- **Origo (0, 0)** er **øverst til venstre** (som i Canvas / de fleste UI-systemer).
- **X** øker mot høyre, **Y** øker nedover.
- **Senter** er **(960, 540)**.

Når vi sier «plasser knappen 200 px fra venstre og 100 fra toppen», mener vi **(200, 100)** i denne enheten — ikke fysiske skjermpiksler på brukerens monitor.

## I kode (autoload)

Singletonen **`Design`** (`scripts/design_constants.gd`) eksporterer:

- `Design.WIDTH`, `Design.HEIGHT`
- `Design.get_center()`, `Design.get_size()`
- `Design.top_center()`, `Design.bottom_center()`, osv.

Bruk disse når vi skal være presise og konsistente.

## Hvordan vinduet oppfører seg (låst proporsjon)

I **Project Settings → Display → Window → Stretch**:

- **Mode:** `canvas_items` (skalerer 2D/UI sammen med vinduet).
- **Aspect:** `keep` — **bevarer 16∶9**. På skjermer som ikke er 16∶9 får du **sorte felt** (letterbox/pillarbox). Innholdet **forvrenges ikke**.
- **Base size:** 1920×1080 (viewport-størrelse prosjektet er bygget rundt).
- **Scale mode:** `fractional` — jevn skalering på alle oppløsninger (kan gi «ikke-heltall» skala; sprites forblir skarpe med nearest-filter der det er satt).

Hvis du senere vil ha **kun heltallsskala** (hardere pixel-art), kan vi bytte til `integer` — da blir ofte mer svart kant, men pikslene er «renere».

## Praktiske tips i Godot

- **Control-noder (UI):** bruk **ankre** (anchors) der det passer (f.eks. full bredde øverst), og **offsets** i design-piksler for finjustering.
- **Node2D-verden:** plasser ting i samme logiske rom; kamera kan følge spiller — men **«fullskjerm HUD»** bør ofte ligge i en **CanvasLayer** med **Control** rot som dekker hele `Design.get_size()`.

## Kort ordliste når vi prater

| Uttrykk | Betydning |
|---------|-----------|
| «Midten av skjermen» | (960, 540) |
| «Nederst til høyre» | (1920, 1080) som hjørne — UI ankrer ofte `bottom_right` |
| «Design-piksel» | 1 enhet i 1920×1080-rutenettet over |

---

*Endrer du viewport-størrelse i `project.godot`, oppdater denne filen og `design_constants.gd` i samme slengen.*
