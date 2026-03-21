# Chemical Lab + Core Systems – samlet jobb (design og krav)

Dette dokumentet samler alt vi har diskutert om Chemical Lab, blodforsking, Core System-kuler og Vials til én stor jobb. **Ikke implementert ennå** – venter på flere ideer før vi koder.

---

## 1. Chemical Lab – rom og stil

- **Rom:** Inne på basen skal det være et **Chemical Lab** som matcher stilen på resten av basen.
- Rommet brukes til å analysere blod og forske på det.

---

## 2. Forskingsmekanismer (tid og blodkrav)

- **Tidsbruk per forskning:**
  - **Enkle kombinasjoner:** 2 minutter
  - **Mer avanserte:** 5 minutter
  - **Top tier:** 15 minutter

- **Blodkrav:**
  - **Minimum** for enkleste: 1000 ml rødt blod (siden rødt er common).
  - Gradvis **mindre mengde** oppover til de mest avanserte (mer “verdifulle” samples).

---

## 3. Core System – kuler (spheres) og forskning

- Når man **forsker på ulike blodtyper sammen**, låses Core System-**kuler** gradvis opp.
- Spilleren vet **hvilken kule som er neste** og får **hint** om hva som må kombineres for å unlåse den.
- **Etter unlock:** Samme blodkombinasjoner brukes igjen, men i **økende mengder**, for å **oppgradere** den kulen/skillen.
- **Etter at en kule er unlåst:** Neste kule **avsløres** og det kommer **nye hint** for å unlåse den.
- **Spillflyt:** Man må bevege seg både **opp** og **ned** i levlene for å hente riktig type blod (noe er lettere å få på lavere nivå, noe på høyere).

---

## 4. Scientist-treet – nederste kule: «Vials»

- Scientist-treet skal få sin **nederste kule: «Vials»**.
- **Unlock:** Perken unlåses **kun ved å forske på rødt blod** (i Chemical Lab).
- **Effekt:** Gir gradvis **flere vials** å samle blod med.
  - **Start:** 1 vial.
  - Oppgraderinger i Core Systems øker antall vials.

---

## 5. Vials-grafikk (placeholder)

- **Grafikkidé:** Et **rack med vials** som matcher basens stil (industriell sci-fi, metall, blå neon-aksenter).
- **Oppsett:**
  - Ett rack med **10 plasser** for vials.
  - Spilleren starter med **1 aktiv vial** (fylt med rødt blod), resten er tomme/avslåtte slots.
- **Bruk:** Vises i Chemical Lab / Core Systems-UI når vi jobber med Vials-perken.
- **Status:** Selve PNG-en må genereres i en økt/modell som støtter bildegenerering, eller tegnes manuelt og lagres i `assets/graphics/`.

---

## 6. Bærekraft / kapasitet under run

- Under run har man en **maks kapasitet** for hvor mye blod man kan bære (avhengig av antall vials).
- **Hvis man samler mer blod enn det er plass til:**
  - **Én gang** per run (eller per “fyll”) får spilleren beskjed fra **Astra** om at de har nådd maks det de kan bære.
  - **Hint:** Astra anbefaler å oppgradere i **Core Systems** for å få flere vials.

---

## 7. Tokens – midlertidig fjernet fra Core System

- **Tokens** skal **midlertidig** ikke brukes som enhet for oppgradering av Core System.
- Vi kan finne en **kombinasjon** (f.eks. blod + tid, eller annen ressurs) senere for å oppgradere kulene.

---

## 8. Aura-skills og laboratorie-synergi

- **Fire Aura:** Passiv aura (typisk på Warrior-treet) som brenner mobs i en radius rundt spilleren (DoT).
- **Slow Aura:** Videreutvikling av eksisterende `slowAura` – større radius og sterkere effekt, typisk på Survivor-treet.
- **Sample Aura:** Scientist-perk som **automatisk sampler blod** innenfor en viss radius (samme loop som blodpools, men uten at spilleren står helt oppå).
- Disse skal legges inn som **egne Core System-kuler** i de respektive trærne og kobles til stats-laget (f.eks. egne aura-radius/effekt-verdier).
- Forskning i Chemical Lab styrer **unlock og oppgradering** av disse auraene via bestemte blodkombinasjoner.

---

## 9. Utvidede blodtyper og kombinasjoner

- `src/bloodTypes.js` er utvidet med **avanserte, research-only blodtyper**:
  - **Amber:** regen-boost (f.eks. skjold/HP-regen) – mellomnivå-blanding.
  - **Ivory:** healing-pulse-type blod – kan kobles til support-effekter.
  - **Crimson:** bleed/aura-fokusert blod – synergy med Fire/Bleed-effekter.
  - **Obsidian:** top-tier defensiv/offensiv type (damage shield / void-effekt).
- Det er også lagt inn en enkel liste `BLOOD_RESEARCH_COMBOS` som beskriver:
  - **Enkle** (2 min), **avanserte** (5 min) og **top tier** (15 min) kombinasjoner.
  - Hvilke grunnblod som brukes (f.eks. Red, Blue, Green, Purple) og hvilken avansert type som kommer ut.
  - Hver kombinasjon har en `hintKey` som kan kobles til tekst i Chemical Lab-UI.

---

## 10. Avklaringer / åpne punkter (til senere)

- **Hint-nivå:** Hvor konkrete skal hintene være? (f.eks. “2 typer blod” vs “Rødt + Grønt fra nivå 3–5”).
- **Kø:** Kan man starte én forskning og la den kjøre mens man spiller videre?
- **Feil kombinasjon:** Hva skjer hvis man bruker feil blod – bare bortkastet, eller noe annet?
- **1000 ml:** Er 1000 ml per forskningsprosjekt eller totalt per blodtype i kombinasjonen?
- **Vials kapasitet:** Hvor mange ml per vial? (Forslag: 1000 ml per vial → total kapasitet = antall vials × 1000 ml.)
- **Aura-parametre:** Eksakt radius, tick-frekvens og styrke for Fire/Slow/Sample Aura må balanseres.
- **Biom-grafikk:** Detaljert palett og teksturer per biom (2=Outpost, 3=Tunnels, 4=Front) må designes før vi implementerer egen tegnekode.

---

*Sist oppdatert: mars 2026. Klar for neste ide.*
