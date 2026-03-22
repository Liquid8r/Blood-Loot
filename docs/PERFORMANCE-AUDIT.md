# Blood Loot – performanceanalyse (kun vurdering, ingen kodeendringer)

**Dato:** 2026-03-21  
**Kilde:** `src/main.js` (~10k linjer), `index.html` (innlasting).  
**Formål:** Prioritere tiltak etter **forventet innsparing** vs **risiko/arbeid**, før dere implementerer.

---

## 1. Kort oppsummert

Hovedproblemet er **Canvas 2D som gjør mye arbeid hvert bilde**: prosedural bakgrunn (tusenvis av fliser + gradienter), **mye `shadowBlur`**, stor **intern buffer** (høy DPR), og **render-loop som kjører selv når spilllogikken står stille**. Sekundært: **O(bullets × enemies)** kollisjon og **mange `localStorage`-kall** spredt i koden (kan blokkerer hovedtråden hvis de kjører ofte).

Dette er **ikke** primært et «nett»-problem; det er **CPU/GPU-tegning og JavaScript på hovedtråden**.

---

## 2. Høy prioritet (stor gevinst sannsynlig)

### 2.1 Prosedural bakgrunn hvert bilde (mall / skog / kloakk)

| Funksjon | Ca. linje | Problem |
|----------|-----------|---------|
| `drawMallFloorPlaceholder` | ~8522–8620 | Dobbel løkke over `mapW × mapH` (kart ≈ 2× design 1920×1080). **Per flis:** `createRadialGradient`, flere `fillRect`, regex-fargejustering på hex-streng. |
| `drawGrassFloor` | ~8623–8675 | Tilsvarende: mange fliser × gradienter per frame. |
| `drawForestDecor` | ~8678–8768 | Grid ~40×22 celler; hver celle kan tegne trær (flere radial gradients per tre), blomster, hytte, osv. |
| `drawSewerFloor` | ~8771–8823 | Mindre tungt enn mall/skog (rader i høyde, ikke full grid), men kjører fortsatt hvert bilde med scroll. |

**Kartstørrelse:** `mapW`/`mapH` settes til `2 * W` / `2 * H` (~6616–6617), dvs. **3840×2160** logisk koordinatsystem.

**Innsparing:** Cache **statisk bakgrunn** (f.eks. `OffscreenCanvas` eller `drawImage` fra et bitmap) når **level/biome ikke endrer seg**. Alternativ: tegn kun **synlige** fliser (viewport culling) — mer kode, men mindre tegning.

**Risiko:** Lav–middels — må invalidere cache ved levelbytte / resize.

---

### 2.2 Canvas-oppløsning og DPR

| Sted | Ca. linje | Problem |
|------|-----------|---------|
| `resize` | ~18–23 | `DPR = clamp(devicePixelRatio, 1, 2.25)` → buffer **1920×DPR × 1080×DPR** piksler. **clearRect + full render** hvert bilde på mange millioner piksler. |

**Innsparing:** Cap `DPR` lavere (f.eks. 1.5 eller 1.25) som **grafikkinnstilling**, eller **intern oppløsning** 1600×900 skalert opp. Typisk størst «billig» gevinst for svakere maskiner.

**Risiko:** Lav — visuelt litt mykere kanaler; spillere med 4K vil merke.

---

### 2.3 `shadowBlur` og «glow»-effekter

| Område | Eksempel | Problem |
|--------|----------|---------|
| `glowCircle` | ~8498–8507 | `shadowBlur` på hvert kall — **svært dyrt** i Canvas 2D. |
| `drawBullet`, `drawOrb`, `drawEnemy` (fallback), `drawParticle` | ~10024+, ~10087+, ~9913+, ~10363+ | Gjentatt `shadowBlur` per entitet/partikkel. |

**Innsparing:** Erstatt med **enklere fill** (gradient uten shadow), **sprites**, eller **færre glow** under stress (LOD). Eventuelt **én** offscreen «glow pass» i stedet for hundre små.

**Risiko:** Middels — visuell endring; må avstemmes med design.

---

### 2.4 Hovedloop: `render()` kjører alltid; `mapW` nullstilles ikke i meny

| Sted | Ca. linje | Problem |
|------|-----------|---------|
| `loop` | ~7720–7730 | `requestAnimationFrame(loop)` deretter **`render()`** → **alltid ~60 Hz tegning**. `if (!running \|\| paused) return` gjelder **kun oppdatering**, ikke `render`. |
| `mapW`/`mapH` | ~1178, ~6616 | Settes ved level-init; **ikke** nullstilt ved tilbake til hovedmeny. Etter minst én run kan **full bakgrunn** fortsatt tegnes bak HTML-overlay. |

**Innsparing:** Når `!running`: **minimal render** (svart/skjerm + evt. versjon) eller **hopp over** tung verdens-tegning. Ved meny: `mapW = 0` eller egen `renderMenuOnly()`.

**Risiko:** Lav — må teste overganger (fade, victory).

---

## 3. Middels prioritet

### 3.1 Kule vs fiende (nested loop)

| Sted | Ca. linje | Problem |
|------|-----------|---------|
| Bullet-kollisjon | ~8267–8294 | For hver kule: loop over **alle** `enemies`. Kompleksitet **O(B × E)**. |

**Innsparing:** Spatial hash / grid / enkel **broad phase** (kun fiender nær kulen). Ved få fiender er det lite å hente; ved mange prosjektiler + mange fiender **merkbart**.

**Risiko:** Middels — må ikke introdusere missed hits.

---

### 3.2 `splashDamage` og liknende

| Sted | Ca. linje | Problem |
|------|-----------|---------|
| `splashDamage` | ~5033–5044 | `for (const e of enemies)` — O(E) per splash. |

**Innsparing:** Samme spatial struktur som over; eller begrens radius-sjekk.

**Risiko:** Lav–middels.

---

### 3.3 `pushOutOfMallProps` og kollisjon mot rekker

| Sted | Ca. linje | Problem |
|------|-----------|---------|
| `pushOutOfMallProps` | ~8930–8937 | `for (const p of mallProps)` per entitet som kalles ofte. |

**Innsparing:** Spatial hash for props, eller færre rektangler å sjekke mot når spilleren er langt unna.

**Risiko:** Middels.

---

### 3.4 `localStorage`

**Observasjon:** ~69 treff på `localStorage.getItem` / `setItem` i `main.js`. Synchronous API — **OK** ved meny/lagring, men **unngå** i inner loop (hvert bilde / hvert klikk-storm).

**Innsparing:** Batch/debounce lagring, eller én `saveRunState()` med trotling.

**Risiko:** Lav hvis dere bare flytter kall ut av hot paths.

---

## 4. Lavere prioritet / mindre sannsynlig flaskehals

| Tema | Merknad |
|------|---------|
| **Enkelt `main.js`-fil** | Vedlikehold og merge-konflikter — **ikke** nødvendigvis tregere runtime. |
| **Google Fonts (CDN)** | `index.html` laster fonter fra nett — kan påvirke **første** lasting, sjelden FPS i loop. |
| **`now()` i `drawEnemy` / `drawPlayer`** | Ekstra `performance.now()`-kall per entitet — småpenger; optimaliser sist. |
| **`drawFountain`** | Animasjon + gradienter hvert bilde — mindre enn full floor; kan optimaliseres etter floor-cache. |

---

## 5. Måling før og etter (anbefalt)

Uten måling blir optimalisering gjetting.

1. **FPS / frame time** (enkelt overlay): `requestAnimationFrame` + glidende `dt`.  
2. **Telle** (midlertidig): `enemies.length`, `bullets.length`, `particles.length` per frame.  
3. **Chrome Performance** (F12): profiler ett minutt i «worst case» (mange fiender + mange kuler).

---

## 6. Foreslått rekkefølge ved implementering

1. **Cap DPR / oppløsningsvalg** (rask test, stor effekt på svak HW).  
2. **Cache floor / bakgrunn** (eller viewport culling) for mall/skog/kloakk.  
3. **Reduser `shadowBlur` / glow** (billigere visuell stil i kamp).  
4. **`render` når `!running`** + evt. nullstill `mapW`/`mapH` ved meny.  
5. **Spatial struktur** for kuler + splash når profil viser det trengs.  
6. **Rydd `localStorage`** i hot paths hvis profiler viser blokker.

---

## 7. Ikke gjort i denne runden

- Ingen endring av spillkode eller filer utenom dette dokumentet.  
- Ingen automatiske benchmarks kjørt i dette miljøet (anbefales lokalt).

---

*Ved neste økt: velg 1–2 punkter fra §6, mål før/etter, deretter implementer.*
