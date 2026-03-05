# Biom 1 – Mall maps: Level design (1-1, 1-2, 1-3)

Same visual style for all three; basement (1-3) naturally darker and more utilitarian. Maps are large enough to work as **gameplay background** (player explores, fights Skittering Mice, collects loot). Top-down with slight angle for readability.

---

## Shared style (all three levels)

- **View**: Top-down with slight angle (~20–30° from above) so corridors and rooms read clearly.
- **Palette**: Neutral mall tones – grey/beige tile, lighter corridors, darker shop interiors; warm ceiling lights, some flickering or off. No sci-fi; earthly, slightly eerie “after hours”.
- **Props**: Trash bins, planters, benches, abandoned carts; shop fronts as rectangular blocks with signs. Escalators/stairs as clear landmarks.
- **Readability**: Clear walkable space (corridors, plazas) vs. obstacles/shops; spawn zones (dark corners, vents, open doors) and landmarks (fountain, escalator, elevator to basement) must read at a glance.

---

## LVL 1-1: First floor (ground floor)

**Concept**: One full floor of the mall. Character spawns near an entrance and explores: main corridor → fountain & food court → side wings with shops → escalator up (visible but not used yet).

**Layout (abstract)**  
Think of a large “H” or “#” shape so the player has loops, not one long corridor.

- **Main corridor (east–west)**: Wide central strip. Tile floor, shop fronts on north and south. Runs from west entrance to east (where it meets the central plaza). Length: dominant axis of the map.
- **Central plaza**: Open area where the main corridor widens. **Fountain** in the middle (round or oval), benches around it. **Food court** along one side – several counter fronts (pizza, burger, coffee – generic names or icons). This is a key landmark and open combat space.
- **North wing**: Branch off the main corridor. Contains **“Veldt”** (fictional clothing store) – larger shop front, maybe mannequins or a sign. One or two smaller shops. Corridor leads to a dead end or back to main (loop).
- **South wing**: Similar. Maybe an electronics-style shop and a generic “MART” or “HOME” store. Forms a second loop so the floor feels large.
- **West end**: Mall entrance (glass doors, maybe a few abandoned carts). Player can start here or near here.
- **East end**: **Escalator up** to 2nd floor – clearly visible, lit, so the player sees “next level” but doesn’t use it in 1-1. Maybe a small info sign or planters around it.
- **Details**: Planters along the main corridor; some shop doors open (dark inside = spawn feel), some closed. A few benches and trash cans. Lighting: most strips on, a few flickering or off for mood.

**Size**: Large. In pixels, aim for a background that can scroll or fill a 1920×1080 (or 2560×1440) view with plenty of room to move – e.g. the full map image might be 2048×2048 or 2400×2400 so the camera can pan across the floor.

**Spawn / gameplay**: Enemies (Skittering Mice) from dark shop doorways, corners, and possibly vents (small floor or ceiling markers). Loot and orbs in corridors and plaza. No basement access on 1-1.

---

## LVL 1-2: Second floor

**Concept**: Player has “gone up the escalator”. Same mall style, different layout. Slightly more compact or different shape so it doesn’t feel like a copy of 1-1.

**Layout**

- **Landing**: Top of escalator – open area with railing overlooking the floor below (optional: we could show a hint of 1-1 below). Info board or directory.
- **Corridor layout**: Maybe a “U” or “O” shape – one main loop around an inner void (atrium over the fountain below?) so the second floor feels like a balcony. Or a simpler layout: main corridor with branches.
- **Shops**: Different from 1-1. E.g. “NORTH STAR” (fictional) sport/outdoor, a small bookstore, a phone/tech shop. Same visual language: rectangular fronts, signs, some open doors.
- **Open area**: A smaller plaza or seating area (sofas, small tables) – second landmark. Maybe a kiosk or vending area.
- **Down to basement**: **Elevator** or **stairs down** to basement – clearly marked (e.g. “P – Parking / Basement”). This is the exit for 1-2 and the lead-in to 1-3. No sewer yet; just the transition point.

**Size**: Same scale as 1-1 so the game can use the same camera/scroll logic. Map image in the same resolution range.

**Spawn**: Same rules as 1-1 – mice from dark doors and corners. Slightly more threat (more or tougher spawns) to match level progression.

---

## LVL 1-3: Basement

**Concept**: “Go down to the basement” – then later the narrative leads to the sewer (we revisit the sewer separately). So 1-3 is **basement only**: parking, storage, service corridors. Same style family, but clearly different.

**Layout**

- **Stairs/elevator arrival**: Player “lands” in a basement lobby or at the bottom of the stairs. Concrete or industrial tile, dimmer light.
- **Parking area**: Large open zone – parking stripes (or suggestion of them from above), pillars, a few abandoned cars (simple shapes). This is the main “arena” of 1-3: big, open, good for combat. Dark corners at the edges for spawns.
- **Service corridor**: Narrower corridor leading away from the parking area – storage doors, pipes on ceiling, “STAFF ONLY” or “DELIVERY” vibe. Could lead to a **door or grate** that will later be “to the sewer” (for now just a marked exit or next-area hint).
- **Storage / back-of-house**: One or two side areas with shelves or boxes (simplified shapes), delivery dock door. Makes the floor feel like the belly of the mall.
- **Lighting**: Fluorescent strips, some broken or flickering; fewer warm lights. Greys, concrete, maybe yellow stripes on floor. Slightly green or blue tint to separate from the warmer 1-1 and 1-2.

**Size**: Same as 1-1 and 1-2. Large enough that the parking area feels spacious and the service corridor feels like a distinct path.

**Spawn**: Mice (and later rats) from behind pillars, storage doors, and dark corners. Tension builds toward the “sewer door” or exit.

**Narrative hook**: Brief message to the player: “Head down to the basement” (end of 1-2). In 1-3, optional text or visual: “Strange sounds from below…” or a locked grate “TO SEWERS” for future use.

---

## Summary table

| Level | Setting        | Key landmarks                    | Exit / next        | Mood                    |
|-------|----------------|----------------------------------|--------------------|-------------------------|
| 1-1   | 1st floor mall | Fountain, food court, Veldt, escalator | Escalator up       | Mall after hours        |
| 1-2   | 2nd floor mall | Atrium/balcony, North Star, elevator down | Elevator/stairs to basement | Same, slightly tighter  |
| 1-3   | Basement       | Parking, service corridor, sewer door   | (Sewer later)      | Industrial, dim, tense  |

---

## Asset output

- **1-1**: `assets/map-1-1-first-floor.png` – first floor, full layout as above.
- **1-2**: `assets/map-1-2-second-floor.png` – second floor.
- **1-3**: `assets/map-1-3-basement.png` – basement.

See `assets/maps/README.md` for quick reference. All same style and similar resolution so the game can swap them per level and use the same camera/scroll.
