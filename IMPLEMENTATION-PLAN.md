# Blood Loot — implementeringsplan

Steg-for-steg fra Affix Loot v1.002 til fungerende Blood Loot. Hvert steg testbart og reversibelt (git revert).

---

## Fase A – Data og spillverden (ingen endring i spilloop ennå)

| Steg | Beskrivelse | Status |
|------|-------------|--------|
| A1 | Blodtyper som data (`BLOOD_TYPES`, `BLOOD_TYPES_BY_LEVEL`) | ✅ |
| A2 | Per-level drop-regler for blod (bruk level-id) | ✅ |
| A3 | Item tier på loot (utvid med `tier`) | ✅ |
| A4 | Skrap som ressurs (state + lagring), ingen UI ennå | — |

---

## Fase B – Run-lengde og «nok blod»

| Steg | Beskrivelse | Status |
|------|-------------|--------|
| B1 | Endless run (fjern/utvid roundEnd på tid) | — |
| B2 | Blod i runnet: drop blodtype + ml, state per type | — |
| B3 | Ampulle-UI (vis ml per blodtype denne runnen) | — |
| B4 | Quest «nok blod» per level → `canExtract` | — |
| B5 | Extract-knapp (vis når canExtract, avslutt run) | — |

---

## Fase C – Hva du tar med tilbake

| Steg | Beskrivelse | Status |
|------|-------------|--------|
| C1 | Permanent blod på basen; ved Extract = alt med, ved død = 10 % damaged | — |
| C2 | Loot til basen: lagre equipped ved Extract for neste run | — |
| C3 | Ved død: equipped → skrap av samme tier, lagre skrap | — |
| C4 | Extract: ta med equipped til basen (ikke til skrap) | — |

---

## Fase D – Balanse og progression

| Steg | Beskrivelse | Status |
|------|-------------|--------|
| D1 | Juster drop rate / rarity for «ta med» vs «gamble» | — |
| D2 | Item level / bruk (krav for equip) | — |
| D3 | Biom-boss: krav «nok blod» for å summone; lås opp biom 2 | — |
| D4 | Utvid blodtyper (mot 40–50), knytt til biom/level | — |

---

## Fase E – Pod, menyer og UX

| Steg | Beskrivelse | Status |
|------|-------------|--------|
| E1 | Main Menu = pod (bakgrunn, Drop Zone = Start, tre dører) | — |
| E2 | Chemistry Module-skjerm (blod på basen, Identify, blending) | — |
| E3 | Armory (equipped + lagret for neste run) | — |
| E4 | Verksted (skrap, bruk) | — |

---

*Oppdater status (✅ / —) når steg er fullført.*
