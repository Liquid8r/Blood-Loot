# Affix Loot – Versjon 1 (Git)

## Steg 1: Commit som versjon 1 (kjør i terminal i prosjektmappen)

Åpne PowerShell eller Command Prompt og gå til mappen:

```powershell
cd "d:\Carloz\Affix Loot (Hvor Cursor skal legge HTML-spillet)"
```

Deretter:

```powershell
git add .
git status
git commit -m "v1.0 – Ready for testing (brother Oslo)"
```

Hvis `git status` viser "nothing to commit, working tree clean", er alt allerede committet. Da kan du bare tagge versjonen:

```powershell
git tag -a v1.0 -m "Version 1 – first test release"
```

Hvis du nettopp gjorde en ny commit, legg på tag etterpå:

```powershell
git tag -a v1.0 -m "Version 1 – first test release"
```

---

## Steg 2: Lage repo på GitHub og pushe

1. Gå til [github.com](https://github.com) og logg inn.
2. Klikk **"New repository"** (grønn knapp).
3. **Repository name:** f.eks. `affix-loot`
4. **Private** (så bare du og broren din ser det), eller **Public** om du vil.
5. Ikke kryss av for README, .gitignore eller license (prosjektet har det).
6. Klikk **"Create repository"**.

Deretter, i samme mappe i PowerShell:

```powershell
git remote add origin https://github.com/DITT-BRUKERNAVN/affix-loot.git
git branch -M main
git push -u origin main
git push origin v1.0
```

Bytt ut `DITT-BRUKERNAVN` med ditt GitHub-brukernavn og `affix-loot` med det repo-navnet du valgte.  
Hvis Git ber om passord: bruk en **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens) i stedet for passord.

---

## Steg 3: Gi broren bruker-tilgang (kun lese)

1. På GitHub: åpne repoet **affix-loot**.
2. **Settings** → **Collaborators** (eller **Manage access**).
3. **Add people** → skriv inn brorens GitHub-e-post eller brukernavn.
4. Velg **Role: Read** (kun lese, ingen redigering).
5. Han får en invitasjon på e-post og må godta.

Etter det kan han:

- **Clone** (nedlasting av hele prosjektet):
  ```powershell
  git clone https://github.com/DITT-BRUKERNAVN/affix-loot.git
  ```
- **Åpne spillet lokalt:** åpne mappen og dobbeltklikk `index.html`, eller bruk "Live Server" i VS Code/Cursor.
- Alternativt: du kan publisere spillet på **GitHub Pages** (Settings → Pages → Deploy from branch `main`), så kan han bare åpne en lenke i nettleseren uten å clone.

---

## Oppsummert

| Hva | Kommando / handling |
|-----|---------------------|
| Commit alt som v1 | `git add .` → `git commit -m "v1.0 – Ready for testing"` |
| Tag versjon 1 | `git tag -a v1.0 -m "Version 1"` |
| Koble til GitHub | `git remote add origin https://github.com/BRUKER/affix-loot.git` |
| Push kode + tag | `git push -u origin main` og `git push origin v1.0` |
| Broren får lese-tilgang | Repo → Settings → Collaborators → Add people → Role: **Read** |

Når du har kjørt disse stegene, er spillet lagret som versjon 1 på Git, og broren kan få bruker-tilgang (kun les) så snart du legger ham til som collaborator med Read.
