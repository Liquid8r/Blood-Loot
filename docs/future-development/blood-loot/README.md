# Blood Loot — Lore & design path

One possible development path. Lore and mechanics described here may influence future features. Not implemented in current build.

---

## Character background

The character is a hybrid profile, not fully any single archetype:

- **Research** — background in science/research (not 100% a scientist)
- **Combat** — experience from conflict zones (not 100% a soldier)
- **Survival** — trained to survive alone (not 100% a survivalist)
- **Engineering** — able to repair and repurpose found equipment (not 100% an engineer)

This mix makes the character the best fit for a critical mission: saving "katteheten" (humanity/feline-kind) by finding a solution to stop invasions of small creatures that are taking over.

---

## The mission

- The solution is believed to lie in the **blood of these creatures**.
- Success requires a specific set of traits: **battle-ready**, **solution-oriented**, willing to **sacrifice everything** to collect rare blood samples.

---

## Blood & ampules (replaces XP orbs)

- **Current:** Green XP orbs are collected and fill an XP bar; token bar for permanent upgrades.
- **This path:** Collect **blood drops** into **ampules** instead of generic XP orbs.
- **Goal:** Fill ampules with different **blood types** (different **colors**).
- **UI:** Empty ampules are shown in place of (or alongside) the current XP bar and token bar.
- When the **mission target** is reached (ampules filled / objective met), the character can **fly off the board** with a **jetpack** and return to **the lab** (e.g. Main Menu or a dedicated lab screen).

---

## Endless run & when to Extract

- The run is **endless** – no fixed round length. Once you have **enough blood**, you are **pushing the limits of survival** by staying: it is possible for a while, and you can have **increased chance of better loot**, but you **must Extract** at some point before the mobs overwhelm you.
- Difficulty should become **noticeably harder** the longer you stay – the player must feel the tension between «take what you have» and «gamble for more».

---

## Extract move (in-combat ability)

- **Extract is not possible** until you have collected enough blood samples according to the level quest. When you have enough, the **Extract button lights up**. On PC you can press **X** for extraction (e.g. just before death or at a critical moment).
- Pressing Extract (or **X** on PC) **starts the countdown** for the jetpack's loading/booting time.
- **Extraction takes 10 seconds** (default), with a **clear countdown** before you are automatically lifted by a **jetpack on your back** – once it has finished charging and is strong enough to lift you.
- Show a **small panel** (e.g. «Jetpack booting time» or similar) that displays the **number of seconds** from when you press Extract until you actually take off and fly back to your pod – so the player always sees how long is left.
- **More weight = longer charge time** for the jetpack; if we use this, show it in this panel (or a tooltip). Default is 10 seconds; **overweight** can make the jetpack take noticeably longer.
- **Animation / feel:**
  - Character raises one hand (Superman-style pose).
  - Character **grows larger and larger**, teeth clenched.
  - The **board with the small creatures shrinks** to sell the effect that the character has "extracted" (sucked in / dominated the space).
- Supports the fantasy that the character is drawing power or completing an extraction in the heat of battle.

---

## The lab & progression

- In the **lab** (e.g. post-run or Main Menu), the character **analyses the blood**.
- This analysis yields a **currency** used to **upgrade equipment and skills** (replaces or extends current token/skill system).

---

## Loot & scrap

- **Loot still has rarity**; the player can find new items, but often finds **scrap parts** that must be **worked on in the workshop**.
- **All items can be scrapped** — at any time (e.g. when comparing loot):
  - **Current behaviour:** Loot comparison lets you keep one item and discard the other.
  - **New behaviour:** The discarded item is **dismantled** and becomes **scrap of the same rarity** as the item (no item is "thrown away"; it turns into a material).
- Scrap can be used in the workshop/lab for crafting or upgrades.

---

## Summary for implementation

| Area            | Current / idea                         | Blood Loot direction                                      |
|----------------|----------------------------------------|-----------------------------------------------------------|
| Progression    | XP orbs → XP bar → level; token bar    | Blood drops → ampules (by type/color); ampule UI          |
| End of run     | Victory / defeat screen                | Jetpack exit to lab when mission target reached          |
| In-combat      | —                                      | "Extract" button: character grows, board shrinks          |
| Hub            | Main Menu                              | Lab: analyse blood → currency for upgrades               |
| Loot discard   | Keep one, discard one                  | Discard = dismantle into scrap of same rarity             |
| Items          | Equip or discard                       | Scrap used in workshop; loot often scrap/parts            |

---

*Sti: **Blood Loot**. Henvis til denne mappen når vi utvikler denne retningen videre.*
