# Masterplan – dagens oppgaver (Chemical Lab, Aura, biomer, blod)

Steg-for-steg plan for alt vi har snakket om i dag. Deretter kjøres implementasjonen.

---

## Steg 1: Vials – placeholder-grafikk

- **Lage:** Enkel grafikk av et **rack med vials** som matcher basens stil (industriell sci-fi, metall, blå/oransje neon-aksenter).
- **Innhold:** Rack med plass til **10 vials**; vi starter med **1 vial** synlig/fylt.
- **Fil:** Lagre i `assets/graphics/` (f.eks. `vial_rack.png`).
- **Referanse:** Se `pod.png`, `pod_chemistry_lab.png` for farger og stil (grå metall, stripelys, ren formspråk).

---

## Steg 2: Aura-skills i Core Systems

- **Skalere tankesettet** rundt blodsamples, mixing, forskning og skills på Scientist og andre trær.
- **Legge til "Aura" i flere varianter** som egne skills på ulike trær:
  - **Fire Aura** (f.eks. Warrior): setter mobs i brann (DoT).
  - **Slow Aura** (f.eks. Survivor): senker fiendens hastighet i aura-rekkevidde.
  - **Sample Aura** (Scientist): sampler alt blod innen auraens rekkevidde.
- **Implementasjon:** Nye noder i `SKILL_TREES`, `describeCoreNode`-beskrivelser, bonus-funksjoner (tilsvarende `getWarriorBonuses`), og koble til `computeStats` / `applyStatsToPlayer` og spillogikk (aura-tick, sampling).

---

## Steg 3: Friske opp grafikk på brettene (biomer)

- **Biom 2 (Outpost):** Typeriktig underlag – farger/tekstur som passer “Outpost”.
- **Biom 3 (Tunnels):** Typeriktig underlag – mørkere, tunnel-aktig.
- **Biom 4 (Front):** Typeriktig underlag – frontlinje-feel.
- **Teknisk:** Gjøre `drawMallFloorPlaceholder` (eller tilsvarende) **biom-aware** ut fra `currentLevelConfig.biome`, med egne fargepaletter/tegnelogikk per biom. Eventuelt nye tile-PNG-er per biom i `assets/graphics/`.

---

## Steg 4: Flere blodtyper – navn, egenskaper, kombinasjoner

- **Utvide** `bloodTypes.js` / tilhørende data: flere typer eller tydeligere navn og egenskaper.
- **Definere kombinasjoner** vi kan forske på (for Chemical Lab).
- **Grafikk:** Placeholder-PNG-er for blodtyper (f.eks. ikoner/vials per type) i `assets/graphics/`.

---

## Steg 5: Oppdatere jobbdokumentet

- **Oppdatere** `docs/CHEMICAL-LAB-AND-CORE-SYSTEMS-JOB.md` med:
  - Vials-placeholder og hvor det brukes.
  - Aura-skills på trærne.
  - Biom-specifikke bretter og blodtyper/kombinasjoner.

---

## Rekkefølge under kjøring

1. Plan (denne filen) – **ferdig**  
2. Vials-rack PNG (placeholder)  
3. Aura-noder + stat-apply + describeCoreNode  
4. Biom-floor (farger/tegning per biom)  
5. Blodtyper: utvidelse + kombinasjoner + placeholder-grafikk  
6. Oppdatere CHEMICAL-LAB-AND-CORE-SYSTEMS-JOB.md  

---

*Kjør!*
