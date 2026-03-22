# Samarbeid — flyt, proft uttrykk, og frihet til å endre

Dette dokumentet er **ikke** ment å **begrense** hva vi kan gjøre senere. Det er **forvaltningsnotater**: standarder som gjør samarbeidet raskt, til de **bevisst** endres (i chat eller ved at vi oppdaterer filen).

---

## Viktigst: ingenting her «låser» meg

1. **Det du skriver i chat går alltid foran** det som står i md-filer — også om du ber om ny mappestruktur, annen oppløsning, annen stil, eller å kaste et forslag.
2. **Kvalitet og proft uttrykk** veier tyngre enn «vi skrev det én gang i en sannhetsfil».
3. Når vi endrer retning, **oppdaterer vi** (eller stryker) avsnitt i disse dokumentene så de fortsatt hjelper oss — de skal ikke bli museum.

---

## Hva jeg legger til rette for (proaktivt)

| Område | Typisk rolle min |
|--------|------------------|
| **Kode** | GDScript, scener som tekst, refaktorering, feilretting |
| **Mappestruktur** | Foreslå og opprette `scenes/`, `scripts/`, `data/`, `assets/...` etter hvert som det trengs |
| **Rydding** | Konsistente navn, fjerne død kode, splitte filer når det lønner seg |
| **Logisk oppbygging** | Autoloads, tydelige «owners» for hub/run/UI, data-drevet innhold der det sparer tid |
| **Grafikk / utseende** | **Placeholders** (farger, enkle former, `ColorRect`, midlertidige teksturer), **kopiering** fra `Blood Loot/assets/graphics/` inn i Godot-mappa når du ber om det eller vi er enige; **genererte bilder** når du ber meg om konkrete assets (beskrivelse + stil) |
| **Spillflyt** | Scene-bygging, overganger, så lite friksjon som mulig for spilleren |

**Deg** trenger jeg oftest til: **F5-test**, **tilbakemelding** («for stort», «for mørkt», «krasjer»), og **beslutninger** når det finnes flere gode veier.

---

## Grafikk — målet er proft for spilleren, ikke manuelt slit for deg

- **Arv fra web:** `Blood Loot/assets/graphics/` er fortsatt et **hurtiglager** vi kan trekke fra — uten at *du* må sitte og eksportere på nytt hvis jeg kan kopiere filer fra prosjektet.
- **Nye assets:** Jeg kan **foreslå navn og mapper**, opprette undermapper, og legge inn **placeholders** til du eller jeg bytter inn endelig kunst.
- **Hub-lik web:** **1536×1024** er en **praktisk default** for bakgrunner som skal ligne hub-en i `main.js` — ikke en lov. Annen størrelse er OK hvis vi justerer layout.
- **Navngiving:** **kebab-case** er en **default** for ryddig repo; vi kan bryte det hvis du vil.

---

## Data (JSON osv.)

- **Default:** store tabeller i `data/` så jeg kan iterere raskt uten at du klikker i Inspector i timesvis.
- **Unntak:** hvis noe er enklere som `.tres` eller ren editor — vi velger det når det lønner seg.

---

## Andre «referanse»-filer

- **`CARRYOVER-TRUTHS.md`:** språk (EN i spill/kode, NO i chat), layout-tall, spillavtaler fra web — **videreførte sannheter**.
- **`SCREEN-REFERENCE.md`** + **`Design`:** felles koordinatspråk **inntil** vi vedtar noe annet og oppdaterer konstantene.
- **`GODOT-PORT-STRATEGY.md`:** hukommelse for port-rekkefølge — **prioriteringen kan endres** når du sier det.

---

## Oppsummert

Vi bruker dokumentene for **flyt og felles språk**, ikke for å **stoppe** forbedringer. Målet er **god spillopplevelse** og **proft utseende**; alt her er tilpassbart så lenge vi sier fra når vi endrer spillers opplevelse eller teknisk grunnmur.

*Sist oppdatert med vilje: fleksibel ramme, chat overstyrer, jeg kan generere og strukturere aggressivt innenfor det du ber om.*
