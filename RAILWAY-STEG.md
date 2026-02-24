# Affix Loot på Railway – steg for steg

Railway serverer spillet slik at broren (og andre) kan åpne en lenke i nettleseren uten å laste ned noe.

---

## Steg 1: Legg til package.json og push til GitHub

Vi har lagt til en `package.json` som forteller Railway hvordan spillet skal startes. Du må committe og pushe den:

```powershell
cd "d:\Carloz\Affix Loot (Hvor Cursor skal legge HTML-spillet)"
git add package.json RAILWAY-STEG.md
git commit -m "Add Railway deploy config (package.json)"
git push origin main
```

---

## Steg 2: Konto på Railway

1. Gå til **https://railway.app**
2. Klikk **「Login」** eller **「Start a New Project」**
3. Velg **「Login with GitHub」** og logg inn med samme konto som eier Affix-Loot-repoet

---

## Steg 3: Nytt prosjekt fra GitHub

1. På Railway-dashboardet: klikk **「New Project」**
2. Velg **「Deploy from GitHub repo」**
3. Hvis du blir bedt om det: **「Configure GitHub App」** og gi Railway tilgang til repoet (velg **Liquid8r** eller «Only select repositories» og velg **Affix-Loot**)
4. Klikk på **「Affix-Loot」** (eller det navnet repoet ditt har) for å velge det
5. Railway lager automatisk en «service» og begynner å bygge

---

## Steg 4: Sett opp som statisk nettside

1. Klikk på **servicen** (den ruten som ble laget)
2. Gå til **「Settings」**-fanen
3. Under **「Build」** (hvis det finnes):  
   - **Build Command:** kan stå tomt (vi bygger ikke noe)  
   - **Root Directory:** stå tomt (alt ligger i repo-roten)
4. Under **「Deploy」** / **「Start Command」**:  
   Railway skal bruke `npm start` fra `package.json` (det er satt opp). Hvis det står noe annet, endre til å bruke **npm start** eller la det være tomt slik at Railway bruker package.json.

---

## Steg 5: Få en offentlig lenke

1. Gå til **「Settings」** for servicen
2. Finn **「Networking」** eller **「Public Networking」**
3. Klikk **「Generate Domain」** eller **「Add domain」**
4. Railway gir deg en adresse, f.eks. `affix-loot-production-xxxx.up.railway.app`
5. Kopier lenken – det er denne broren (og du) åpner i nettleseren for å spille

---

## Steg 6: Test

1. Åpne lenken i nettleseren
2. Spillet skal laste (index.html med spill, lyd og grafikk)
3. Hvis noe ikke fungerer (f.eks. lyd/bilder): sjekk at alle filer er i repoet og at `index.html` ligger i **roten** av repoet på GitHub

---

## Oppdatering senere

Hver gang du pusher til `main` på GitHub, bygger Railway på nytt og oppdaterer lenken. Broren trenger bare å laste siden på nytt for å få siste versjon.

---

## Kort sjekkliste

- [ ] package.json og RAILWAY-STEG.md er pushet til GitHub (steg 1)
- [ ] Innlogget på Railway med GitHub (steg 2)
- [ ] Nytt prosjekt → Deploy from GitHub repo → Affix-Loot (steg 3)
- [ ] Servicen bruker npm start (steg 4)
- [ ] Generate Domain / public link (steg 5)
- [ ] Lenken åpnes og spillet kjører (steg 6)
