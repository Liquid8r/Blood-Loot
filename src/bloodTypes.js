/**
 * Blood Loot – blodtyper (data).
 * Brukes for drop per level, ampulle-UI, quest og lab.
 * Utvid til 40–50 typer over tid; tier og biome styrer når de kan droppe.
 */
(function () {
  window.BLOOD_TYPES = [
    // Biom 1 (levels 1-1, 1-2, 1-3)
    { id: "red",    name: "Red",    tier: 1, biome: 1, color: "#c0392b", glow: false },
    { id: "green",  name: "Green",  tier: 1, biome: 1, color: "#27ae60", glow: false },
    { id: "blue",   name: "Blue",   tier: 1, biome: 1, color: "#2980b9", glow: false },
  ];

  /** Hvilke blodtyper kan droppe på dette levelet (1-1, 1-2, 1-3, …). */
  window.BLOOD_TYPES_BY_LEVEL = {
    "1-1": ["red"],
    "1-2": ["red", "green"],
    "1-3": ["red", "green", "blue"],
  };

  window.getBloodType = function (id) {
    return window.BLOOD_TYPES.find(function (b) { return b.id === id; }) || null;
  };

  /** Which blood types can drop on this level. Unknown levelId falls back to "1-1". */
  window.getBloodTypesForLevel = function (levelId) {
    var ids = window.BLOOD_TYPES_BY_LEVEL[levelId] || window.BLOOD_TYPES_BY_LEVEL["1-1"] || [];
    return ids.map(function (id) { return window.getBloodType(id); }).filter(Boolean);
  };

  /** Pick one blood type at random that is allowed to drop on this level (for future drop logic). */
  window.getRandomBloodTypeForLevel = function (levelId) {
    var list = window.getBloodTypesForLevel(levelId);
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  };
})();
