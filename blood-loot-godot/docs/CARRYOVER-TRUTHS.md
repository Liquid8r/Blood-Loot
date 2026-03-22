# Gyldige sannheter — videreført fra web-prosjektet

Dette dokumentet samler **konvensjoner og designavtaler** fra Blood Loot (Canvas/HTML) som **gjelder også Godot-versjonen**, til de bevisst endres.  
**Detaljert lore og lang plan:** fortsatt `PROJECT-CONTEXT.md` (rot) og `docs/future-development/blood-loot/`.

---

## 1. Språk (obligatorisk retning)

| Område | Språk |
|--------|--------|
| **Kode** (variabler, funksjoner, filnavn, kommentarer i repo) | **Engelsk** |
| **Spillet** (menyer, HUD, tooltips, dialog, knapper, affix-tekst) | **Engelsk** |
| **Grafikk** (tekst *på* teksturer — skilt, plakater i bilder) | **Engelsk** |
| **Samtale mellom deg og meg** (Cursor-chat) | **Norsk** |
| **Prosjektdokumentasjon** som bare du og jeg leser | **Norsk** er OK (som denne filen); **offentlig** store-side/Steam kan være engelsk senere |

Ingen «dobbel språkversjon» i spillet er mål nå — **én språkflate for spillere: engelsk**.

---

## 2. Teknisk layout (samme idé som web)

- **Design-oppløsning:** **1920×1080** logiske enheter for UI og koordinatsnakk.  
- **Godot:** se `SCREEN-REFERENCE.md` og autoload **`Design`**.  
- **Stretch / proporsjoner:** `project.godot` bruker **aspect `keep`** (ingen forvrengning; letterbox der det trengs).  
- **Web-referanse:** `.cursor/rules/ui-design-resolution.mdc` beskriver HTML/Canvas-varianten (samme tall, annen implementasjon).

---

## 3. Spilldesign-avtaler (kort utdrag fra `PROJECT-CONTEXT.md`)

Disse er **mål/retning** for porten — ikke alt er implementert i web ennå, men vi **viderefører intensjonen**:

- **Run:** Endless-preget loop; vanskeligere over tid; tydelig **«ta med det du har» vs «gamble videre»**.  
- **Extract:** Ikke før quest/krav om nok blod er oppfylt; **X** (PC) som naturlig knapp; **nedtelling** (standard ca. 10 s) med synlig **jetpack/boot**-panel; **vekt** kan øke ladetid; **equipped loot** tas med.  
- **Død:** Del av blod tilbake som damaged samples; **loot med ikke** (unntak equipped → **scrap** av passende tier).  
- **Blod per level/biom:** Begrensede typer tidlig; flere etter hvert (som i design).  
- **Biom:** 1-1…1-3 → boss → biom 2 … Top-down, egen bakgrunn per biom.  
- **Økonomi (armory):** **Scrap** åpner mod-slots; **blod (ml)** setter egenskaper i åpne tomme slots; Scientist cap på hvor mange slots som *kan* åpnes; **Grade forge (G)** med lab-blod (Obsidian/Crimson), ikke scrap.

Full ordlyd og nyanser: **`PROJECT-CONTEXT.md`** (rot).

---

## 4. Navn og filer (default)

- **Nye assets:** helst **kebab-case**, engelsk (`hub-chemistry-lab.png`). Kan fravikes ved behov.  
- **Godot scenes/scripts:** følg Godot-vaner; fortsatt **engelsk** i kode og node-navn der det er praktisk.

---

## 5. Idéliste og roadmap (hvor den lever)

- **Funksjons-ønsker / sjekkliste:** `ROADMAP-CHECKLIST.md` (rot) — gjelder produktet som helhet; kryss av der når noe er **dekket i Godot**.  
- **Port-rekkefølge:** `docs/GODOT-PORT-STRATEGY.md`.  
- **Cursor-regel ny økt:** `.cursor/rules/session-start-ideliste.mdc` (liste roadmap ved ny chat) — fortsatt relevant for **hele** Blood Loot-repoet.

---

## 6. Versjoner (minne)

| Spor | Versjon / rolle |
|------|------------------|
| Web (referanse) | **v1.005.3** (`GAME_VERSION` i `src/main.js`) |
| Godot (levende) | **2.00.0** (`VERSION`, `project.godot`) |

---

*Oppdater denne filen når vi bevisst endrer en «sannhet» (f.eks. flerspråk i spillet), så neste økt ikke bygger på gammel antakelse.*
