/**
 * Blood Loot – blodtyper (data).
 * Biome 1: red (speed). Biome 2: blue (dmg). Biome 3: green (toxic). Biome 4: purple (speed + dmg).
 * Used for drops per level, ampule UI, quest, and Chemistry Lab research/potions.
 */
(function () {
  window.BLOOD_TYPES = [
    { id: "red",    name: "Red",    tier: 1, biome: 1, color: "#c0392b", trait: "speed",       glow: false },
    { id: "blue",   name: "Blue",   tier: 2, biome: 2, color: "#2980b9", trait: "dmg",        glow: false },
    { id: "green",  name: "Green",  tier: 3, biome: 3, color: "#27ae60", trait: "toxic",      glow: false },
    { id: "purple", name: "Purple", tier: 4, biome: 4, color: "#8e44ad", trait: "speedAndDmg", glow: false },
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
