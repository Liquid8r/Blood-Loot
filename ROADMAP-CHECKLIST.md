# Blood Loot – Sjekkliste / Roadmap

**Husk: Minne brukeren på denne listen ved neste økt, og anbefale rekkefølge før vi starter på noe annet.**

---

## Sjekkliste

- [ ] **Fiendetyper** – lage ulike typer fiender
- [x] **Blodtyper** – lage typer blod
- [x] **Chemistry Bench** – implementere (MVP: lagret blod, bytte mot tokens)
- [ ] **Weapon Rack** – vegg med våpen vi beholder fra run (maks antall)
- [ ] **Items på nytt** – bygge opp items-systemet på nytt
- [ ] **Våpen, armor, ringer osv.** – lage disse
- [ ] **Set-items** – noen items med set-bonus
- [ ] **Affixes** – fikse affixes og teksten på loot når vi plukker opp (ikke nødvendigvis våpnenavn)
- [ ] **Quests** – lage quest-system
- [x] **Skill-tre** – lage skill-tre (Core Systems: 4 trær, kjøp med tokens)
- [ ] **Perk: Anti Coagulant** – upgrade-perk som senker blodets koaguleringshastighet, slik at man får bedre tid på seg til å samle «friskt» blod (poeng legges ved oppgradering)
- [ ] **Affixes: beholde/fjerne/nye** – bli enige om hvilke affixes vi beholder, fjerner og legger til
- [ ] **Trophies** – sjelden drop, samles i «Trophy room»
- [x] **Brett-grafikk** – bygge grafikken på brettet vi spiller på (v1.006.0: Mall-gulv, vegger, avløp/drains)
- [ ] **Kister med loot** – spawne kister som inneholder loot
- [ ] **Endless rounds** – stadig vanskeligere til helt umulige, bedre loot og affix-sjanser
- [ ] **Våpen med slots for Specials** – våpen som dropper med slots; Specials = add-ons (chain lightning, explode, heat seeking osv.) med spennende effekter
- [ ] **Styring** – bytte fra autoshoot til: piltaster skyter (8 retninger), WASD = fast styring av karakter
- [ ] **Dash** – fikse dash en gang for alle

---

## Idébank

### Affixes, skills og perks (grunnstruktur)

**Grunnidé:** Et grunnleggende sett med egenskaper som kan økes ved å bruke tokens i et skill-tre. Strukturen er i tråd med tidligere ideer og kan justeres.

**Warrior-treet (grunnleggende combat):**
- Movement  
- Fire Rate  
- Damage  
- Health  
- Shield  

**Survivalist-treet (eksempler):**
- Magnet  
- Leech (ev. annen skrivemåte)  
- Dash – lengre dash-avstand, kortere cooldown  
- Dash Immunity – dash gjennom mobs uten skade + kort immunitet etter dash  

**Scientist-treet:**
- Egenskap for å samle bloddråper raskere *(trenger beskrivende navn)*  
- Anti Coagulant *(allerede listet i sjekklisten)*  

**Looter-treet:**
- Perker som øker **maks antall items** vi kan ta vare på i Armory (startkapasitet er et gitt antall, økes med perks her)  
- Perk for **bedre avkastning** når man samler blod (flere «ml» blod med seg tilbake til basen) *(flyttet fra Scientist)*  

*(Affixes forblir på loot/items; skills og perks kjøpes med tokens i treene over. Dette er en begynnelse til videre design.)*

---

### Armory – oppsett og kapasitet

- **Venstre:** Rack for våpen  
- **Høyre:** Stand for armor  
- **Midt:** Monter for jewelry og ringer  
- **Kapasitet:** Antall items vi kan ta vare på er et gitt antall til å begynne med; kan økes med perks i **Looter**-treet

---

### Loot, min level og skrap

- **Alt loot har et min level** for å bruke det.
- **Karakteren har høyt nok level:** Normal loot comparison – man kan equippe valgt item.
- **Karakteren har ikke høyt nok level:** Loot comparison trigges likevel, men spilleren får valget:
  - **Keep loot** (beholde lootet, f.eks. til senere), eller  
  - **Demontere for skrap** – item demonteres og gir skrap.
- **Skrap:** Beholder samme rarity som det demonterte itemet. Verdi beregnes som noe i retning **RARITY × (del av MIN LVL)** – formel skal finjusteres.
- **Bruk av skrap:** Skrap skal kunne brukes til å oppgradere items på en eller annen måte – nærmere design kommer.

---

## Anbefalt rekkefølge (fylles inn ved neste økt)

*(Ved neste økt: anbefale hva dere bør ta først og liste det her.)*

1. *—*
2. *—*
3. *—*
…

---

*Opprettet for å minnes ved neste økt. Ikke implementere nå.*
