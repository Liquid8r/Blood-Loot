# Blood Loot — Godot-port: strategi og mål

**Levende notat:** prioritering og omfang kan endres når du sier det. Målet er et **bedre og mer proft** spill, ikke å la en sjekkliste hindre gode grep.

**Web-baseline (referanse):** `src/main.js` + tilhørende filer, spillversjon **v1.005.3** (frosset som referanse; ikke slettes).  
**Godot-baseline:** `blood-loot-godot/`, versjon **2.00.0** (levende hovedspor).

---

## Mål

1. **Paritet først** — Overfør **funksjonalitet og spillmekanikk** fra web-versjonen så fullstendig som praktisk mulig (combat, progression, hub, økonomi, lagring, nivåer, UI-flyt, osv.).
2. **Deretter videreutvikling** — Når Godot-versjonen er «up to date» med referansen, er **Godot** hovedlinjen for nye features og polish.
3. **Mer proft uttrykk** — Bedre ytelse-struktur (scener, datafiler, tydelig arkitektur), konsistent UI, og forberedelse for PC/Steam uten å love alt på dag én.

---

## Prinsipper

- **Referanse ved tvil:** Web-koden (`main.js`, `bloodTypes.js`, `index.html`) og denne filen — oppdater teksten når vi bevisst avviker.
- **Inkrementelt:** Vertikale snitt (spillbart tidlig) + system for system, ikke «big bang»-port på én gang.
- **Bevar design** — Tall, loops og regler skal matche med mindre vi bevisst **beslutter** en endring (noter i changelog/commit).

---

## Grove port-aksjer (sjekkliste over tid)

Bruk som hukommelse; detaljer fylles ut etter hvert.

- [x] **Hub-hovedmeny** (visuell hover, soner, volum, plassholdere for rom) — `blood-loot-godot/scenes/hub/`
- [ ] Input, spillerbevegelse, kamera
- [ ] Combat (skyting, melee, fiender, prosjektiler, kollisjon)
- [ ] Run-loop (nivå, timer, extract, død/victory)
- [ ] Loot, inventory, equip, sammenligning, scrap
- [ ] Hub: contracts, armory, chem lab, core systems, intel, options
- [ ] Progression: tokens, skills/trees, unlocks, quests (når portet)
- [ ] Lagring (tilsvarende localStorage-modell / versjonering)
- [ ] Lyd og musikk
- [ ] Level-spesifikt innhold (f.eks. 1-1 story/zones når aktuelt)

---

## Cursor / repo

- Workspace-rot: **`Blood Loot`** (web + Godot + `docs/` i samme kontekst).
- `.cursorignore` utelater `node_modules/` og `blood-loot-godot/.godot/` for raskere indeksering.

## Samarbeid og grafikk (premisser)

- Se **`blood-loot-godot/docs/COLLABORATION-PREMISES.md`** — felles arbeidsdeling, filnavn/mapper, placeholders, data i JSON for å redusere manuelt arbeid.

---

*Oppdater denne filen når dere endrer prioritering eller krysser av store milepæler.*
