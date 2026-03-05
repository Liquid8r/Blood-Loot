# Blood Loot — prosjektkontekst

Dette prosjektet er basert på **Affix Loot v1.002** (fallback: åpne mappen «Affix Loot (Hvor Cursor skal legge HTML-spillet)»).

---

## Hva er Blood Loot?

- **Lore og design:** `docs/future-development/blood-loot/README.md`
- **Concept art:** `docs/future-development/blood-loot/concept-art/`
- **Implementeringsplan:** Fase A → E (data, endless run, blod/ampuller, Extract, quest, loot til basen, skrap, biom-boss, pod-UI). Steg-for-steg; hvert steg testbart og reversibelt.

---

## Språk og kode

- **Kode:** Bruk **engelsk** (variabler, kommentarer, filnavn, UI-tekster i spillet).
- **Spillet:** Skal være på **engelsk** (menyer, tooltips, beskrivelser).
- **Samtale:** Vi snakker sammen på **norsk**.

---

## Avtaler (merge)

- **Run:** Endless – ingen fast rundetid. Lenger du overlever, jo mer og sjeldenere loot og blodtyper (typen bestemmes av level/biom). Når du har samlet nok blod, **pusher du grensene for overlevelse** ved å bli værende: det er mulig en stund, og du kan ha økt sjanse for bedre loot, men du må trekke deg ut (**Extract**) på et tidspunkt før mobsene overvelder deg. Det skal bli **merkbart vanskeligere** å bli værende – spillet skal føles som om du må ta valget «ta med det du har» vs «gamble videre».
- **Blod:** Per level kun visse typer (1-1 = rødt, 1-2 = rødt+grønt, 1-3 = alle tre i biom 1). Nok blod åpner **Extract**; man kan gamble videre for bedre loot.
- **Extract:** **Ikke mulig** før du har hentet nok blood-samples ifølge level-questet. Når du har nok, skal **Extract-knappen lyse opp** (på PC: trykk **X** for extraction). Når quest «nok blod» er oppfylt – fly ut til basen. **Extraction tar 10 sekunder** (standard), med **tydelig nedtelling** før du automatisk løftes av en **raketpakke på ryggen** som da er ferdig ladet og sterk nok. Når du trykker Extract (eller **X** på PC), **starter nedtellingen** på jetpackens loading/booting time. Det skal vises et **lite panel** (f.eks. «Jetpack booting time» eller tilsvarende) som viser **antall sekunder** fra du trykket Extract til du faktisk tar av og flyr tilbake til podden – slik at spilleren alltid ser hvor lenge det gjenstår. **Mer vekt = lengre ladetid**; hvis vi bruker det, må det komme fram i dette panelet (eller tooltip). Standard 10 sekunder; **overvekt** kan gi merkbart lengre tid. Loot som er **equipped** tas med. Du må bruke Extract før mobsene overvelder deg; å vente for lenge er risiko.
- **Død:** 10 % av blodet i runnet bringes tilbake som «damaged samples». **Ingen loot tas med** – unntatt: alt item du hadde **på deg** (equipped) blir gjort om til **skrap av samme tier** som itemet. Skrap lagres og brukes på basen (verksted/lab).
- **Loot til basen:** Juster drop rate, rarity, item level slik at det balanserer «ta med» vs «gamble videre».
- **Biom:** 1-1, 1-2, 1-3 = biom 1; samle nok blod for å summone biom-boss; etter seier åpnes biom 2 (2-1, 2-2, 2-3). Top-down, fritt brett, biom-spesifikk bakgrunn.

---

## Når du åpner kun Blood Loot i Cursor

- Les denne filen + `docs/future-development/blood-loot/README.md` for lore og retning.
- Si til assistenten: «Vi jobber med Blood Loot; se PROJECT-CONTEXT.md og docs/future-development/blood-loot.»
- **Kode og spillet:** engelsk. **Samtale med assistenten:** norsk.
- Grunnlaget (lore, plan, avtaler) ligger i denne mappen – du mister ingenting ved å kun åpne Blood Loot.

---

*Sist oppdatert: etter steg 1 (kopi fra Affix Loot), Fase A1 (blodtyper-data), endless run / Extract-tension, og Extract-detaljer (10 s nedtelling, jetpack på ryggen, vekt = lengre ladetid, overvekt).*
