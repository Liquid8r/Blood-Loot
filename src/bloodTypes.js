/**
 * Blood Loot – blodtyper (data).
 * Biome 1: red (speed). Biome 2: blue (dmg). Biome 3: green (toxic). Biome 4: purple (speed + dmg).
 * Used for drops per level, ampule UI, quest, and Chemistry Lab research/potions.
 */
(function () {
  window.BLOOD_TYPES = [
    // Core biome drops (one hovedtype per biome)
    { id: "red",    name: "Red",    tier: 1, biome: 1, color: "#c0392b", trait: "speed",        glow: false },
    { id: "blue",   name: "Blue",   tier: 2, biome: 2, color: "#2980b9", trait: "dmg",          glow: false },
    { id: "green",  name: "Green",  tier: 3, biome: 3, color: "#27ae60", trait: "toxic",        glow: false },
    { id: "purple", name: "Purple", tier: 4, biome: 4, color: "#8e44ad", trait: "speedAndDmg",  glow: false },

    // Research-only / advanced blends (låses opp via Chemical Lab, dropper ikke direkte i nivåene)
    { id: "amber",  name: "Amber",  tier: 2, biome: null, color: "#d35400", trait: "regenBoost",   glow: true },
    { id: "obsidian", name: "Obsidian", tier: 5, biome: null, color: "#1b1b1f", trait: "damageShield", glow: true },
    { id: "ivory",  name: "Ivory",  tier: 3, biome: null, color: "#ecf0f1", trait: "healingPulse", glow: true },
    { id: "crimson",name: "Crimson",tier: 4, biome: null, color: "#7b0000", trait: "bleedAura",   glow: true }
  ];

  /** Which blood types can drop on this level. One primary type per biome. */
  window.BLOOD_TYPES_BY_LEVEL = {
    "1-1": ["red"],
    "1-2": ["red"],
    "1-3": ["red"],
    "2-1": ["blue"],
    "2-2": ["blue"],
    "2-3": ["blue"],
    "3-1": ["green"],
    "3-2": ["green"],
    "3-3": ["green"],
    "4-1": ["purple"],
    "4-2": ["purple"],
    "4-3": ["purple"],
  };

  window.getBloodType = function (id) {
    return window.BLOOD_TYPES.find(function (b) { return b.id === id; }) || null;
  };

  /**
   * Faste forsknings-kombinasjoner for Chemical Lab.
   * Disse brukes til å låse opp/oppgradere Core System-kuler og avanserte blodtyper.
   * Implementering av selve lab-logikken skjer senere – dette er kun datagrunnlaget.
   */
  window.BLOOD_RESEARCH_COMBOS = [
    // Enkle kombinasjoner (2 minutter)
    { id: "combo_red_amber",    timeSec: 120,  cost: { red: 1000 },                      result: "amber",   hintKey: "lab_hint_amber" },
    { id: "combo_blue_ivory",   timeSec: 120,  cost: { blue: 800 },                      result: "ivory",   hintKey: "lab_hint_ivory" },

    // Mer avanserte (5 minutter)
    { id: "combo_green_crimson",timeSec: 300,  cost: { green: 700, red: 700 },           result: "crimson", hintKey: "lab_hint_crimson" },

    // Top tier (15 minutter)
    { id: "combo_purple_obsidian", timeSec: 900, cost: { purple: 600, blue: 600, red: 600 }, result: "obsidian", hintKey: "lab_hint_obsidian" }
  ];

  /** Which blood types can drop on this level. Unknown levelId falls back to 1-1. */
  window.getBloodTypesForLevel = function (levelId) {
    var ids = window.BLOOD_TYPES_BY_LEVEL[levelId] || window.BLOOD_TYPES_BY_LEVEL["1-1"] || [];
    return ids.map(function (id) { return window.getBloodType(id); }).filter(Boolean);
  };

  /** Pick one blood type at random that is allowed to drop on this level. */
  window.getRandomBloodTypeForLevel = function (levelId) {
    var list = window.getBloodTypesForLevel(levelId);
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  };
})();
