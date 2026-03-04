(() => {
  // ========= Canvas =========
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let W=0,H=0,DPR=1;

  function resize(){
    DPR = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
    W = Math.floor(innerWidth * DPR);
    H = Math.floor(innerHeight * DPR);
    canvas.width = W; canvas.height = H;
  }
  addEventListener("resize", resize);
  resize();

  // ========= UI =========
  const overlay = document.getElementById("overlay");
  const ovHead = document.getElementById("ovHead");
  const ovTitle = document.getElementById("ovTitle");
  const ovSub = document.getElementById("ovSub");
  const ovBtns = document.getElementById("ovBtns");
  const ovBody = document.getElementById("ovBody");
  const toast = document.getElementById("toast");
  const bossBanner = document.getElementById("bossBanner");

  const hpFill = document.getElementById("hpFill");
  const shFill = document.getElementById("shFill");
  const xpFill = document.getElementById("xpFill");
  const hpTxt = document.getElementById("hpTxt");
  const shTxt = document.getElementById("shTxt");
  const xpTxt = document.getElementById("xpTxt");
  const tokenFill = document.getElementById("tokenFill");
  const tokenTxt = document.getElementById("tokenTxt");

  const tTag = document.getElementById("tTag");
  const kTag = document.getElementById("kTag");
  const lTag = document.getElementById("lTag");
  const dpsTag = document.getElementById("dpsTag");
  const streakTag = document.getElementById("streakTag");
  const threatTag = document.getElementById("threatTag");
  const equipMini = document.getElementById("equipMini");

  // NEW: DMG / ATK SPD tags (in-run only)
  const dmgTag = document.getElementById("dmgTag");
  const atkTag = document.getElementById("atkTag");
  const dmgWrap = document.getElementById("dmgWrap");
  const atkWrap = document.getElementById("atkWrap");

  // ========= Version (bump thousandths for each release, e.g. 1.001, 1.002) =========
  const GAME_VERSION = "1.004.0";
  const gameVersionEl = document.getElementById("gameVersion");
  if(gameVersionEl) gameVersionEl.textContent = `v${GAME_VERSION}`;
  document.title = `Affix Loot — v${GAME_VERSION}`;

  // ========= Helpers =========
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const dist2 = (ax,ay,bx,by)=>{const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy;};
  const rand = (a,b)=>a+Math.random()*(b-a);
  const randi = (a,b)=>Math.floor(rand(a,b+1));
  const pick = arr => arr[(Math.random()*arr.length)|0];
  const now = ()=>performance.now();
  function formatTime(s){
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s/60);
    const ss = (s%60).toString().padStart(2,"0");
    return `${m.toString().padStart(2,"0")}:${ss}`;
  }
  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // ========= Audio =========
  const SFX_LEVEL_MULTIPLIER = 2.2;
  let audioCtx=null;
  let musicVol = Math.min(1, Math.max(0, +(localStorage.getItem("affixloot_music_vol")||0.28)));
  let sfxVol = Math.min(1, Math.max(0, +(localStorage.getItem("affixloot_sfx_vol")||1)));
  let menuMusic=null;
  let menuMusicStartedOnce=false;
  let runMusic=null;

  function stopMenuMusic(){
    if(!menuMusic) return;
    menuMusic.pause();
    menuMusic.currentTime = 0;
  }

  function applyMusicVolume(){
    const v = musicVol;
    if(menuMusic) menuMusic.volume = v;
    if(runMusic) runMusic.volume = v;
  }

  function getVolumeControlsHTML(){
    const m = Math.round(musicVol*100);
    const s = Math.round(sfxVol*100);
    return `
      <div class="volumeControlRow volumeControlRowMusic">
        <label class="volumeLabel">Music</label>
        <div class="volumeSliderWrap">
          <input type="range" id="volumeMusic" min="0" max="100" value="${m}" class="volumeSlider"/>
          <span class="volumePct" id="volumeMusicPct">${m}%</span>
        </div>
      </div>
      <div class="volumeControlRow volumeControlRowSfx">
        <label class="volumeLabel">Sound effects</label>
        <div class="volumeSliderWrap">
          <input type="range" id="volumeSfx" min="0" max="100" value="${s}" class="volumeSlider"/>
          <span class="volumePct" id="volumeSfxPct">${s}%</span>
        </div>
      </div>
    `;
  }
  function attachVolumeListeners(container){
    const musicSl = container.querySelector("#volumeMusic");
    const sfxSl = container.querySelector("#volumeSfx");
    const musicPct = container.querySelector("#volumeMusicPct");
    const sfxPct = container.querySelector("#volumeSfxPct");
    if(musicSl){
      musicSl.oninput = ()=>{
        musicVol = musicSl.value/100;
        localStorage.setItem("affixloot_music_vol", String(musicVol));
        if(musicPct) musicPct.textContent = Math.round(musicVol*100)+"%";
        applyMusicVolume();
        if(menuMusic && musicVol>0 && !running) menuMusic.play().catch(()=>{});
        if(runMusic && musicVol>0 && running) runMusic.play().catch(()=>{});
      };
    }
    if(sfxSl){
      sfxSl.oninput = ()=>{
        sfxVol = sfxSl.value/100;
        localStorage.setItem("affixloot_sfx_vol", String(sfxVol));
        if(sfxPct) sfxPct.textContent = Math.round(sfxVol*100)+"%";
        if(sfxVol>0) beep({freq:600,dur:0.04,type:"sine",gain:0.04});
      };
    }
  }

  (function initMenuMusic(){
    menuMusic = new Audio("assets/audio/Main Menu.mp3");
    menuMusic.loop = true;
    menuMusic.preload = "auto";
    menuMusic.load();
  })();
  function ensureAudio(){
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended") audioCtx.resume();
  }
  function beep({freq=440, dur=0.06, type="sine", gain=0.06, slide=0, noise=false}={}){  // tiny synth
    if(sfxVol<=0) return;
    ensureAudio();
    const gainMul = Math.max(0.0001, gain * sfxVol * SFX_LEVEL_MULTIPLIER);
    const t0 = audioCtx.currentTime;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gainMul, t0+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);

    if(noise){
      const len = Math.floor(audioCtx.sampleRate * dur);
      const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for(let i=0;i<len;i++) data[i] = (Math.random()*2-1) * (1 - i/len);
      const src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.connect(g).connect(audioCtx.destination);
      src.start(t0);
      src.stop(t0+dur);
      return;
    }

    const o = audioCtx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if(slide) o.frequency.exponentialRampToValueAtTime(freq*slide, t0+dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0);
    o.stop(t0+dur);
  }
  function powerUpLegendary(){
    beep({freq: 880, dur:0.10, type:"sine", gain:0.07});
    beep({freq: 1320, dur:0.14, type:"triangle", gain:0.06, slide:0.75});
    beep({freq: 1760, dur:0.16, type:"sine", gain:0.05, slide:0.65});
    beep({noise:true, dur:0.05, gain:0.02});
  }
  function bossApproachSound(){
    beep({freq: 220, dur:0.18, type:"sawtooth", gain:0.06, slide:0.65});
    beep({freq: 440, dur:0.20, type:"triangle", gain:0.05, slide:1.15});
    beep({noise:true, dur:0.06, gain:0.02});
  }
  function levelUpExplosionSound(){
    beep({freq: 90, dur:0.12, type:"sawtooth", gain:0.055, slide:0.4});
    beep({noise:true, dur:0.07, gain:0.025});
  }
  function victorySuckFanfare(){
    beep({freq: 523, dur:0.10, type:"triangle", gain:0.06});
    beep({freq: 659, dur:0.12, type:"triangle", gain:0.06, slide:1.02});
    beep({freq: 784, dur:0.14, type:"triangle", gain:0.055, slide:1.02});
    beep({freq: 1047, dur:0.18, type:"sine", gain:0.05, slide:0.98});
  }

  // ========= Rarity =========
  const RAR = {
    common:   {name:"Common",    color:cssVar("--common"),    w:0.67},
    uncommon: {name:"Uncommon",  color:cssVar("--uncommon"),  w:0.24},
    rare:     {name:"Rare",      color:cssVar("--rare"),      w:0.08},
    legendary:{name:"Legendary", color:cssVar("--legendary"), w:0.01},
  };
  function rarityLabel(r){ return RAR[r].name; }

  // ========= Tuning =========
  const BASE = {
    playerR: 6,
    hp: 100,
    speed: 285,        // 190 * 1.5
    dashSpeed: 795,    // 530 * 1.5
    dashDur: 0.10,
    dashCD: 0.90,

    baseDmg: 8.8,   // 8 + 10%
    baseAtk: 0.82,     // attack interval (s); higher = slower fire
    bulletSpeed: 540,
    bulletLife: 0.95,

    xpNeed: 20,

    lootDropBase: 0.09,
    lootDropElite: 0.30,

    roundSeconds: 150,   // 2 min 30 s

    minibossApproachAt: 70,
    minibossSpawnAt: 75,
    bossApproachAt: 145,
    bossSpawnAt: 150,
  };

  // ========= Dev/Test toggles =========
  const TEST_SINGLE_MOB_MODE = false;
  /** When true, each new run counts as first-time: tutorial "seen" state is cleared at run start so tutorials show every run. */
  const DEV_TUTORIAL_EVERY_RUN = true;
  /** When true, start each run with a legendary weapon equipped (for testing). */
  const DEV_GIVE_LEGENDARY_WEAPON = true;
  // Endless run: no round end from time; boss every 60s; extract when player chooses.
  const ENDLESS_RUN = true;

  // ========= Levels (1-1 = current board; beat to unlock 1-2, then 1-3) =========
  const LEVELS = [
    { id: "1-1", name: "1-1", roundSeconds: 150, spawnScale: 1,    enemyHpScale: 1,   bossHpScale: 1,   threatDivisor: 1800, minibossPct: 0.47, bossPct: 0.93 },
    { id: "1-2", name: "1-2", roundSeconds: 155, spawnScale: 1.24, enemyHpScale: 1.34, bossHpScale: 1.30, threatDivisor: 1280, minibossPct: 0.44, bossPct: 0.88 },
    { id: "1-3", name: "1-3", roundSeconds: 180, spawnScale: 1.28, enemyHpScale: 1.4,  bossHpScale: 1.35, threatDivisor: 1200, minibossPct: 0.47, bossPct: 0.93 },
  ];
  function getLevelConfig(id){
    return LEVELS.find(l=>l.id===id) || LEVELS[0];
  }

  // ========= Quests / Contracts (grunnstruktur) =========
  const QUEST_STORAGE_KEY = "affixloot_quest_state";
  const QUEST_COOLDOWN_MS = 5 * 60 * 1000;
  const QUEST_DEFS = [
    {
      id: "kill_mice_easy",
      kind: "kills",
      difficulty: "easy",
      label: "Cull the Vermin",
      desc: "Kill 120 enemies (mice) across successful runs.",
      target: 120
    },
    {
      id: "survive_easy",
      kind: "survive",
      difficulty: "easy",
      label: "Stay Alive",
      desc: "Survive a total of 8 minutes across successful runs.",
      targetSeconds: 8 * 60
    },
    {
      id: "blood_easy",
      kind: "blood",
      difficulty: "easy",
      label: "Blood Tax",
      desc: "Collect 1200 ml blood across successful runs.",
      targetMl: 1200
    }
  ];

  function loadQuestState(){
    try{
      const raw = localStorage.getItem(QUEST_STORAGE_KEY);
      if(!raw) return { active:null, proposals:[], cooldownUntil:0, completed:null };
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return { active:null, proposals:[], cooldownUntil:0, completed:null };
      return {
        active: obj.active || null,
        proposals: Array.isArray(obj.proposals) ? obj.proposals : [],
        cooldownUntil: obj.cooldownUntil || 0,
        completed: obj.completed || null
      };
    } catch(e){
      return { active:null, proposals:[], cooldownUntil:0, completed:null };
    }
  }
  function saveQuestState(){
    try{
      localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(questState));
    }catch(e){}
  }
  function cloneQuestDef(def){
    return def ? {
      id: def.id,
      kind: def.kind,
      difficulty: def.difficulty,
      label: def.label,
      desc: def.desc,
      target: def.target || 0,
      targetSeconds: def.targetSeconds || 0,
      targetMl: def.targetMl || 0,
      progressKills: 0,
      progressSeconds: 0,
      progressMl: 0
    } : null;
  }
  function generateQuestProposals(){
    const pool = QUEST_DEFS.slice();
    const out = [];
    while(pool.length && out.length < 3){
      const idx = (Math.random() * pool.length) | 0;
      const def = pool.splice(idx,1)[0];
      out.push(cloneQuestDef(def));
    }
    return out;
  }
  let questState = loadQuestState();

  const SKILL_TREE_MAX_LEVEL = 3;
  const SKILL_TREES = [
    {
      id: "warrior",
      name: "WARRIOR",
      branched: true,
      nodes: [
        { id: "war_base", name: "Base Dmg", cost: 2, maxLevel: SKILL_TREE_MAX_LEVEL, branch: "base", branchIndex: 0 },
        { id: "war_crit_chance", name: "Crit Chance", cost: 2, maxLevel: SKILL_TREE_MAX_LEVEL, requires: ["war_base"], branch: "left", branchIndex: 0 },
        { id: "war_crit_dmg", name: "Crit Dmg", cost: 2, maxLevel: SKILL_TREE_MAX_LEVEL, requires: ["war_crit_chance"], branch: "left", branchIndex: 1 },
        { id: "war_stun_chance", name: "Stun Chance", cost: 2, maxLevel: SKILL_TREE_MAX_LEVEL, requires: ["war_crit_dmg"], branch: "left", branchIndex: 2 },
        { id: "war_stun_duration", name: "Stun Duration", cost: 3, maxLevel: SKILL_TREE_MAX_LEVEL, requires: ["war_stun_chance"], branch: "left", branchIndex: 3 },
        { id: "war_rate", name: "Rate of Fire", cost: 2, maxLevel: SKILL_TREE_MAX_LEVEL, requires: ["war_base"], branch: "right", branchIndex: 0 },
        { id: "war_pierce_chance", name: "Pierce Chance", cost: 2, maxLevel: SKILL_TREE_MAX_LEVEL, requires: ["war_rate"], branch: "right", branchIndex: 1 },
        { id: "war_pierce_dmg", name: "Pierce Dmg", cost: 2, maxLevel: SKILL_TREE_MAX_LEVEL, requires: ["war_pierce_chance"], branch: "right", branchIndex: 2 },
        { id: "war_splash", name: "Splash", cost: 3, maxLevel: SKILL_TREE_MAX_LEVEL, requires: ["war_pierce_dmg"], branch: "right", branchIndex: 3 },
        { id: "war_obliterate", name: "Obliterate", cost: 5, maxLevel: SKILL_TREE_MAX_LEVEL, requires: ["war_stun_duration", "war_splash"], branch: "top", branchIndex: 0 }
      ]
    },
    {
      id: "survivalist",
      name: "SURVIVOR",
      branched: true,
      nodes: [
        { id: "surv_base", name: "", cost: 0, maxLevel: 1, branch: "base", branchIndex: 0 },
        { id: "surv_left_0", name: "", cost: 0, maxLevel: 1, requires: ["surv_base"], branch: "left", branchIndex: 0 },
        { id: "surv_left_1", name: "", cost: 0, maxLevel: 1, requires: ["surv_left_0"], branch: "left", branchIndex: 1 },
        { id: "surv_left_2", name: "", cost: 0, maxLevel: 1, requires: ["surv_left_1"], branch: "left", branchIndex: 2 },
        { id: "surv_left_3", name: "", cost: 0, maxLevel: 1, requires: ["surv_left_2"], branch: "left", branchIndex: 3 },
        { id: "surv_right_0", name: "", cost: 0, maxLevel: 1, requires: ["surv_base"], branch: "right", branchIndex: 0 },
        { id: "surv_right_1", name: "", cost: 0, maxLevel: 1, requires: ["surv_right_0"], branch: "right", branchIndex: 1 },
        { id: "surv_right_2", name: "", cost: 0, maxLevel: 1, requires: ["surv_right_1"], branch: "right", branchIndex: 2 },
        { id: "surv_right_3", name: "", cost: 0, maxLevel: 1, requires: ["surv_right_2"], branch: "right", branchIndex: 3 },
        { id: "surv_top", name: "", cost: 0, maxLevel: 1, requires: ["surv_left_3", "surv_right_3"], branch: "top", branchIndex: 0 }
      ]
    },
    {
      id: "scientist",
      name: "SCIENTIST",
      branched: true,
      nodes: [
        { id: "sci_base", name: "", cost: 0, maxLevel: 1, branch: "base", branchIndex: 0 },
        { id: "sci_left_0", name: "", cost: 0, maxLevel: 1, requires: ["sci_base"], branch: "left", branchIndex: 0 },
        { id: "sci_left_1", name: "", cost: 0, maxLevel: 1, requires: ["sci_left_0"], branch: "left", branchIndex: 1 },
        { id: "sci_left_2", name: "", cost: 0, maxLevel: 1, requires: ["sci_left_1"], branch: "left", branchIndex: 2 },
        { id: "sci_left_3", name: "", cost: 0, maxLevel: 1, requires: ["sci_left_2"], branch: "left", branchIndex: 3 },
        { id: "sci_right_0", name: "", cost: 0, maxLevel: 1, requires: ["sci_base"], branch: "right", branchIndex: 0 },
        { id: "sci_right_1", name: "", cost: 0, maxLevel: 1, requires: ["sci_right_0"], branch: "right", branchIndex: 1 },
        { id: "sci_right_2", name: "", cost: 0, maxLevel: 1, requires: ["sci_right_1"], branch: "right", branchIndex: 2 },
        { id: "sci_right_3", name: "", cost: 0, maxLevel: 1, requires: ["sci_right_2"], branch: "right", branchIndex: 3 },
        { id: "sci_top", name: "", cost: 0, maxLevel: 1, requires: ["sci_left_3", "sci_right_3"], branch: "top", branchIndex: 0 }
      ]
    },
    {
      id: "looter",
      name: "LOOTER",
      branched: true,
      nodes: [
        { id: "loot_base", name: "", cost: 0, maxLevel: 1, branch: "base", branchIndex: 0 },
        { id: "loot_left_0", name: "", cost: 0, maxLevel: 1, requires: ["loot_base"], branch: "left", branchIndex: 0 },
        { id: "loot_left_1", name: "", cost: 0, maxLevel: 1, requires: ["loot_left_0"], branch: "left", branchIndex: 1 },
        { id: "loot_left_2", name: "", cost: 0, maxLevel: 1, requires: ["loot_left_1"], branch: "left", branchIndex: 2 },
        { id: "loot_left_3", name: "", cost: 0, maxLevel: 1, requires: ["loot_left_2"], branch: "left", branchIndex: 3 },
        { id: "loot_right_0", name: "", cost: 0, maxLevel: 1, requires: ["loot_base"], branch: "right", branchIndex: 0 },
        { id: "loot_right_1", name: "", cost: 0, maxLevel: 1, requires: ["loot_right_0"], branch: "right", branchIndex: 1 },
        { id: "loot_right_2", name: "", cost: 0, maxLevel: 1, requires: ["loot_right_1"], branch: "right", branchIndex: 2 },
        { id: "loot_right_3", name: "", cost: 0, maxLevel: 1, requires: ["loot_right_2"], branch: "right", branchIndex: 3 },
        { id: "loot_top", name: "", cost: 0, maxLevel: 1, requires: ["loot_left_3", "loot_right_3"], branch: "top", branchIndex: 0 }
      ]
    }
  ];

  // Core Systems: scaling token costs per level and tier
  const CORE_TREE_LEVEL_COST_BASE = [2, 4, 6, 10, 20]; // for Level 1–5
  function coreTreeTierFactor(node){
    if(node.branch === "top") return 4; // Obliterate row (highest tier)
    if(node.branch === "left" || node.branch === "right"){
      // Three lowest nodes on each side = branchIndex 0–2
      if(node.branchIndex >= 3) return 2; // next row up on each side
      return 1;
    }
    // Base and any other branches use the lowest tier factor
    return 1;
  }
  function getCoreNodeCost(node, level, maxLevel){
    if(level >= maxLevel) return 0;
    const idx = Math.max(0, Math.min(level, CORE_TREE_LEVEL_COST_BASE.length - 1));
    return CORE_TREE_LEVEL_COST_BASE[idx] * coreTreeTierFactor(node);
  }
  let currentCoreTreeIndex = 0;
  let coreTreeSlideDir = null;
  let currentCoreInfoId = null;

  // ========= Inputs =========
  const keys=new Set();
  addEventListener("keydown",(e)=>{
    const k=e.key.toLowerCase();
    if(victoryPhase && (e.key==="Escape" || k==="m")){
      e.preventDefault();
      showVictoryEndScreen();
      return;
    }
    if(["w","a","s","d","arrowup","arrowleft","arrowdown","arrowright"," "].includes(k) || e.key===" ") e.preventDefault();
    if((k==="p" || k==="escape") && running){ togglePause(); return; }
    if(k==="x" && running && !paused && !inCompare && !victoryPhase && extractionCountdown==null && extractionLiftoff==null && player.hp>0){
      if(!bossKilled){
        showSimpleToast("Kill the boss first — Extraction available after boss.");
        e.preventDefault();
      } else {
        extractionCountdown = EXTRACTION_COUNTDOWN_SEC;
        e.preventDefault();
      }
    }
    keys.add(k===" " ? "space" : k);
  },{passive:false});
  addEventListener("keyup",(e)=>{
    const k=e.key.toLowerCase();
    keys.delete(k===" " ? "space" : k);
  });

  // ========= Loot types/icons =========
  const TYPE_ICONS = {
    weapon: ["⚔️","🗡️","🏹","🔫","🔱","🪓"],
    armor:  ["🛡️","🪖","🦺","🥾","🧤"],
    ring:   ["💍","🪬","🔱"],
    jewel:  ["💎","🔮","🧿","✨"],
  };

  // ========= Affixes =========
  const AFFIX_POOL = [
    {id:"dmgPct",  name:"Might",      icon:"💥", kind:["weapon","ring","jewel"], min:4,  max:14, fmt:v=>`+${v}% damage`},
    {id:"asPct",   name:"Haste",      icon:"💨", kind:["weapon","ring"],         min:4,  max:14, fmt:v=>`+${v}% attack speed`},
    {id:"critPct", name:"Deadeye",    icon:"🎯", kind:["weapon","ring","jewel"], min:2,  max:10, fmt:v=>`+${v}% crit chance`},
    {id:"critDmg", name:"Ruthless",   icon:"🩸", kind:["weapon","jewel"],        min:10, max:40, fmt:v=>`+${v}% crit damage`},
    {id:"pierce",  name:"Piercing",   icon:"📌", kind:["weapon","ring"],         min:1,  max:2,  fmt:v=>`+${v} pierce`},
    {id:"splash",  name:"Splash",     icon:"🧨", kind:["weapon","jewel"],        min:10, max:22, fmt:v=>`+${v}% splash`},
    {id:"lifesteal",name:"Leech",     icon:"🩸", kind:["weapon","ring"],         min:1,  max:4,  fmt:v=>`${v}% lifesteal`},
    {id:"hpFlat",   name:"Vitality",  icon:"❤️", kind:["armor","ring","jewel"], min:6,  max:22, fmt:v=>`+${v} max HP`},
    {id:"shieldFlat",name:"Ward",     icon:"🛡️", kind:["armor","ring"],         min:8,  max:26, fmt:v=>`+${v} shield`},
    {id:"regenPct", name:"Regen",     icon:"✨", kind:["armor","ring"],          min:6,  max:16, fmt:v=>`+${v}% shield regen`},
    {id:"msPct",    name:"Fleet",     icon:"🦶", kind:["armor","ring"],          min:3,  max:12, fmt:v=>`+${v}% move speed`},
    {id:"pickup",   name:"Magnet",    icon:"🧲", kind:["ring","jewel","armor"],  min:12, max:44, fmt:v=>`+${v} pickup`},
    {id:"slowAura", name:"Frost Aura",icon:"🧊", kind:["armor","ring","jewel"], min:6,  max:14, fmt:v=>`-${v}% enemy speed aura`},
    {id:"thorns",   name:"Thorns",    icon:"🌵", kind:["armor","ring"],          min:10, max:26, fmt:v=>`+${v}% thorns`},
    {id:"xpGain",   name:"Wisdom",    icon:"🧠", kind:["jewel"],                min:6,  max:18, fmt:v=>`+${v}% XP gain`},
    {id:"lootInvuln",name:"Loot Ward", icon:"✨", kind:["armor","ring"],         min:0.2, max:2,  fmt:v=>`+${v.toFixed(1)}s invuln after loot`},
    {id:"fury",     name:"Fury",      icon:"🔥", kind:["weapon","jewel"],        min:3,  max:12, fmt:v=>`+${v}% damage`},
    {id:"brawler",  name:"Brawler",   icon:"👊", kind:["weapon","ring"],        min:4,  max:11, fmt:v=>`+${v}% damage`},
    {id:"quickdraw",name:"Quickdraw", icon:"⚡", kind:["weapon","ring"],        min:3,  max:10, fmt:v=>`+${v}% attack speed`},
    {id:"swiftstrike",name:"Swiftstrike",icon:"💫", kind:["weapon"],            min:5,  max:13, fmt:v=>`+${v}% attack speed`},
    {id:"precision", name:"Precision", icon:"🎯", kind:["weapon","jewel"],      min:2,  max:8,  fmt:v=>`+${v}% crit chance`},
    {id:"fatal",    name:"Fatal",     icon:"💀", kind:["weapon","ring"],        min:1,  max:9,  fmt:v=>`+${v}% crit chance`},
    {id:"execution", name:"Execution",icon:"🪓", kind:["weapon","jewel"],       min:8,  max:32, fmt:v=>`+${v}% crit damage`},
    {id:"savage",   name:"Savage",    icon:"🦁", kind:["weapon"],               min:12, max:38, fmt:v=>`+${v}% crit damage`},
    {id:"puncture", name:"Puncture", icon:"🔪", kind:["weapon","ring"],        min:1,  max:2,  fmt:v=>`+${v} pierce`},
    {id:"chain",    name:"Chain",     icon:"🔗", kind:["weapon","jewel"],       min:8,  max:20, fmt:v=>`+${v}% splash`},
    {id:"vampiric", name:"Vampiric", icon:"🧛", kind:["weapon","ring"],        min:1,  max:3,  fmt:v=>`${v}% lifesteal`},
    {id:"vigor",    name:"Vigor",    icon:"💚", kind:["armor","ring","jewel"],  min:5,  max:20, fmt:v=>`+${v} max HP`},
    {id:"toughness", name:"Toughness",icon:"🦏", kind:["armor","jewel"],       min:7,  max:21, fmt:v=>`+${v} max HP`},
    {id:"bastion",  name:"Bastion",  icon:"🏰", kind:["armor","ring"],         min:6,  max:24, fmt:v=>`+${v} shield`},
    {id:"mend",     name:"Mend",     icon:"🌿", kind:["armor","ring"],          min:5,  max:14, fmt:v=>`+${v}% shield regen`},
    {id:"sprint",   name:"Sprint",   icon:"🏃", kind:["armor","ring"],          min:2,  max:11, fmt:v=>`+${v}% move speed`},
    {id:"draw",     name:"Draw",     icon:"🧭", kind:["ring","jewel","armor"],  min:10, max:40, fmt:v=>`+${v} pickup`},
    {id:"chill",    name:"Chill",    icon:"❄️", kind:["armor","ring","jewel"], min:5,  max:13, fmt:v=>`-${v}% enemy speed aura`},
    {id:"spikes",   name:"Spikes",   icon:"🦔", kind:["armor","ring"],         min:8,  max:24, fmt:v=>`+${v}% thorns`},
    {id:"insight",  name:"Insight",  icon:"📖", kind:["jewel"],                min:5,  max:16, fmt:v=>`+${v}% XP gain`},
    {id:"safety",   name:"Safety",   icon:"🛡️", kind:["armor","ring"],         min:0.3, max:1.5, fmt:v=>`+${v.toFixed(1)}s invuln after loot`},
  ];

  // ========= Stats meta =========
  const STAT_KEYS = [
    {k:"maxHP",     label:"Max HP",      icon:"❤️", fmt:v=>Math.round(v)},
    {k:"maxShield", label:"Max Shield",  icon:"🛡️", fmt:v=>Math.round(v)},
    {k:"dmg",       label:"Damage",      icon:"💥", fmt:v=>Math.round(v)},
    {k:"atkRate",   label:"Atk Rate",    icon:"💨", fmt:v=>`${v.toFixed(3)}s`},
    {k:"crit",      label:"Crit",        icon:"🎯", fmt:v=>`${Math.round(v*100)}%`},
    {k:"critDmg",   label:"Crit Dmg",    icon:"🩸", fmt:v=>`${Math.round(v*100)}%`},
    {k:"lifesteal", label:"Lifesteal",   icon:"🩸", fmt:v=>`${Math.round(v*100)}%`},
    {k:"pierce",    label:"Pierce",      icon:"📌", fmt:v=>Math.round(v)},
    {k:"splash",    label:"Splash",      icon:"🧨", fmt:v=>`${Math.round(v*100)}%`},
    {k:"moveSpeed", label:"Move Speed",  icon:"🦶", fmt:v=>Math.round(v)},
    {k:"pickup",    label:"Pickup",      icon:"🧲", fmt:v=>Math.round(v)},
    {k:"slowAura",  label:"Slow Aura",   icon:"🧊", fmt:v=>`${Math.round(v*100)}%`},
    {k:"thorns",    label:"Thorns",      icon:"🌵", fmt:v=>`${Math.round(v*100)}%`},
    {k:"shieldRegenPct", label:"Shield Regen", icon:"✨", fmt:v=>`${Math.round(v*100)}%`},
    {k:"xpGainPct", label:"XP Gain",     icon:"🧠", fmt:v=>`${Math.round(v*100)}%`},
    {k:"lootInvulnSec", label:"Loot invuln", icon:"✨", fmt:v=>`${(1+v).toFixed(1)}s`},
  ];

  // ========= State =========
  let running=false, paused=false, practice=false;

  // NEW: Hard-freeze game clock (elapsed time doesn't advance while paused/compare/menu)
  let gameTime = 0;        // seconds of active (unpaused) gameplay
  let tLast = 0;           // perf timestamp for dt

  const player = {
    x:0,y:0, vx:0,vy:0, r:BASE.playerR,
    hp:BASE.hp, maxHP:BASE.hp,
    shield:0, maxShield:0,
    shieldRegenPct:0,
    invuln:0,

    dmg:BASE.baseDmg,
    atkRate:BASE.baseAtk,
    crit:0.05,
    critDmg:1.6,
    lifesteal:0,
    pierce:0,
    splash:0,

    moveSpeed:BASE.speed,
    pickup:70,
    slowAura:0,
    thorns:0,
    xpGainPct:0,
    lootInvulnSec:0,

    dashT:0,
    dashCD:0,
    dashIx:0,
    dashIy:0,
    dashPending: false,
    lastDir: "front",
    lastShotUx: 0,
    lastShotUy: 0,

    xp:0,
    level:1,
    xpNeed:BASE.xpNeed,

    dpsEst:0,
    levelBonuses:{},
  };

  let equipped = {weapon:null, armor:null, ring1:null, ring2:null, jewel:null};

  let enemies=[], bullets=[], orbs=[], lootDrops=[], particles=[], levelUpRings=[];
  const MAX_LOOT_DROPS = 30;   // cap for long runs; remove oldest when exceeded
  const MAX_ORBS = 150;        // cap for long runs; remove oldest when exceeded
  // Level 1-1: welding interaction around manholes (similar to blood sampling)
  let level11WeldingZoneId = null;
  let level11WeldMs = 0;
  let kills=0, minibossKills=0, bossKills=0, lootCount=0, streak=0, streakT=0;
  let threat=1.0, spawnAcc=0, atkCD=0;
  let lootPickupCooldown=0;

  // Boss control (endless: mini-boss every minute, boss every 5 minutes)
  let minibossWarned=false, minibossSpawned=false, bossWarned=false, bossSpawned=false, bossKilled=false;
  let lastSpawnedBossMinute = -1;
  let lastSpawnedMinibossMinute = -1;
  let lastWarningWave = 0;
  let lastSpawnedMegaBoss = false;
  let lastMegaBossWarned = false;
  let roundEnd=false, victoryPhase=false;
  let victorySuckAt=0;   // when to start sucking loot/XP (now + 2s when last enemy dies)
  let suckActive=false;  // strong pull on orbs and loot toward player
  let extractionCountdown=null;
  let extractionLiftoff=null;
  const EXTRACTION_COUNTDOWN_SEC = 10;
  const EXTRACTION_IGNITION_DURATION = 0.55;
  const EXTRACTION_LIFTOFF_DURATION = 2.45;
  let extractionRocketParticles=[];
  let extractionTransition=null;
  let extractionSummaryData=null;
  let extractionFlameRing=null;
  let deathSequence=null;
  let tokensAtRunStart=0;
  let runLootByRarity={ common:0, uncommon:0, rare:0, legendary:0 };
  let runBloodMlByType={ common:0, uncommon:0, rare:0, legendary:0 };
  // Blood pools (from enemy kills): type from bloodTypes.js; runBloodMl = ml per blood type id (red, green, blue, …)
  let bloodPools = [];
  let runBloodMl = {};
  let gatheringPool = null;
  let gatheringStartT = 0;
  let gatheringAccumulatedMs = 0;
  const BLOOD_COAGULATE_SEC = 2;
  const BLOOD_GATHER_SEC = 2;
  const BLOOD_GATHER_RADIUS = 30;
  const BLOOD_POOL_MAX_AGE_SEC = 10;
  const BLOOD_POOL_REMOVE_AFTER_SEC = 20; // 10s to dark, then 10s more on board, then remove
  // Five red stages (light → almost black), 2s each over 10s; then coagulated (can't sample); remove after 20s
  const BLOOD_POOL_COLOR_STAGES = ["#f04444", "#c0392b", "#922b21", "#641e16", "#1a0505"];
  const BLOOD_POOL_CHANCE_NORMAL = 0.10;
  const BLOOD_POOL_CHANCE_ELITE = 0.35;

  // High score
  let hiBestTime = +localStorage.getItem("affixloot_best_time") || 0;
  let hiBestKills = +localStorage.getItem("affixloot_best_kills") || 0;

  // Level select: which level to play; which are unlocked (persisted)
  let selectedLevelId = "1-1";
  let unlockedLevels = (function(){
    try {
      const raw = localStorage.getItem("affixloot_unlocked_levels");
      if(!raw) return ["1-1"];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length ? arr : ["1-1"];
    } catch(e){ return ["1-1"]; }
  })();
  let currentLevelConfig = null; // set at run start from getLevelConfig(selectedLevelId)

  // 1st floor map: 4x viewport; center = fountain; doors at N/S/E/W edges; 6 manholes + mall props per run
  let mapW = 0, mapH = 0;
  let manholes = [];
  let mallProps = [];
  // Level 1-1 special scenario: manhole zones with clustered mice
  let level11Active = false;
  let level11Zones = [];          // { id, manholeIndex, corpseX, corpseY, corpseR, aggroR, activated, triggeredAt, minibossSpawned, spawnsStopped, spawnAcc, closed }
  let level11ZonesCleared = 0;    // how many manholes have been welded shut
  let level11Arrow = null;        // { targetX, targetY, t, life }
  let level11BossPhase = null;    // null | "warnDelay" | "warned" | "spawned"
  let level11BossPhaseMs = 0;
  let level11Kills = 0;           // non-boss kills on 1-1 for guaranteed weapon drop window
  let level11WeaponDropped = false;

  // Skittering Mouse sprites (2-frame animation: move1, move2)
  const skMouseSprites = {
    base: null,
    move1: null,
    move2: null,
    gape: null,
  };
  (function preloadSkitteringMouseSprites(){
    const sp = (name) => "assets/sprites/skittering-mouse/" + encodeURIComponent(name);
    skMouseSprites.base = new Image();
    skMouseSprites.base.src = sp("Skittering_Mouse1-removebg-preview.png");
    skMouseSprites.move1 = new Image();
    skMouseSprites.move1.src = sp("Skittering_Mouse1-removebg-preview.png");
    skMouseSprites.move2 = new Image();
    skMouseSprites.move2.src = sp("Skittering_mouse2-removebg-preview.png");
    skMouseSprites.gape = null;
  })();

  // Player sprites: front/back animasjon + idle når stå stille + extraction liftoff.
  const playerSprites = { front: [], back: [], frontIdle: null, backIdle: null, extraction: null };
  (function preloadPlayerSprites(){
    const base = "assets/sprites/Main_Character/";
    const enc = (name) => base + encodeURIComponent(name);
    const load = (path) => { const img = new Image(); img.src = path; return img; };
    playerSprites.front = [
      load(enc("Main_Character_Front1.png")),
      load(enc("Main_Character_Front2a.png"))
    ];
    playerSprites.back = [
      load(enc("Main_Character_Behind1.png")),
      load(enc("Main_Character_Behind2.png"))
    ];
    playerSprites.frontIdle = load(enc("Front_Idle.png"));
    playerSprites.backIdle = load(enc("Back_Idle.png"));
    // Extraction sprite: log load success/failure so we can debug asset issues easily.
    const extractionPath = enc("Character_extraction.png");
    const extractionImg = load(extractionPath);
    extractionImg.onload = () => {
      try {
        console.log("[BloodLoot] Extraction sprite loaded:", extractionImg.src, extractionImg.naturalWidth, extractionImg.naturalHeight);
      } catch {}
    };
    extractionImg.onerror = (err) => {
      try {
        console.error("[BloodLoot] Failed to load extraction sprite:", extractionImg.src, err);
      } catch {}
    };
    playerSprites.extraction = extractionImg;
  })();

  // One-time reset: bump version to clear all progression for a clean release.
  const AFFIXLOOT_STORAGE_VERSION = 2;
  (function resetProgressionIfNewVersion(){
    const key = "affixloot_storage_version";
    if(localStorage.getItem(key) === String(AFFIXLOOT_STORAGE_VERSION)) return;
    const toRemove = ["affixloot_tokens","affixloot_skill_levels","affixloot_skill_tree_purchased",QUEST_STORAGE_KEY,"affixloot_base_blood_ml","affixloot_unlocked_levels","affixloot_best_time","affixloot_best_kills"];
    for(const k of toRemove) try{ localStorage.removeItem(k); }catch(e){}
    try{ localStorage.setItem(key, String(AFFIXLOOT_STORAGE_VERSION)); }catch(e){}
  })();

  // Tutorial: first-time hints (persisted per id)
  const TUTORIAL_STORAGE_PREFIX = "affixloot_tutorial_";
  function getTutorialSeen(id){ try{ return localStorage.getItem(TUTORIAL_STORAGE_PREFIX + id) === "1"; }catch(e){ return false; } }
  function setTutorialSeen(id){ try{ localStorage.setItem(TUTORIAL_STORAGE_PREFIX + id, "1"); }catch(e){} }
  let tutorialOverlay = null;
  let tutorialCountdown = null;
  let tutorialCountdownEndT = 0;
  let tutorialBubbleEl = null;

  // Skill Upgrades: tokens (50 XP = 1 token, granted automatically during run)
  let tokens = Math.max(0, +(localStorage.getItem("affixloot_tokens") || 0));
  let skillLevels = (function(){
    try {
      const raw = localStorage.getItem("affixloot_skill_levels");
      if(!raw) return {};
      const o = JSON.parse(raw);
      return typeof o==="object" ? o : {};
    } catch(e){ return {}; }
  })();
  let skillTreePurchased = (function(){
    try {
      const raw = localStorage.getItem("affixloot_skill_tree_purchased");
      if(!raw) return {};
      const o = JSON.parse(raw);
      return typeof o==="object" ? o : {};
    } catch(e){ return {}; }
  })();
  let baseBloodMl = (function(){
    try {
      const raw = localStorage.getItem("affixloot_base_blood_ml");
      if(!raw) return {};
      const o = JSON.parse(raw);
      return typeof o==="object" ? o : {};
    } catch(e){ return {}; }
  })();
  const BLOOD_EXCHANGE_ML_PER_TOKEN = 50;
  let runTotalXp = 0;
  let tokenBarProgress = 0; // 0..1000, grant 1 token at 1000 then reset
  let tokenPops = []; // { x, y, t, life } world coords, drawn above player
  let pendingLoot=null;
  let inCompare=false;
  let compareSelectionIndex=0;  // 0 = left (keep current), 1 = right (equip new)
  let compareLeftCardRef=null, compareRightCardRef=null;

  // ========= NEW: Compare input gating + 1s lock =========
  const CHOOSE_KEYS = ["arrowleft","arrowright","a","d"]; // accept/keep
  let compareGateActive = false;
  let compareBlocked = new Set();     // keys held at open -> blocked until keyup
  let compareLockUntil = 0;           // 1s absolute time after open
  function beginCompareInputGate(){
    compareGateActive = true;
    compareBlocked = new Set();
    for(const k of CHOOSE_KEYS){
      if(keys.has(k)) compareBlocked.add(k);
    }
    compareLockUntil = now() + 1000; // 1 second where no new presses count
  }
  function endCompareInputGate(){
    compareGateActive = false;
    compareBlocked.clear();
    compareLockUntil = 0;
  }
  function handleCompareKeyUp(k){
    if(!compareGateActive) return;
    if(compareBlocked.has(k)) compareBlocked.delete(k);
  }
  addEventListener("keyup",(e)=>{
    const k=e.key.toLowerCase()===" " ? "space" : e.key.toLowerCase();
    handleCompareKeyUp(k);
  }, {passive:true});

  // ========= Item generation =========
  function rollRarity(){
    const r=Math.random();
    let acc=0;
    for(const [key,obj] of Object.entries(RAR)){
      acc += obj.w;
      if(r <= acc) return key;
    }
    return "common";
  }
  function affixCountFor(r){
    if(r==="common") return 0;
    if(r==="uncommon") return (Math.random()<0.50)?1:0;
    if(r==="rare") return 1 + (Math.random()<0.55?1:0);
    return 2 + (Math.random()<0.75?1:0) + (Math.random()<0.30?1:0);
  }
  function makeItem(type, rarity){
    const icon = pick(TYPE_ICONS[type]);
    const tier = rarity==="common"?1:rarity==="uncommon"?2:rarity==="rare"?3:4;
    const affCount = affixCountFor(rarity);

    const base = {};
    if(type==="weapon"){
      base.dmg = Math.round((7 + tier*4) * rand(0.95,1.18));
      base.atk = +( (0.40 - tier*0.05) * rand(0.92,1.06) ).toFixed(3);
    } else if(type==="armor"){
      base.shield = Math.round((7 + tier*8) * rand(0.95,1.20));
      base.hp = Math.round((0 + tier*5) * rand(0.90,1.18));
    } else if(type==="ring"){
      base.pickup = Math.round((10 + tier*9) * rand(0.90,1.15));
    } else if(type==="jewel"){
      base.xp = Math.round((3 + tier*4) * rand(0.90,1.18));
    }

    const pool = AFFIX_POOL.filter(a => a.kind.includes(type));
    const used=new Set();
    const affixes=[];
    for(let i=0;i<affCount;i++){
      let a=pick(pool), safe=0;
      while(used.has(a.id) && safe++<24) a=pick(pool);
      used.add(a.id);
      let v=randi(a.min,a.max);
      if(rarity==="rare") v=Math.round(v*1.10);
      if(rarity==="legendary") v=Math.round(v*1.25);
      affixes.push({id:a.id,name:a.name,icon:a.icon,value:v,text:a.fmt(v)});
    }

    const prefixes=["Sturdy","Glinting","Razor","Ancient","Swift","Grim","Blessed","Arcane","Storm","Frost","Ember","Umbral","Gilded"];
    const suffixes=["of Sparks","of the Viper","of Dawn","of the Forge","of Echoes","of Hunger","of Resolve","of Velocity","of Mirrors","of Kings"];
    const core = type==="weapon" ? pick(["Edge","Blade","Bow","Cannon","Spear","Axe"])
              : type==="armor"  ? pick(["Guard","Plate","Vest","Ward","Helm","Shell"])
              : type==="ring"   ? pick(["Band","Seal","Signet","Loop","Ring"])
              : pick(["Gem","Shard","Prism","Orb","Eye"]);
    let name = core;
    if(rarity!=="common"){
      name = `${pick(prefixes)} ${core}`;
      if(rarity==="rare" || rarity==="legendary") name += ` ${pick(suffixes)}`;
    }
    return { type, rarity, tier, icon, name, base, affixes };
  }

  /** Tier from item (1–4). Used for scrap value and balance; items store tier at creation. */
  function getItemTier(it) {
    if (!it) return 1;
    if (it.tier != null && it.tier >= 1 && it.tier <= 4) return it.tier;
    return it.rarity === "common" ? 1 : it.rarity === "uncommon" ? 2 : it.rarity === "rare" ? 3 : 4;
  }

  function itemScore(it){
    if(!it) return -999;
    const tier = getItemTier(it);
    return tier*10 + it.affixes.length*3 + (it.base?.dmg||0)*0.12 + (it.base?.shield||0)*0.06 + (it.base?.pickup||0)*0.05 + (it.base?.xp||0)*0.20;
  }
  function slotForType(type){
    if(type==="weapon") return "weapon";
    if(type==="armor") return "armor";
    if(type==="jewel") return "jewel";
    if(type==="ring"){
      if(!equipped.ring1) return "ring1";
      if(!equipped.ring2) return "ring2";
      const s1=itemScore(equipped.ring1), s2=itemScore(equipped.ring2);
      return (s1<=s2) ? "ring1" : "ring2";
    }
    return "weapon";
  }

  // ========= Build computation =========
  function getPermanentBonuses(){
    const pb = {};
    const valPerLevel = (id, L)=>(id==="lootInvuln" ? L*0.2 : L);
    for(const a of AFFIX_POOL){
      const L = skillLevels[a.id]||0;
      if(L<=0) continue;
      pb[a.id] = valPerLevel(a.id, L);
    }
    return pb;
  }
  function computeStats(eq){
    const s = {
      maxHP: BASE.hp,
      maxShield: 0,
      shieldRegenPct: 0,

      dmg: BASE.baseDmg,
      atkRate: BASE.baseAtk,
      crit: 0.05,
      critDmg: 1.6,
      lifesteal: 0,
      pierce: 0,
      splash: 0,

      moveSpeed: BASE.speed,
      pickup: 70,
      slowAura: 0,
      thorns: 0,
      xpGainPct: 0,
      lootInvulnSec: 0,
    };

    if(eq.weapon){
      s.dmg += (eq.weapon.base?.dmg||0);
      const atk = eq.weapon.base?.atk ?? 0.38;
      s.atkRate = Math.max(0.11, s.atkRate * (atk/0.38));
    }
    if(eq.armor){
      s.maxShield += (eq.armor.base?.shield||0);
      s.maxHP += (eq.armor.base?.hp||0);
    }
    if(eq.ring1) s.pickup += (eq.ring1.base?.pickup||0);
    if(eq.ring2) s.pickup += (eq.ring2.base?.pickup||0);
    if(eq.jewel) s.xpGainPct += (eq.jewel.base?.xp||0)/100;

    let dmgPct=0, asPct=0, msPct=0, regenPct=0, critAdd=0, critDmgPct=0;
    let splashPct=0, lsPct=0, slowPct=0, thornsPct=0, xpPct=0;
    let hpFlat=0, shieldFlat=0, pickupFlat=0, pierceAdd=0, lootInvulnSec=0;

    const lb=player.levelBonuses||{};
    dmgPct+=lb.dmgPct||0; asPct+=lb.asPct||0; msPct+=lb.msPct||0; regenPct+=lb.regenPct||0;
    critAdd+=(lb.critPct||0)/100; critDmgPct+=(lb.critDmg||0)/100; splashPct+=(lb.splash||0)/100;
    lsPct+=(lb.lifesteal||0)/100; slowPct+=(lb.slowAura||0)/100; thornsPct+=(lb.thorns||0)/100;
    xpPct+=(lb.xpGain||0)/100;

    const pb=getPermanentBonuses();
    dmgPct+=pb.dmgPct||0; asPct+=pb.asPct||0; msPct+=pb.msPct||0; regenPct+=pb.regenPct||0;
    critAdd+=(pb.critPct||0)/100; critDmgPct+=(pb.critDmg||0)/100; splashPct+=(pb.splash||0)/100;
    lsPct+=(pb.lifesteal||0)/100; slowPct+=(pb.slowAura||0)/100; thornsPct+=(pb.thorns||0)/100;
    xpPct+=(pb.xpGain||0)/100;
    hpFlat+=pb.hpFlat||0; shieldFlat+=pb.shieldFlat||0; pickupFlat+=pb.pickup||0;
    pierceAdd+=pb.pierce||0; lootInvulnSec+=pb.lootInvuln||0;

    const items=[eq.weapon,eq.armor,eq.ring1,eq.ring2,eq.jewel].filter(Boolean);
    for(const it of items){
      for(const a of it.affixes){
        switch(a.id){
          case "dmgPct": case "fury": case "brawler": dmgPct += a.value; break;
          case "asPct": case "quickdraw": case "swiftstrike": asPct += a.value; break;
          case "msPct": case "sprint": msPct += a.value; break;
          case "regenPct": case "mend": regenPct += a.value; break;
          case "critPct": case "precision": case "fatal": critAdd += a.value/100; break;
          case "critDmg": case "execution": case "savage": critDmgPct += a.value/100; break;
          case "splash": case "chain": splashPct += a.value/100; break;
          case "lifesteal": case "vampiric": lsPct += a.value/100; break;
          case "slowAura": case "chill": slowPct += a.value/100; break;
          case "thorns": case "spikes": thornsPct += a.value/100; break;
          case "xpGain": case "insight": xpPct += a.value/100; break;
          case "hpFlat": case "vigor": case "toughness": hpFlat += a.value; break;
          case "shieldFlat": case "bastion": shieldFlat += a.value; break;
          case "pickup": case "draw": pickupFlat += a.value; break;
          case "pierce": case "puncture": pierceAdd += a.value; break;
          case "lootInvuln": case "safety": lootInvulnSec += a.value; break;
        }
      }
    }

    s.maxHP += hpFlat;
    s.maxShield += shieldFlat;
    s.shieldRegenPct += regenPct/100;

    s.dmg = Math.round(s.dmg * (1 + dmgPct/100));
    s.atkRate = Math.max(0.11, s.atkRate * (1 - asPct/100));
    s.moveSpeed = s.moveSpeed * (1 + msPct/100);
    s.pickup += pickupFlat;

    s.crit += critAdd;
    s.critDmg = s.critDmg * (1 + critDmgPct);
    s.splash += splashPct;
    s.lifesteal += lsPct;
    s.slowAura += slowPct;
    s.thorns += thornsPct;
    s.pierce += pierceAdd;

    s.xpGainPct += xpPct;
    s.xpGainPct = Math.max(0, s.xpGainPct);
    s.lootInvulnSec = Math.min(2, lootInvulnSec);
    return s;
  }
  function estimateDPS(s){
    const avgCrit = (1-s.crit)*1 + s.crit*s.critDmg;
    return (s.dmg*avgCrit)/s.atkRate;
  }
  function applyStatsToPlayer(s){
    const prevMaxHP=player.maxHP, prevMaxSh=player.maxShield;
    player.maxHP=s.maxHP;
    player.maxShield=s.maxShield;
    player.shieldRegenPct=s.shieldRegenPct;

    player.dmg=s.dmg;
    player.atkRate=s.atkRate;
    player.crit=s.crit;
    player.critDmg=s.critDmg;
    player.lifesteal=s.lifesteal;
    player.pierce=s.pierce;
    player.splash=s.splash;

    player.moveSpeed=s.moveSpeed;
    player.pickup=s.pickup;
    player.slowAura=s.slowAura;
    player.thorns=s.thorns;
    player.xpGainPct=s.xpGainPct;
    player.lootInvulnSec=s.lootInvulnSec;
    player.lootInvulnSec=s.lootInvulnSec;

    if(prevMaxHP>0){
      const pct=clamp(player.hp/prevMaxHP,0,1);
      player.hp=clamp(pct*player.maxHP,1,player.maxHP);
    } else player.hp=clamp(player.hp,1,player.maxHP);

    if(prevMaxSh>0){
      const pct=clamp(player.shield/prevMaxSh,0,1);
      player.shield=clamp(pct*player.maxShield,0,player.maxShield);
    } else player.shield=player.maxShield; // starting shield 100%

    player.dpsEst=estimateDPS(s);
  }
  function recomputeBuild(){ applyStatsToPlayer(computeStats(equipped)); }

  // ========= Equipment UI helpers =========
  function previewItem(slotKey){
    const map={weapon:"weapon",armor:"armor",ring1:"ring",ring2:"ring",jewel:"jewel"};
    const type=map[slotKey]||"weapon";
    if(type==="weapon"){
      // Default starting weapon label when nothing is equipped
      return {type:"weapon",rarity:"common",icon:"🔫",name:"Gun",base:{},affixes:[]};
    }
    if(type==="armor"){
      // Default starting armor label when nothing is equipped
      return {type:"armor",rarity:"common",icon:"👗",name:"Dress",base:{},affixes:[]};
    }
    const icon = type==="ring"?"💍":"💎";
    return {type,rarity:"common",icon,name:"(empty)",base:{},affixes:[]};
  }
  function renderMini(label,slotKey,item){
    const it=item||previewItem(slotKey);
    const c=item ? RAR[it.rarity].color : "rgba(255,255,255,.5)";
    const wrap=document.createElement("div");
    wrap.className="slotMini";
    wrap.innerHTML=`
      <div class="iconMini" style="border-color:${c}66; box-shadow: 0 0 0 1px rgba(255,255,255,.04), 0 0 26px ${c}30;">${it.icon}</div>
      <div class="slotMiniMain">
        <div class="slotMiniTitle"><span>${label}</span><span class="mono" style="color:${c};">${item?rarityLabel(it.rarity):"—"}</span></div>
        <div class="slotMiniSub" title="${it.name}">${it.name}${it.affixes?.length?` • ${it.affixes.length} affix`:``}</div>
      </div>
    `;
    return wrap;
  }
  function renderEquipMini(){
    equipMini.innerHTML="";
    equipMini.appendChild(renderMini("Weapon","weapon",equipped.weapon));
    equipMini.appendChild(renderMini("Armor","armor",equipped.armor));
    equipMini.appendChild(renderMini("Ring 1","ring1",equipped.ring1));
    equipMini.appendChild(renderMini("Ring 2","ring2",equipped.ring2));
    equipMini.appendChild(renderMini("Jewel","jewel",equipped.jewel));
  }

  // ========= Toast =========
  function showLevelUpToast(affixName, valuePct){
    const div=document.createElement("div");
    div.className="toastItem";
    const c=cssVar("--xp");
    div.innerHTML=`
      <div style="display:flex; align-items:center; gap:10px; min-width:0;">
        <div style="width:38px;height:38px;border-radius:14px;display:flex;align-items:center;justify-content:center;border:1px solid ${c}66;background:rgba(0,0,0,.2);font-size:20px;">⬆️</div>
        <div style="min-width:0;">
          <div style="font-weight:950; color:${c};">LVL UP</div>
          <div style="font-size:12px;color:rgba(234,242,255,.85);">${affixName} +${valuePct}%</div>
        </div>
      </div>
    `;
    toast.prepend(div);
    setTimeout(()=>div.remove(), 2800);
  }
  function showComingSoonPopup(){
    const overlay = document.getElementById("overlay");
    const wrap = document.createElement("div");
    wrap.className = "comingSoonPopup";
    wrap.innerHTML = `
      <div class="comingSoonPopupCard">
        <h3>Coming Soon</h3>
        <button type="button" class="comingSoonBtn">OK</button>
      </div>
    `;
    wrap.querySelector(".comingSoonBtn").onclick = () => wrap.remove();
    wrap.onclick = (e) => { if (e.target === wrap) wrap.remove(); };
    overlay.appendChild(wrap);
  }
  function showSimpleToast(message){
    const div=document.createElement("div");
    div.className="toastItem";
    div.innerHTML=`
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-weight:950; color:rgba(234,242,255,.9);">${String(message)}</span>
      </div>
    `;
    toast.prepend(div);
    setTimeout(()=>div.remove(), 2500);
  }

  function showTutorial(id, text, worldX, worldY){
    if(getTutorialSeen(id)) return;
    if(tutorialOverlay !== null) return;
    tutorialOverlay = { id, text, focusX: worldX, focusY: worldY };
    paused = true;
    if(tutorialBubbleEl && tutorialBubbleEl.parentNode) tutorialBubbleEl.remove();
    const wrap = document.createElement("div");
    wrap.id = "tutorialOverlayWrap";
    const camOffsetX = W*0.5 - player.x;
    const camOffsetY = H*0.5 - player.y;
    const screenFocusX = camOffsetX + worldX;
    const screenFocusY = camOffsetY + worldY;
    const focusInTopHalf = screenFocusY < H*0.5;
    const bubbleAtTop = focusInTopHalf;
    wrap.style.cssText = bubbleAtTop
      ? "position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding-bottom:min(80px,12vh);pointer-events:auto;"
      : "position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding-top:min(80px,12vh);pointer-events:auto;";
    const bubble = document.createElement("div");
    bubble.style.cssText = "background:#111;border:3px solid #fff;color:#fff;padding:20px 24px;border-radius:12px;max-width:min(420px,90vw);box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',ui-sans-serif,sans-serif;";
    bubble.innerHTML = `
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;font-family:inherit;">${text}</p>
      <button type="button" id="tutorialGotIt" style="display:block;margin:0 auto;padding:10px 24px;font-size:14px;font-weight:800;background:#333;color:#fff;border:2px solid #fff;border-radius:8px;cursor:pointer;font-family:inherit;letter-spacing:.6px;text-transform:uppercase;">Got it (E)</button>
    `;
    wrap.appendChild(bubble);
    tutorialBubbleEl = wrap;
    document.body.appendChild(wrap);
    const btn = wrap.querySelector("#tutorialGotIt");
    if(btn){
      const onKey = (ev) => {
        const k = ev.key || "";
        if(k === "e" || k === "E"){
          if(ev.repeat) return;
          ev.preventDefault();
          btn.click();
        }
      };
      addEventListener("keydown", onKey);
      btn.onclick = () => {
        removeEventListener("keydown", onKey);
        if(wrap.parentNode) wrap.remove();
        if(tutorialOverlay){ setTutorialSeen(tutorialOverlay.id); tutorialOverlay = null; }
        tutorialBubbleEl = null;
        tutorialCountdown = 3;
        tutorialCountdownEndT = now() + 1;
      };
    }
  }

  function showExtractionSummary(data){
    if(!data) return;
    const overlay = document.getElementById("overlay");
    const bloodOrder = ["common","uncommon","rare","legendary"];
    const bloodRows = bloodOrder.filter(t=>(data.bloodMlByType[t]||0)>0).map(t=>{
      const label = RAR[t]?.name || t;
      const color = RAR[t]?.color || "rgba(255,255,255,.8)";
      return `<div class="extractionSummaryRow" style="border-left-color:${color}"><span>${label}</span><span class="mono">${data.bloodMlByType[t]} ml</span></div>`;
    }).join("");
    const runBlood = data.runBloodMl || {};
    const runBloodEntries = Object.keys(runBlood).filter(id=>(runBlood[id]|0)>0).map(id=>{
      const bt = (typeof window.getBloodType==="function" && window.getBloodType(id)) || { name: id, color: "#c0392b" };
      return `<div class="extractionSummaryRow" style="border-left-color:${bt.color||"#c0392b"}"><span>${bt.name} (samples)</span><span class="mono">${runBlood[id]} ml → lab</span></div>`;
    }).join("");
    const lootRows = bloodOrder.filter(t=>(data.lootByRarity[t]||0)>0).map(t=>{
      const label = RAR[t]?.name || t;
      const color = RAR[t]?.color || "rgba(255,255,255,.8)";
      return `<div class="extractionSummaryRow" style="border-left-color:${color}"><span>${label}</span><span class="mono">×${data.lootByRarity[t]}</span></div>`;
    }).join("");
    const wrap = document.createElement("div");
    wrap.className = "extractionSummaryOverlay";
    wrap.innerHTML = `
      <div class="extractionSummaryCard">
        <h2 class="extractionSummaryTitle">Run summary</h2>
        <div class="extractionSummarySection">
          <div class="extractionSummarySectionTitle">Tokens earned</div>
          <div class="extractionSummaryBig">${data.tokensEarned||0}</div>
        </div>
        <div class="extractionSummarySection">
          <div class="extractionSummarySectionTitle">Loot (by rarity)</div>
          <div class="extractionSummaryRows">${lootRows || "<div class=\"extractionSummaryRow\"><span>—</span><span>None</span></div>"}</div>
        </div>
        <div class="extractionSummarySection">
          <div class="extractionSummarySectionTitle">Blood (ml, by type)</div>
          <div class="extractionSummaryRows">${bloodRows || "<div class=\"extractionSummaryRow\"><span>—</span><span>None</span></div>"}</div>
        </div>
        ${runBloodEntries ? `<div class="extractionSummarySection"><div class="extractionSummarySectionTitle">Blood samples → Lab</div><div class="extractionSummaryRows">${runBloodEntries}</div></div>` : ""}
        <button type="button" class="extractionSummaryBack">Back</button>
      </div>
    `;
    wrap.querySelector(".extractionSummaryBack").onclick = () => wrap.remove();
    overlay.appendChild(wrap);
  }
  function showToast(it, textOverride=null){
    const c = RAR[it.rarity]?.color || "rgba(255,255,255,.6)";
    const div=document.createElement("div");
    div.className="toastItem";
    const aff = it.affixes?.length ? it.affixes.map(a=>`${a.icon} ${a.text}`).join(" • ") : "—";
    div.innerHTML=`
      <div style="display:flex; align-items:center; gap:10px; min-width:0;">
        <div style="width:38px;height:38px;border-radius:14px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.12);background: rgba(255,255,255,.06);font-size:20px;box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 0 26px ${c}30;">${it.icon}</div>
        <div style="min-width:0;">
          <div style="font-weight:950; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:${c};">${textOverride ?? it.name}</div>
          <div style="font-size:12px;color:rgba(234,242,255,.70); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${it.type.toUpperCase()} • ${aff}</div>
        </div>
      </div>
      <div style="font-weight:950;padding:6px 10px;border-radius:999px;border:1px solid ${c}66;background: rgba(0,0,0,.22);font-size:12px;letter-spacing:.6px;color:${c};">${rarityLabel(it.rarity)}</div>
    `;
    toast.prepend(div);
    setTimeout(()=>div.remove(), 3000);
  }

  // ========= Compare UI =========
  function baseLineFor(it){
    if(it.type==="weapon"){
      const d=it.base?.dmg||0;
      const a=it.base?.atk ?? 0.38;
      return `Base: +${d} dmg • ${a.toFixed(2)} atk`;
    }
    if(it.type==="armor"){
      const sh=it.base?.shield||0;
      const hp=it.base?.hp||0;
      return `Base: +${sh} shield • +${hp} HP`;
    }
    if(it.type==="ring"){
      const p=it.base?.pickup||0;
      return `Base: +${p} pickup`;
    }
    if(it.type==="jewel"){
      const x=it.base?.xp||0;
      return `Base: +${x}% XP gain`;
    }
    return "Base: —";
  }
  function renderCompareCard(item, slotKey, header, statDiffs, isSelected){
    const wrap=document.createElement("div");
    wrap.className="compareCard" + (isSelected ? " compareSelected" : " compareBlur");
    const it=item||previewItem(slotKey);
    const c=item ? RAR[it.rarity].color : "rgba(255,255,255,.55)";
    const rarTxt=item ? rarityLabel(it.rarity) : "—";
    const baseLine = baseLineFor(it);
    const affHTML = it.affixes?.length
      ? it.affixes.map(a=>`<span class="pill">${a.icon} ${a.text}</span>`).join("")
      : `<span class="pill" style="opacity:.6;">No affixes</span>`;

    let diffHTML = "";
    if(statDiffs && statDiffs.length){
      diffHTML = '<div class="cmpDiffs">' + statDiffs.map(d=>{
        const cls = d.good ? "cmpDiffGood" : "cmpDiffBad";
        return `<div class="cmpDiffLine ${cls}">${d.label} ${d.fmt}</div>`;
      }).join("") + "</div>";
    }

    wrap.innerHTML=`
      <div class="cmpTop">
        <div class="cmpName">${header}</div>
        <div class="cmpRar" style="color:${c}; border-color:${c}66;">${rarTxt}</div>
      </div>
      <div class="cmpMain">
        <div class="cmpIcon" style="border-color:${c}66; box-shadow: 0 0 0 1px rgba(255,255,255,.04), 0 0 34px ${c}35;">${it.icon}</div>
        <div class="cmpText">
          <div style="font-weight:1000; color:${c}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${it.name}</div>
          <div class="cmpLine">${it.type.toUpperCase()} • ${baseLine}</div>
          <div class="pillRow">${affHTML}</div>
          ${diffHTML}
        </div>
      </div>
    `;
    return wrap;
  }
  function getStatDiffs(sA, sB){
    const lowerBetter=new Set(["atkRate"]);
    const rows=[];
    const fmtDelta=(meta, d)=>{
      if(meta.k==="atkRate") return (d>0?"+":"")+d.toFixed(2).replace(".",",")+"s";
      if(meta.k==="lootInvulnSec") return (d>0?"+":"")+d.toFixed(1).replace(".",",")+"s";
      if(["crit","lifesteal","slowAura","thorns","shieldRegenPct","xpGainPct"].includes(meta.k)) return (d>0?"+":"")+Math.round(d*100)+"%";
      if(meta.k==="critDmg"||meta.k==="splash") return (d>0?"+":"")+Math.round(d*100)+"%";
      return (d>0?"+":"")+Math.round(d);
    };
    for(const meta of STAT_KEYS){
      const a=sA[meta.k], b=sB[meta.k];
      const d=b-a;
      if(Math.abs(d)<1e-9) continue;
      const goodForB = lowerBetter.has(meta.k) ? (d<0) : (d>0);
      rows.push({
        meta,
        label: meta.icon+" "+meta.label,
        deltaA: a-b,
        deltaB: d,
        fmtA: fmtDelta(meta, a-b),
        fmtB: fmtDelta(meta, d),
        goodA: lowerBetter.has(meta.k) ? (a-b<0) : (a-b>0),
        goodB: goodForB
      });
    }
    const dpsA=estimateDPS(sA), dpsB=estimateDPS(sB), dd=dpsB-dpsA;
    if(Math.abs(dd)>=1e-6){
      rows.push({
        meta: {k:"dps", label:"DPS (est.)", icon:"⚔️"},
        label: "⚔️ DPS (est.)",
        deltaA: dpsA-dpsB,
        deltaB: dd,
        fmtA: (dpsA-dpsB>0?"+":"")+Math.round(dpsA-dpsB),
        fmtB: (dd>0?"+":"")+Math.round(dd),
        goodA: dpsA>dpsB,
        goodB: dd>0
      });
    }
    return rows;
  }
  function renderStatsTable(sA,sB){
    const wrap=document.createElement("div");
    wrap.className="statsTable";

    const head=document.createElement("div");
    head.className="statsRow header";
    head.innerHTML=`
      <div class="cell">Stat</div>
      <div class="cell right">Current</div>
      <div class="cell right">New</div>
      <div class="cell right">Δ</div>
    `;
    wrap.appendChild(head);

    const lowerBetter=new Set(["atkRate"]);
    for(const meta of STAT_KEYS){
      const a=sA[meta.k], b=sB[meta.k];
      const d=b-a;
      let cls="neutral", sign="";
      if(Math.abs(d) >= 1e-9){
        const good = lowerBetter.has(meta.k) ? (d<0) : (d>0);
        cls = good ? "good" : "bad";
        sign = d>0 ? "+" : "";
      }
      let deltaTxt="";
      if(meta.k==="atkRate") deltaTxt = `${sign}${d.toFixed(3)}s`;
      else if(["crit","lifesteal","slowAura","thorns","shieldRegenPct","xpGainPct"].includes(meta.k)) deltaTxt = `${sign}${Math.round(d*100)}%`;
      else if(meta.k==="critDmg" || meta.k==="splash") deltaTxt = `${sign}${Math.round(d*100)}%`;
      else deltaTxt = `${sign}${Math.round(d)}`;

      const row=document.createElement("div");
      row.className="statsRow";
      row.innerHTML=`
        <div class="cell">${meta.icon} ${meta.label}</div>
        <div class="cell right">${meta.fmt(a)}</div>
        <div class="cell right">${meta.fmt(b)}</div>
        <div class="cell right"><span class="delta ${cls}">${deltaTxt}</span></div>
      `;
      wrap.appendChild(row);
    }
    const dpsA=estimateDPS(sA), dpsB=estimateDPS(sB), dd=dpsB-dpsA;
    const dpsCls = Math.abs(dd)<1e-6 ? "neutral" : (dd>0 ? "good" : "bad");
    const dpsRow=document.createElement("div");
    dpsRow.className="statsRow";
    dpsRow.innerHTML=`
      <div class="cell">⚔️ DPS (est.)</div>
      <div class="cell right">${Math.round(dpsA)}</div>
      <div class="cell right">${Math.round(dpsB)}</div>
      <div class="cell right"><span class="delta ${dpsCls}">${dd>0?"+":""}${Math.round(dd)}</span></div>
    `;
    wrap.appendChild(dpsRow);
    return wrap;
  }

  function showCompareUI(){
    const {slotKey, currentItem, newItem} = pendingLoot;
    overlay.classList.remove("hidden");
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent = "Loot — use arrow keys to choose";
    ovSub.innerHTML = `←/→ select box • <span class="keycap">E</span> or <span class="keycap">Space</span> confirm`;

    ovBtns.innerHTML="";

    const eqA={...equipped};
    const eqB={...equipped};
    eqB[slotKey]=newItem;
    const sA=computeStats(eqA);
    const sB=computeStats(eqB);
    const diffs=getStatDiffs(sA,sB);
    const leftDiffs=diffs.map(d=>({ label: d.label, fmt: d.fmtA, good: d.goodA }));
    const rightDiffs=diffs.map(d=>({ label: d.label, fmt: d.fmtB, good: d.goodB }));

    compareSelectionIndex=0;
    ovBody.innerHTML="";
    const grid=document.createElement("div");
    grid.className="ovGrid ovGridCompare";
    compareLeftCardRef=renderCompareCard(currentItem,slotKey,"Current (left)",leftDiffs, true);
    compareRightCardRef=renderCompareCard(newItem,slotKey,"New (right)",rightDiffs, false);
    grid.appendChild(compareLeftCardRef);
    grid.appendChild(compareRightCardRef);
    ovBody.appendChild(grid);

    beginCompareInputGate();
  }
  function updateCompareSelection(){
    if(!compareLeftCardRef || !compareRightCardRef) return;
    compareLeftCardRef.classList.toggle("compareSelected", compareSelectionIndex===0);
    compareLeftCardRef.classList.toggle("compareBlur", compareSelectionIndex!==0);
    compareRightCardRef.classList.toggle("compareSelected", compareSelectionIndex===1);
    compareRightCardRef.classList.toggle("compareBlur", compareSelectionIndex!==1);
  }

  function beepLoot(r){
    if(r==="common") beep({freq:520, dur:0.05, type:"triangle", gain:0.035});
    if(r==="uncommon"){beep({freq:660,dur:0.05,type:"sine",gain:0.045}); beep({freq:990,dur:0.06,type:"sine",gain:0.04, slide:0.75});}
    if(r==="rare"){beep({freq:740,dur:0.06,type:"square",gain:0.05}); beep({freq:1110,dur:0.08,type:"triangle",gain:0.05});}
    if(r==="legendary"){powerUpLegendary();}
  }

  function acceptCompare(equipNew, discardNew=false){
    const idx=lootDrops.indexOf(pendingLoot.drop);
    if(idx>=0) lootDrops.splice(idx,1);

    if(equipNew){
      const it=pendingLoot.newItem;
      equipped[pendingLoot.slotKey]=it;
      lootCount++;
      runLootByRarity[it.rarity]=(runLootByRarity[it.rarity]||0)+1;
      recomputeBuild();
      renderEquipMini();
      showToast(it);
      if(it.rarity==="legendary"){ spawnLegendaryBurst(player.x,player.y,false); powerUpLegendary(); }
      else beepLoot(it.rarity);
    } else {
      if(!discardNew) beep({freq:420,dur:0.05,type:"sine",gain:0.03});
    }

    // Always grant full invuln after confirming (equip or discard), so we don't get one-shot in a pile of loot
    const invulnDur = Math.min(3, 1 + (player.lootInvulnSec || 0));
    player.invuln = Math.max(player.invuln, invulnDur);

    lootPickupCooldown = 0;

    pendingLoot=null;
    inCompare=false;
    compareLeftCardRef=null;
    compareRightCardRef=null;
    overlay.classList.add("hidden");
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
    paused=false;
    if(runMusic && musicVol>0){ applyMusicVolume(); runMusic.play().catch(()=>{}); }

    endCompareInputGate();
  }

  // ========= Drops / XP =========
  // Blood drop rules (B2): use getBloodTypesForLevel(currentLevelConfig.id) / getRandomBloodTypeForLevel(currentLevelConfig.id).
  function dropXP(x,y, elite=false, boss=false){
    const n = boss ? randi(6,10) : elite ? randi(3,5) : randi(1,2);
    for(let i=0;i<n;i++){
      orbs.push({ x:x+rand(-10,10)*DPR, y:y+rand(-10,10)*DPR, r:(boss?7:elite?6:4)*DPR, vx:rand(-20,20)*DPR, vy:rand(-20,20)*DPR });
    }
    while(orbs.length > MAX_ORBS) orbs.shift();
    showTutorial("xp_orb", "XP orbs grant experience. Collect them to level up and become stronger.", x, y);
  }
  function dropLoot(x,y, elite=false, boss=false, miniboss=false){
    const rawP = boss && !miniboss ? 0.72 : miniboss ? 0.52 : elite ? BASE.lootDropElite : BASE.lootDropBase;
    let p = rawP * 0.20 * 1.20;
    if(Math.random()>p) return;

    const roll=Math.random();
    const type = roll<0.44 ? "weapon" : roll<0.80 ? "armor" : roll<0.93 ? "ring" : "jewel";

    let rarity = rollRarity();
    const bump = boss && !miniboss ? 0.82 : miniboss ? 0.62 : elite ? 0.45 : 0;
    if(bump>0){
      if(rarity==="common" && Math.random()<0.65*bump) rarity="uncommon";
      if(rarity==="uncommon" && Math.random()<0.32*bump) rarity="rare";
      if(rarity==="rare" && Math.random()<0.14*bump) rarity="legendary";
    }
    // 1-1: drops never higher than rare
    const levelId = currentLevelConfig ? currentLevelConfig.id : "1-1";
    if(levelId === "1-1" && rarity === "legendary") rarity = "rare";
    const item=makeItem(type,rarity);
    const dropX = x+rand(-14,14)*DPR, dropY = y+rand(-14,14)*DPR;
    lootDrops.push({ x:dropX, y:dropY, r:12*DPR, item, t:0, bob:rand(0,Math.PI*2) });
    while(lootDrops.length > MAX_LOOT_DROPS) lootDrops.shift();

    showTutorial("item_drop", "Items drop from defeated enemies. Walk over them to pick up and compare with your current gear.", dropX, dropY);

    // Track guaranteed weapon drop window for level 1-1
    if(levelId === "1-1" && !level11WeaponDropped && item.type === "weapon" && level11Kills <= 10){
      level11WeaponDropped = true;
    }
  }

  function dropGuaranteedWeaponLevel11(x,y){
    const levelId = currentLevelConfig ? currentLevelConfig.id : "1-1";
    let rarity = rollRarity();
    if(levelId === "1-1" && rarity === "legendary") rarity = "rare";
    const item = makeItem("weapon", rarity);
    lootDrops.push({ x:x+rand(-14,14)*DPR, y:y+rand(-14,14)*DPR, r:12*DPR, item, t:0, bob:rand(0,Math.PI*2) });
    while(lootDrops.length > MAX_LOOT_DROPS) lootDrops.shift();
    level11WeaponDropped = true;
  }

  function getMinMobHP(){
    return 18 + Math.floor(gameTime/120);
  }
  function spawnTokenGlimpse(x, y){
    tokenPops.push({ x, y, t: 0, life: 0.9 });
  }
  function coinSound(){
    beep({freq: 988, dur: 0.06, type: "triangle", gain: 0.07 });
    beep({freq: 1319, dur: 0.10, type: "triangle", gain: 0.055, slide: 0.85 });
  }
  function gainXP(amount){
    const mul = 1 + player.xpGainPct;
    const added = amount * mul;
    player.xp += added;
    runTotalXp += added;
    tokenBarProgress += added;
    while(tokenBarProgress >= 1000){
      tokens += 1;
      localStorage.setItem("affixloot_tokens", String(tokens));
      coinSound();
      spawnTokenGlimpse(player.x, player.y);
      tokenBarProgress -= 1000;
    }
    while(player.xp >= player.xpNeed){
      player.xp -= player.xpNeed;
      player.level++;
      const isLevel11 = currentLevelConfig && currentLevelConfig.id === "1-1";
      if(isLevel11){
        // Level 1-1: faster early level-ups (especially 2 and 3)
        if(player.level === 2) player.xpNeed = 26;       // was ~30
        else if(player.level === 3) player.xpNeed = 36;  // was ~43
        else player.xpNeed = Math.round(player.xpNeed*1.22 + 6);
      } else {
        player.xpNeed = Math.round(player.xpNeed*1.22 + 6);
      }
      beep({freq: 920, dur:0.09, type:"triangle", gain:0.06});
      player.maxHP += 6; player.hp += 6;

      const levelAffixPool = AFFIX_POOL.filter(a=>["dmgPct","asPct","critPct","critDmg","lifesteal","splash","regenPct","msPct","slowAura","thorns","xpGain"].includes(a.id));
      const chosen = pick(levelAffixPool);
      const value = +(rand(0.1,0.5)).toFixed(1);
      player.levelBonuses[chosen.id] = (player.levelBonuses[chosen.id]||0) + value;

      showLevelUpToast(chosen.name, value);
      spawnLevelUpRing(player.x, player.y);
      levelUpExplosionSound();
      splashDamage(player.x, player.y, getMinMobHP(), true, 600*DPR);

      player.dpsEst = estimateDPS(computeStats(equipped));
      recomputeBuild();
    }
  }

  // ========= Enemies & Boss =========
  function getRandomSpawnPoint(){
    const doorInset = 40 * DPR;
    const jitter = 15 * DPR;
    const total = 4 + (manholes.length || 0);
    const pick = (Math.random() * total) | 0;
    if (pick < 4) {
      if(pick===0) return { x: mapW/2 + rand(-jitter,jitter), y: doorInset + 8*DPR };
      if(pick===1) return { x: mapW/2 + rand(-jitter,jitter), y: mapH - doorInset - 8*DPR };
      if(pick===2) return { x: doorInset + 8*DPR, y: mapH/2 + rand(-jitter,jitter) };
      return { x: mapW - doorInset - 8*DPR, y: mapH/2 + rand(-jitter,jitter) };
    }
    const m = manholes[pick - 4];
    const j = 12 * DPR;
    return { x: m.x + rand(-j, j), y: m.y + rand(-j, j) };
  }

  // Wave = 20s interval; scale 1.2^wave, capped so enemies don't one-shot or become untouchable
  function getWaveScale(){
    const isLevel11 = currentLevelConfig && currentLevelConfig.id === "1-1";
    // On level 1-1, mice should not get stronger before the custom boss wave has spawned.
    if(isLevel11 && level11BossPhase !== "spawned") return 1;
    const waveIndex = Math.floor(gameTime / 20);
    return Math.pow(1.2, waveIndex);
  }
  function getWaveIndex(){ return Math.floor(gameTime / 20); }
  const WAVE_SCALE_SPEED_CAP = 1.55;
  const WAVE_SCALE_DMG_CAP = 1.15;
  const CONTACT_DMG_CAP_PCT = 0.28;
  const CONTACT_DMG_ABS_CAP = 24;

  function spawnEnemy(isElite=false){
    const { x, y } = getRandomSpawnPoint();

    const scale = getWaveScale();
    const scaleSpeed = Math.min(scale, WAVE_SCALE_SPEED_CAP);
    const scaleDmg = Math.min(scale, WAVE_SCALE_DMG_CAP);
    const baseR = isElite ? rand(16,20) : rand(11,15);
    const hp = (isElite ? rand(65,90) : rand(18,28)) * scale;
    const baseSp = (isElite ? rand(64,80) : rand(78,102)) * 1.5 * scaleSpeed;
    const spMult = (1/1.5) + Math.random() * (1.5 - 1/1.5);
    let sp = baseSp * spMult;
    // 1-1: cap speed so fastest mice are just below player speed
    if(currentLevelConfig && currentLevelConfig.id === "1-1" && sp > 0) {
      const maxSp = (typeof player !== "undefined" && player.moveSpeed != null ? player.moveSpeed : BASE.speed) * 0.99;
      if(sp * DPR > maxSp * DPR) sp = maxSp;
    }
    sp *= DPR;
    if(currentLevelConfig && currentLevelConfig.id === "1-1") sp *= 0.8;  // 1-1: skittering mice 20% slower
    const contactDmg = Math.round((isElite ? 10 : 8) * scaleDmg);
    const hpScale = (currentLevelConfig ? currentLevelConfig.enemyHpScale : 1) * (currentLevelConfig && currentLevelConfig.id === "1-1" ? 0.8 : 1);

    enemies.push({
      kind: "skitteringMouse",
      x,y, r: baseR*DPR,
      hp: (hp*(isElite?1.15:1)) * hpScale,
      maxHP: (hp*(isElite?1.15:1)) * hpScale,
      sp,
      elite: isElite,
      boss: false,
      icon: "🐭",
      contactDmg,
      hitFlash:0,
      animOffset: Math.random()*10
    });
  }

  const BASE_MOUSE_R = 13;
  // waveIndex = floor(gameTime/20). Miniboss = 3× size, 5× HP/dmg of smallest mob. Boss = 6× size, 20× HP/dmg.
  function spawnBoss(isMiniboss=false, waveIndex=null){
    const { x, y } = getRandomSpawnPoint();

    const w = typeof waveIndex === "number" && waveIndex >= 0 ? waveIndex : getWaveIndex();
    const scale = Math.min(Math.pow(1.2, w), WAVE_SCALE_DMG_CAP);
    const scaleSpeed = Math.min(Math.pow(1.2, w), WAVE_SCALE_SPEED_CAP);
    const smallestMobHP = 18 * scale;
    const smallestMobDmg = 8 * scale;

    const lvl1_1HpScale = (currentLevelConfig && currentLevelConfig.id === "1-1") ? 0.8 : 1;
    if(isMiniboss){
      const r = BASE_MOUSE_R * 3;
      const hp = smallestMobHP * 5 * lvl1_1HpScale;
      const contactDmg = Math.round(smallestMobDmg * 5);
      let minibossSp = 92 * DPR * Math.min(1, scaleSpeed);
      if(currentLevelConfig && currentLevelConfig.id === "1-1") minibossSp *= 0.8;  // 1-1: skittering mice 20% slower
      if(currentLevelConfig && currentLevelConfig.id === "1-1" && typeof player !== "undefined" && player.moveSpeed != null && minibossSp > player.moveSpeed * DPR) minibossSp = player.moveSpeed * DPR * 0.99;
      enemies.push({
        kind: "skitteringMouse",
        x,y,
        r: r*DPR,
        hp, maxHP: hp,
        sp: minibossSp,
        elite: true,
        boss: true,
        miniboss: true,
        contactDmg,
        icon: "🐭",
        hitFlash:0,
        animOffset: rand(0, 10)
      });
      return;
    }

    const r = BASE_MOUSE_R * 6;
    const hp = smallestMobHP * 20 * lvl1_1HpScale;
    const contactDmg = Math.round(smallestMobDmg * 20);
    let bossSp = 98 * DPR * Math.min(1, scaleSpeed);
    if(currentLevelConfig && currentLevelConfig.id === "1-1") bossSp *= 0.8;  // 1-1: skittering mice 20% slower
    if(currentLevelConfig && currentLevelConfig.id === "1-1" && typeof player !== "undefined" && player.moveSpeed != null && bossSp > player.moveSpeed * DPR) bossSp = player.moveSpeed * DPR * 0.99;
    enemies.push({
      kind: "skitteringMouse",
      x,y,
      r: r*DPR,
      hp, maxHP: hp,
      sp: bossSp,
      elite: true,
      boss: true,
      miniboss: false,
      contactDmg,
      icon: "🐭",
      hitFlash:0,
      animOffset: rand(0, 10)
    });
  }

  function spawnMegaBoss(){
    const { x, y } = getRandomSpawnPoint();
    const scale = Math.min(Math.pow(1.2, 7), WAVE_SCALE_DMG_CAP);
    const smallestMobHP = 18 * scale;
    const smallestMobDmg = 8 * scale;
    const lvl1_1HpScale = (currentLevelConfig && currentLevelConfig.id === "1-1") ? 0.8 : 1;
    const r = BASE_MOUSE_R * 8;
    const hp = smallestMobHP * 55 * lvl1_1HpScale;
    const contactDmg = Math.round(smallestMobDmg * 55);
    enemies.push({
      kind: "skitteringMouse",
      x,y,
      r: r*DPR,
      hp, maxHP: hp,
      sp: (currentLevelConfig && currentLevelConfig.id === "1-1" ? 0.8 : 1) * 88*DPR,  // 1-1: skittering mice 20% slower
      elite: true,
      boss: true,
      miniboss: false,
      megaBoss: true,
      contactDmg,
      icon: "🐭",
      hitFlash:0,
      animOffset: rand(0, 10)
    });
  }

  // ========= Combat =========
  function nearestEnemy(x,y){
    let best=null, bestD=Infinity;
    for(const e of enemies){
      const d=dist2(x,y,e.x,e.y);
      if(d<bestD){bestD=d; best=e;}
    }
    return best;
  }

  function shootAt(target){
    const dx=target.x-player.x, dy=target.y-player.y;
    const d=Math.hypot(dx,dy)||1;
    shootInDirection(dx/d, dy/d);
  }

  function shootInDirection(ux, uy){
    const sp=BASE.bulletSpeed*DPR;
    bullets.push({
      x: player.x + ux*(player.r+6*DPR),
      y: player.y + uy*(player.r+6*DPR),
      vx: ux*sp, vy: uy*sp,
      r: 4.2*DPR,
      life: BASE.bulletLife,
      pierce: player.pierce,
      dmg: player.dmg,
      crit: Math.random() < player.crit
    });
    beep({freq: 500 + rand(-50,50), dur:0.036, type:"square", gain:0.028, slide:0.85});
  }

  function hitEnemy(e,dmg){
    e.hp -= dmg;
    e.hitFlash = 0.12;
    beep({freq: 260 + rand(-35,35), dur:0.02, type:"sine", gain:0.028});
    if(e.hp<=0) killEnemy(e);
  }

  function spawnLevelUpRing(x,y){
    levelUpRings.push({ x, y, r: 0, maxR: 600*DPR, life: 0.42, t: 0 });
  }
  function splashDamage(x,y, amount, noSound=false, radiusOverride=null){
    if(amount<=0) return;
    const rad = radiusOverride != null ? radiusOverride : (36+amount*0.55)*DPR;
    const r2=rad*rad;
    for(const e of enemies){
      const dd=dist2(x,y,e.x,e.y);
      if(dd<=r2){
        const t=1-Math.sqrt(dd)/rad;
        const dmg=Math.round(amount*(0.35+0.65*t));
        hitEnemy(e,dmg);
      }
    }
    if(!noSound) beep({freq: 160, dur:0.08, type:"triangle", gain:0.05, slide:1.6});
  }

  function healFromLifesteal(dmgDealt){
    if(player.lifesteal<=0) return;
    const heal=dmgDealt*player.lifesteal;
    if(heal>0) player.hp=Math.min(player.maxHP, player.hp+heal);
  }

  function takeDamage(amount){
    if(player.invuln>0) return;
    const capPct = Math.ceil(player.maxHP * CONTACT_DMG_CAP_PCT);
    const cap = Math.min(capPct, CONTACT_DMG_ABS_CAP);
    let dmg = Math.min(amount, cap);
    if(player.shield>0){
      const used=Math.min(player.shield,dmg);
      player.shield-=used; dmg-=used;
    }
    if(dmg>0){
      player.hp-=dmg;
      player.invuln=0.18;
      beep({freq: 120, dur:0.08, type:"sawtooth", gain:0.05, slide:1.4});
    }
    if(player.hp<=0){
      player.hp=0;
      const dx = player.x, dy = player.y;
      deathSequence = { t: 0, duration: 2.8, px: dx, py: dy };
      if(runMusic){ runMusic.pause(); runMusic.currentTime=0; runMusic=null; }
      for(let n=0;n<24;n++){
        const a = Math.random()*Math.PI*2;
        const sp = rand(80,220)*DPR;
        particles.push({
          x: dx + rand(-16,16)*DPR, y: dy + rand(-16,16)*DPR,
          vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - rand(20,80)*DPR,
          r: rand(3,8)*DPR, life: rand(0.5,1.1), t: 0,
          col: pick(["#8b0000","#660000","#4a0000","#2d0000","#1a0000","#550000"])
        });
      }
      beep({freq:70,dur:0.2,type:"sawtooth",gain:0.08,slide:0.4});
      beep({noise:true,dur:0.15,gain:0.05});
      return;
    }
  }

  function killEnemy(e){
    const isLevel11 = level11Active && currentLevelConfig && currentLevelConfig.id === "1-1";
    enemies.splice(enemies.indexOf(e),1);
    kills++;
    if(e.miniboss){
      minibossKills++;
      if(isLevel11){
        showSimpleToast("Seal the Manhole");
        const zone = level11Zones.find(z => z.id === e.clusterZone);
        if(zone){
          const m = manholes[zone.manholeIndex];
          if(m) level11Arrow = { targetX: m.x, targetY: m.y, t: 0, life: 4, delay: 1 };
        }
      }
    }
    if(e.boss && !e.miniboss) bossKills++;
    streak++; streakT=1.8;

    dropXP(e.x,e.y, e.elite, e.boss);

    if(isLevel11 && !e.boss){
      level11Kills++;
      const withinGuaranteeWindow = level11Kills <= 10;
      const mustGuaranteeNow = withinGuaranteeWindow && !level11WeaponDropped && level11Kills === 10;
      if(mustGuaranteeNow){
        dropGuaranteedWeaponLevel11(e.x, e.y);
      } else {
        dropLoot(e.x,e.y, e.elite, e.boss, e.miniboss);
      }
    } else {
      dropLoot(e.x,e.y, e.elite, e.boss, e.miniboss);
    }

    // Blood pool: only some enemies drop blood; bosses always do.
    let makeBloodPool = true;
    if(!e.boss){
      const p = e.elite ? BLOOD_POOL_CHANCE_ELITE : BLOOD_POOL_CHANCE_NORMAL;
      if(Math.random() >= p) makeBloodPool = false;
    }
    if(makeBloodPool){
      const levelId = currentLevelConfig ? currentLevelConfig.id : "1-1";
      const bloodType = (typeof window.getRandomBloodTypeForLevel === "function")
        ? window.getRandomBloodTypeForLevel(levelId)
        : (window.BLOOD_TYPES && window.BLOOD_TYPES[0]) || { id: "red", name: "Red", color: "#c0392b" };
      if (bloodType) {
        let ml = 8 + Math.floor(Math.random() * 8);
        if (e.elite) ml = 20 + Math.floor(Math.random() * 16);
        if (e.boss) ml = 50 + Math.floor(Math.random() * 50);
        const col = bloodType.color || "#c0392b";
        const scale = e.boss ? 1.8 : (e.elite ? 1.25 : 1);
        const baseR = 14 * DPR;
        const mainR = baseR * scale;
        const secondary = [];
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          const secR = mainR * rand(0.28, 0.38);
          const dist = mainR - secR + rand(0, 1.4 * secR);
          secondary.push({ dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, r: secR });
        }
        const splatter = [];
        const nSplatter = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < nSplatter; i++) {
          const dx = mainR * rand(-1.15, 1.15);
          const dy = mainR * rand(-1.15, 1.15);
          const sr = mainR * rand(1/20, 1/15);
          splatter.push({ dx, dy, r: sr });
        }
        bloodPools.push({
          x: e.x, y: e.y,
          bloodTypeId: bloodType.id,
          bloodTypeColor: col,
          ml,
          spawnT: now(),
          gathered: false,
          scale,
          mainR,
          secondary,
          splatter
        });
        showTutorial("blood_pool", "Blood pools can be sampled. Stand still on one to collect a sample.", e.x, e.y);
        // Small blood-splat burst when pool appears.
        for(let n=0;n<9;n++){
          const a = Math.random()*Math.PI*2;
          const sp = rand(40,140)*DPR;
          particles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a)*sp,
            vy: Math.sin(a)*sp*0.4,
            r: rand(2.5,5)*DPR,
            life: rand(0.25,0.5),
            t: 0,
            col: col
          });
        }
      }
    }

    if(e.boss && !e.miniboss){
      bossKilled=true;
      showTutorial("extraction", "You've killed the boss. Extraction is available (X). Extract before you are killed, or else you will lose all loot. (But… the longer you fight, the better the rewards.)", e.x, e.y);
      spawnLegendaryBurst(e.x,e.y,true);
      beep({freq: 180, dur:0.18, type:"sawtooth", gain:0.06, slide:0.55});
      beep({freq: 420, dur:0.14, type:"triangle", gain:0.05, slide:0.75});
    } else {
      beep({freq: e.elite?220:180, dur:0.05, type:"triangle", gain:0.05, slide:1.4});
      beep({noise:true, dur:0.03, gain:0.03});
    }
  }

  // ========= Loot pickup -> compare =========
  function openCompare(drop){
    const newItem=drop.item;
    const slotKey=slotForType(newItem.type);
    const currentItem=equipped[slotKey]||null;
    pendingLoot={drop,slotKey,currentItem,newItem};
    inCompare=true;
    paused=true;
    // Invulnerable as soon as we touch loot and while choosing (game is paused; invuln set so we're safe on exit too)
    const invulnDur = Math.min(3, 1 + (player.lootInvulnSec || 0));
    player.invuln = Math.max(player.invuln, invulnDur);
    showCompareUI();
  }

  // ========= keyboard choose handling while compare is open =========
  function canAcceptCompareKey(k){
    if(!inCompare || !pendingLoot) return false;
    if(!compareGateActive) return true;
    if(now() < compareLockUntil) return false;
    if(compareBlocked.has(k)) return false;
    return true;
  }
  addEventListener("keydown",(e)=>{
    if(!inCompare || !pendingLoot) return;
    const k = (e.key===" " ? "space" : e.key.toLowerCase());
    if(k==="arrowleft" || k==="a"){
      if(canAcceptCompareKey(k)){
        e.preventDefault();
        ensureAudio();
        beep({freq:540,dur:0.06,type:"triangle",gain:0.05});
        compareSelectionIndex=0;
        updateCompareSelection();
      }
    } else if(k==="arrowright" || k==="d"){
      if(canAcceptCompareKey(k)){
        e.preventDefault();
        ensureAudio();
        beep({freq:640,dur:0.06,type:"triangle",gain:0.05});
        compareSelectionIndex=1;
        updateCompareSelection();
      }
    } else if(k==="e" || k==="space"){
      if(canAcceptCompareKey(k)){
        e.preventDefault();
        ensureAudio();
        if(compareSelectionIndex===1) beep({freq:760,dur:0.07,type:"triangle",gain:0.06,slide:0.8});
        else beep({freq:540,dur:0.06,type:"triangle",gain:0.05});
        acceptCompare(compareSelectionIndex===1);
      }
    }
  }, {passive:false});

  // ========= Legendary burst particles =========
  function spawnLegendaryBurst(x,y,big=false){
    const gold=cssVar("--gold");
    const n=big?42:28;
    for(let i=0;i<n;i++){
      const a=rand(0,Math.PI*2);
      const sp=rand(big?220:160, big?680:520)*DPR;
      particles.push({
        x,y,
        vx: Math.cos(a)*sp,
        vy: Math.sin(a)*sp - rand(0,big?220:160)*DPR,
        r: rand(1.8, big?4.4:3.6)*DPR,
        life: rand(big?0.55:0.45, big?1.05:0.85),
        t:0,
        col: gold,
        glow:true
      });
    }
    particles.push({x,y,vx:0,vy:0,r:0,life: big?0.85:0.55,t:0,col:gold,glow:true,pulse:true});
  }

  // ========= Main Menu / High Score =========
  const C64_LOADING_COLORS = [
    "#352879", "#6C5EB5", "#6F4FBD", "#B36BBD", "#40318D", "#67B6BD", "#FFFFFF",
    "#883932", "#55A049", "#8B3F96", "#BFCE72", "#8B542B", "#574200", "#B86962",
    "#505050", "#787878", "#94E089", "#7869C4", "#9F9F9F", "#000000"
  ];
  function buildC64Lines(count){
    const colors = C64_LOADING_COLORS;
    let html = "";
    for (let i = 0; i < count; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      html += `<div class="c64Line" style="background:${col};"></div>`;
    }
    return html;
  }
  function showSplash(){
    running=false; paused=false; inCompare=false;
    overlay.classList.remove("hidden");
    const overlayCard = document.getElementById("overlayCard");
    if(overlayCard) overlayCard.classList.add("mainMenuActive");
    if(ovHead) ovHead.style.display="none";
    ovBtns.innerHTML="";
    ovTitle.textContent="";
    ovSub.textContent="";
    const lineCount = Math.max(28, Math.ceil((typeof innerHeight === "number" ? innerHeight : 600) / 18));
    ovBody.innerHTML=`
      <div class="menuSplashWrap" id="splashWrap">
        <div class="menuSplashC64Side menuSplashC64Left">${buildC64Lines(lineCount)}</div>
        <div class="menuSplashCenter">
          <img src="assets/graphics/Main Menu.jpg" alt="" />
          <div class="menuSplashPrompt">Click to start</div>
        </div>
        <div class="menuSplashC64Side menuSplashC64Right">${buildC64Lines(lineCount)}</div>
      </div>
    `;
    const wrap = document.getElementById("splashWrap");
    if(wrap){
      wrap.onclick = ()=>{
        if(menuMusic && musicVol>0){ applyMusicVolume(); menuMusic.play().catch(()=>{}); }
        menuMusicStartedOnce = true;
        showMainMenu();
      };
      wrap.ontouchend = (e)=>{
        e.preventDefault();
        if(menuMusic && musicVol>0){ applyMusicVolume(); menuMusic.play().catch(()=>{}); }
        menuMusicStartedOnce = true;
        showMainMenu();
      };
    }
  }

  function showMainMenu(){
    running=false; paused=false; inCompare=false;
    if(runMusic){ runMusic.pause(); runMusic=null; }
    overlay.classList.remove("hidden");
    const overlayCard = document.getElementById("overlayCard");
    if(overlayCard) overlayCard.classList.add("mainMenuActive");
    if(ovHead) ovHead.style.display="none";
    ovBtns.innerHTML="";
    ovTitle.textContent="";
    ovSub.textContent="";

    const hubImgBase = "assets/graphics/";
    const hubDefaultPod = hubImgBase + "pod.png";
    const hubDefaultHighlight = hubImgBase + "pod_high_light.png";
    const hubHoverMap = {
      contracts:     { pod: "pod_contracts.png",     highlight: "pod_high_light_contracts.png" },
      chem:          { pod: "pod_chemistry_lab.png", highlight: "pod_high_light_chemistry_lab.png" },
      armory:        { pod: "pod_armory.png",        highlight: "pod_high_light_armory.png" },
      intel:         { pod: "pod_intel.png",         highlight: "pod_high_light_intel.png" },
      core:          { pod: "pod_core_systems.png",  highlight: "pod_high_light_core_systems.png" },
      options:       { pod: "pod_options.png",       highlight: "pod_high_light_options.png" },
      drop:          { pod: "pod_drop-zone.png",     highlight: "pod_high_light_drop_zone.png" }
    };

    const hubW = 1536, hubH = 1024;
    const pt = (x, y) => x + "," + y;
    const hubZonePoints = {
      contracts: [pt(80,335), pt(303,347), pt(319,567), pt(78,577)].join(" "),
      chem:       [pt(314,296), pt(532,290), pt(526,635), pt(319,631)].join(" "),
      armory:     [pt(623,277), pt(885,277), pt(885,639), pt(623,639)].join(" "),
      intel:      [pt(964,289), pt(1182,293), pt(1188,634), pt(963,638)].join(" "),
      core:       [pt(1215,315), pt(1487,289), pt(1488,495), pt(1215,500)].join(" "),
      options:    [pt(1222,586), pt(1335,593), pt(1306,696), pt(1193,685)].join(" "),
      drop:       [pt(550,728), pt(953,728), pt(1048,882), pt(470,882)].join(" ")
    };

    ovBody.innerHTML=`
      <div class="menuHubWrap">
        <div class="menuHubBgWrap">
          <img class="menuHubBg" id="menuHubBgImg" src="${hubDefaultPod}" alt="" />
          <img class="menuHubBgHighlight" id="menuHubBgHighlightImg" src="${hubDefaultHighlight}" alt="" />
        </div>
        <svg class="menuHubZones" viewBox="0 0 ${hubW} ${hubH}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <polygon class="menuHubZone" data-hub-area="contracts" points="${hubZonePoints.contracts}" />
          <polygon class="menuHubZone" data-hub-area="chem" points="${hubZonePoints.chem}" />
          <polygon class="menuHubZone" data-hub-area="armory" points="${hubZonePoints.armory}" />
          <polygon class="menuHubZone" data-hub-area="intel" points="${hubZonePoints.intel}" />
          <polygon class="menuHubZone" data-hub-area="core" points="${hubZonePoints.core}" />
          <polygon class="menuHubZone" data-hub-area="options" points="${hubZonePoints.options}" />
          <polygon class="menuHubZone" data-hub-area="drop" points="${hubZonePoints.drop}" />
        </svg>
        <div class="menuHubVolume" id="volumeBox">
          ${getVolumeControlsHTML()}
        </div>
      </div>
    `;

    const bgImg = document.getElementById("menuHubBgImg");
    const bgHighlight = document.getElementById("menuHubBgHighlightImg");
    const clickHandlers = {
      contracts: () => showContractsMenu(),
      chem: () => showChemistryLab(),
      armory: () => showComingSoonPopup(),
      intel: () => showComingSoonPopup(),
      core: () => showCoreSystemsMenu(),
      options: () => showComingSoonPopup(),
      drop: () => { ensureAudio(); showChooseLevelMenu(); }
    };

    ovBody.querySelectorAll(".menuHubZone[data-hub-area]").forEach(poly => {
      const area = poly.getAttribute("data-hub-area");
      const variant = hubHoverMap[area];
      if (variant) {
        poly.addEventListener("mouseenter", () => {
          beep({ freq: 640, dur: 0.05, type: "sine", gain: 0.055 });
          bgImg.src = hubImgBase + variant.pod;
          bgHighlight.src = hubImgBase + variant.highlight;
        });
        poly.addEventListener("mouseleave", () => {
          bgImg.src = hubDefaultPod;
          bgHighlight.src = hubDefaultHighlight;
        });
      }
      const fn = clickHandlers[area];
      if (fn) poly.addEventListener("click", fn);
    });

    if(menuMusic && musicVol>0){
      applyMusicVolume();
      menuMusic.play().catch(()=>{});
    }
    attachVolumeListeners(ovBody);
  }

  function showUpgradesMenu(){
    const overlayCard = document.getElementById("overlayCard");
    if(overlayCard) overlayCard.classList.remove("mainMenuActive");
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent="Skill Upgrades";
    ovSub.textContent="Token bar fills as you collect XP (0→1000). At 1000 you earn 1 token. Spend tokens here to permanently improve affixes.";
    ovBtns.innerHTML="";
    function skillValue(affixId, level){
      return affixId==="lootInvuln" ? level*0.2 : level;
    }
    function costForNextLevel(currentLevel){ return currentLevel + 1; }
    const tokenEl = document.createElement("div");
    tokenEl.className = "upgradeTokenBar";
    tokenEl.innerHTML = `<span class="upgradeTokenLabel">Tokens</span><span class="upgradeTokenValue">${tokens}</span>`;
    ovBody.innerHTML="";
    ovBody.appendChild(tokenEl);
    const listWrap = document.createElement("div");
    listWrap.className = "upgradeListWrap";
    for(const a of AFFIX_POOL){
      const level = skillLevels[a.id]||0;
      const cost = costForNextLevel(level);
      const currentVal = skillValue(a.id, level);
      const nextVal = skillValue(a.id, level+1);
      const canAfford = tokens >= cost;
      const row = document.createElement("div");
      row.className = "upgradeRow";
      const currentTxt = level === 0 ? "—" : a.fmt(currentVal);
      const nextTxt = a.fmt(nextVal);
      row.innerHTML = `
        <div class="upgradeAffix">
          <span class="upgradeAffixIcon">${a.icon}</span>
          <span class="upgradeAffixName">${a.name}</span>
        </div>
        <div class="upgradeVals">
          <div class="upgradeValPair"><span class="upgradeValLabel">Current</span><span class="upgradeValCurrent">${currentTxt}</span></div>
          <div class="upgradeValPair"><span class="upgradeValLabel">Next</span><span class="upgradeValNext">${nextTxt}</span></div>
        </div>
        <div class="upgradeCostWrap">
          <span class="upgradeCost">${cost}</span> <span class="upgradeCostLabel">token${cost!==1?"s":""}</span>
          <button type="button" class="upgradeBtn" ${canAfford?"":"disabled"}>Upgrade</button>
        </div>
      `;
      const btn = row.querySelector(".upgradeBtn");
      if(btn && canAfford){
        btn.onclick=()=>{
          tokens -= cost;
          skillLevels[a.id] = level + 1;
          localStorage.setItem("affixloot_tokens", String(tokens));
          localStorage.setItem("affixloot_skill_levels", JSON.stringify(skillLevels));
          beep({freq:640,dur:0.06,type:"triangle",gain:0.05});
          showUpgradesMenu();
        };
      }
      listWrap.appendChild(row);
    }
    ovBody.appendChild(listWrap);
    const backWrap = document.createElement("div");
    backWrap.className = "upgradeBackWrap";
    const backBtn = document.createElement("button");
    backBtn.textContent = "Back";
    backBtn.onclick = () => showMainMenu();
    backWrap.appendChild(backBtn);
    ovBody.appendChild(backWrap);
  }

  function showChooseLevelMenu(){
    const overlayCard = document.getElementById("overlayCard");
    if(overlayCard) overlayCard.classList.remove("mainMenuActive");
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent="Choose Level";
    ovSub.textContent="Click an unlocked level to start a run. Locked levels must be unlocked by winning the previous one.";
    ovBtns.innerHTML="";
    ovBody.innerHTML="";
    const wrap = document.createElement("div");
    wrap.className = "levelSelectWrap";
    for(const lvl of LEVELS){
      const unlocked = unlockedLevels.includes(lvl.id);
      const selected = selectedLevelId === lvl.id;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "levelSelectRow" + (unlocked ? "" : " levelLocked") + (selected ? " levelSelected" : "");
      row.disabled = !unlocked;
      row.innerHTML = `
        <span class="levelSelectId">${lvl.id}</span>
        <span class="levelSelectName">${lvl.name || lvl.id}</span>
        ${unlocked ? '<span class="levelSelectBadge">Play</span>' : '<span class="levelSelectLock">🔒 Locked</span>'}
      `;
      if(unlocked){
        row.onclick = () => {
          selectedLevelId = lvl.id;
          beep({freq:520,dur:0.06,type:"triangle",gain:0.05});
          ensureAudio();
          stopMenuMusic();
          startGame(false);
        };
      }
      wrap.appendChild(row);
    }
    ovBody.appendChild(wrap);
    const btnWrap = document.createElement("div");
    btnWrap.className = "upgradeBackWrap";
    btnWrap.style.display = "flex";
    btnWrap.style.gap = "10px";
    btnWrap.style.flexWrap = "wrap";
    const backBtn = document.createElement("button");
    backBtn.textContent = "Back";
    backBtn.onclick = () => showMainMenu();
    btnWrap.appendChild(backBtn);
    ovBody.appendChild(btnWrap);
  }

  function showChemistryLab(){
    const overlayCard = document.getElementById("overlayCard");
    if(overlayCard) overlayCard.classList.remove("mainMenuActive");
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent="Chemistry Lab";
    ovSub.textContent="Stored blood from extractions. Exchange blood for tokens.";
    ovBtns.innerHTML="";
    const bloodTypes = (typeof window.BLOOD_TYPES !== "undefined" && window.BLOOD_TYPES.length) ? window.BLOOD_TYPES : [{ id: "red", name: "Red", color: "#c0392b" }];
    let totalMl = 0;
    for(const id in baseBloodMl) totalMl += baseBloodMl[id]|0;
    const canExchange = Math.floor(totalMl / BLOOD_EXCHANGE_ML_PER_TOKEN);
    const wrap = document.createElement("div");
    wrap.className = "chemLabWrap";
    wrap.style.cssText = "display:flex; flex-direction:column; gap:14px; max-width:420px;";
    const tubeList = document.createElement("div");
    tubeList.className = "chemLabTubes";
    tubeList.style.cssText = "display:flex; flex-direction:column; gap:8px;";
    for(const bt of bloodTypes){
      const ml = baseBloodMl[bt.id]|0;
      const row = document.createElement("div");
      row.style.cssText = "display:flex; align-items:center; gap:12px; padding:10px 14px; background:rgba(0,0,0,.25); border-radius:10px; border-left:4px solid " + (bt.color||"#c0392b") + ";";
      row.innerHTML = `<span style="font-weight:800;">${bt.name}</span><span class="mono" style="margin-left:auto;">${ml} ml</span>`;
      tubeList.appendChild(row);
    }
    wrap.appendChild(tubeList);
    const totalRow = document.createElement("div");
    totalRow.style.cssText = "font-weight:900; padding:10px 0; border-top:1px solid rgba(255,255,255,.2);";
    totalRow.textContent = `Total: ${totalMl} ml`;
    wrap.appendChild(totalRow);
    const exchangeBtn = document.createElement("button");
    exchangeBtn.className = "menuBtnPrimary";
    exchangeBtn.textContent = canExchange > 0 ? `Exchange ${canExchange * BLOOD_EXCHANGE_ML_PER_TOKEN} ml → ${canExchange} token${canExchange !== 1 ? "s" : ""}` : "No blood to exchange (50 ml = 1 token)";
    exchangeBtn.disabled = canExchange <= 0;
    if(canExchange > 0){
      exchangeBtn.onclick = () => {
        const toRemove = canExchange * BLOOD_EXCHANGE_ML_PER_TOKEN;
        let remaining = toRemove;
        for(const bt of bloodTypes){
          if(remaining <= 0) break;
          const have = baseBloodMl[bt.id]|0;
          const take = Math.min(have, remaining);
          if(take > 0){ baseBloodMl[bt.id] = have - take; remaining -= take; }
        }
        tokens += canExchange;
        localStorage.setItem("affixloot_tokens", String(tokens));
        localStorage.setItem("affixloot_base_blood_ml", JSON.stringify(baseBloodMl));
        beep({freq:523,dur:0.08,type:"sine",gain:0.1});
        showChemistryLab();
      };
    }
    wrap.appendChild(exchangeBtn);
    const backBtn = document.createElement("button");
    backBtn.textContent = "Back";
    backBtn.onclick = () => showMainMenu();
    wrap.appendChild(backBtn);
    ovBody.innerHTML = "";
    ovBody.appendChild(wrap);
  }

  function showContractsMenu(){
    const overlayCard = document.getElementById("overlayCard");
    if(overlayCard) overlayCard.classList.remove("mainMenuActive");
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent="Contracts";
    ovSub.textContent="Take on special challenges for extra rewards.";
    ovBtns.innerHTML="";
    ovBody.innerHTML="";

    const nowMs = Date.now();
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; flex-direction:column; gap:14px; max-width:480px;";

    // Completed quest waiting for reward
    if(questState && questState.completed){
      const c = questState.completed;
      const box = document.createElement("div");
      box.style.cssText = "padding:12px 14px; border-radius:10px; background:rgba(0,0,0,.35); border-left:4px solid #f1c40f; display:flex; flex-direction:column; gap:6px;";
      const title = document.createElement("div");
      title.style.cssText = "font-weight:900; color:#f1c40f; font-size:14px;";
      title.textContent = "Quest complete — collect reward";
      const desc = document.createElement("div");
      desc.style.cssText = "font-size:12px; opacity:.9;";
      desc.textContent = c.label || "Completed contract";
      const btn = document.createElement("button");
      btn.className = "menuBtnPrimary";
      btn.textContent = "Collect reward (1 token)";
      btn.onclick = () => {
        tokens += 1;
        try{ localStorage.setItem("affixloot_tokens", String(tokens)); }catch(e){}
        questState.completed = null;
        saveQuestState();
        beep({freq:660,dur:0.08,type:"triangle",gain:0.08});
        showContractsMenu();
      };
      box.appendChild(title);
      box.appendChild(desc);
      box.appendChild(btn);
      wrap.appendChild(box);
    }

    // Active quest info
    if(questState && questState.active){
      const q = questState.active;
      const box = document.createElement("div");
      box.style.cssText = "padding:12px 14px; border-radius:10px; background:rgba(0,0,0,.3); border-left:4px solid #7f8c8d; display:flex; flex-direction:column; gap:6px;";
      const title = document.createElement("div");
      title.style.cssText = "font-weight:900; font-size:14px;";
      title.textContent = q.label || "Active contract";
      const desc = document.createElement("div");
      desc.style.cssText = "font-size:12px; opacity:.9;";
      desc.textContent = q.desc || "";
      const prog = document.createElement("div");
      prog.style.cssText = "font-size:12px; opacity:.9; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;";
      if(q.kind === "kills"){
        const cur = q.progressKills||0, targ = q.target||0;
        prog.textContent = `Progress: ${cur}/${targ} kills`;
      } else if(q.kind === "survive"){
        const cur = Math.floor((q.progressSeconds||0)/60);
        const targ = Math.floor((q.targetSeconds||0)/60);
        prog.textContent = `Progress: ${cur}/${targ} minutes survived (successful runs only)`;
      } else if(q.kind === "blood"){
        const cur = q.progressMl||0, targ = q.targetMl||0;
        prog.textContent = `Progress: ${cur}/${targ} ml blood collected`;
      }
      box.appendChild(title);
      box.appendChild(desc);
      box.appendChild(prog);
      wrap.appendChild(box);
    }

    // New proposals if no active quest
    if(!questState || !questState.active){
      const now = nowMs;
      if(questState && questState.cooldownUntil && now < questState.cooldownUntil){
        const remainingMs = questState.cooldownUntil - now;
        const remMin = Math.max(0, Math.floor(remainingMs/60000));
        const remSec = Math.max(0, Math.floor((remainingMs%60000)/1000));
        const info = document.createElement("div");
        info.style.cssText = "padding:10px 12px; border-radius:8px; background:rgba(0,0,0,.3); font-size:12px;";
        info.textContent = `New contracts available in ${remMin}m ${remSec}s.`;
        wrap.appendChild(info);
      } else {
        if(!questState) questState = { active:null, proposals:[], cooldownUntil:0, completed:null };
        if(!questState.proposals || !questState.proposals.length){
          questState.proposals = generateQuestProposals();
          saveQuestState();
        }
        const list = document.createElement("div");
        list.style.cssText = "display:flex; flex-direction:column; gap:10px;";
        for(const q of questState.proposals){
          const row = document.createElement("div");
          row.style.cssText = "padding:10px 12px; border-radius:10px; background:rgba(0,0,0,.28); border-left:3px solid rgba(255,255,255,.25); display:flex; flex-direction:column; gap:4px;";
          const title = document.createElement("div");
          title.style.cssText = "font-weight:800; font-size:13px;";
          title.textContent = q.label;
          const desc = document.createElement("div");
          desc.style.cssText = "font-size:12px; opacity:.9;";
          desc.textContent = q.desc;
          const meta = document.createElement("div");
          meta.style.cssText = "font-size:11px; opacity:.85; display:flex; gap:8px;";
          meta.textContent = "Reward: 1 token • Difficulty: Easy";
          const btnRow = document.createElement("div");
          btnRow.style.cssText = "display:flex; gap:8px; margin-top:4px;";
          const acceptBtn = document.createElement("button");
          acceptBtn.className = "menuBtnPrimary";
          acceptBtn.textContent = "Accept";
          acceptBtn.onclick = () => {
            questState.active = cloneQuestDef(q);
            questState.proposals = [];
            questState.cooldownUntil = 0;
            saveQuestState();
            beep({freq:620,dur:0.06,type:"triangle",gain:0.06});
            showContractsMenu();
          };
          btnRow.appendChild(acceptBtn);
          row.appendChild(title);
          row.appendChild(desc);
          row.appendChild(meta);
          row.appendChild(btnRow);
          list.appendChild(row);
        }
        if(questState.proposals.length){
          const skipBtn = document.createElement("button");
          skipBtn.textContent = "Cancel offers (5 min cooldown)";
          skipBtn.onclick = () => {
            const now2 = Date.now();
            questState.proposals = [];
            questState.cooldownUntil = now2 + QUEST_COOLDOWN_MS;
            saveQuestState();
            showContractsMenu();
          };
          skipBtn.style.marginTop = "6px";
          list.appendChild(skipBtn);
        }
        wrap.appendChild(list);
      }
    }

    const backBtn = document.createElement("button");
    backBtn.textContent = "Back";
    backBtn.onclick = () => showMainMenu();
    backBtn.style.marginTop = "10px";
    wrap.appendChild(backBtn);

    ovBody.appendChild(wrap);
  }

  function showCoreSystemsMenu(){
    const overlayCard = document.getElementById("overlayCard");
    if(overlayCard) overlayCard.classList.remove("mainMenuActive");
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent="Core Systems";
    ovSub.textContent="";
    ovBtns.innerHTML="";
    for(const tree of SKILL_TREES){
      for(const node of tree.nodes){
        if(skillTreePurchased[node.id] && !(skillLevels[node.id] > 0)){
          skillLevels[node.id] = 1;
        }
      }
    }
    try{ localStorage.setItem("affixloot_skill_levels", JSON.stringify(skillLevels)); }catch(e){}

    const panel = document.createElement("div");
    panel.className = "coreSystemsPanel";
    panel.style.cssText = "position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); width:70vw; height:70vh; max-width:1200px; max-height:900px; background:linear-gradient(180deg, #0a1642 0%, #0d1f52 40%, #081236 100%); border-radius:16px; box-shadow:0 0 60px rgba(0,30,80,.6), inset 0 0 120px rgba(80,120,200,.08); border:1px solid rgba(100,160,255,.2); overflow:hidden; display:flex; flex-direction:column; z-index:100;";
    const starsLayer = document.createElement("div");
    starsLayer.className = "coreSystemsStars";
    starsLayer.style.cssText = "position:absolute; inset:0; pointer-events:none; overflow:hidden;";
    const starCount = 120;
    for(let i = 0; i < starCount; i++){
      const star = document.createElement("div");
      star.className = "coreStar";
      star.style.cssText = "position:absolute; width:2px; height:2px; background:#fff; border-radius:50%; left:" + (Math.random()*100) + "%; top:" + (Math.random()*100) + "%; animation:coreStarTwinkle " + (1.2 + Math.random()*2) + "s ease-in-out infinite; animation-delay:" + (Math.random()*2) + "s; opacity:" + (0.4 + Math.random()*0.6) + ";";
      starsLayer.appendChild(star);
    }
    panel.appendChild(starsLayer);
    const content = document.createElement("div");
    content.className = "coreSystemsContent";
    content.style.cssText = "position:relative; z-index:1; flex:1; display:flex; flex-direction:column; padding:16px 20px; min-height:0;";
    const topBar = document.createElement("div");
    topBar.style.cssText = "display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; gap:10px; flex-shrink:0;";
    const tokensSpan = document.createElement("span");
    tokensSpan.className = "coreSystemsTokens";
    tokensSpan.textContent = "Tokens: " + tokens;
    topBar.appendChild(tokensSpan);
    const prevBtn = document.createElement("button");
    prevBtn.className = "coreSystemsNavBtn";
    prevBtn.textContent = "◀";
    const nextBtn = document.createElement("button");
    nextBtn.className = "coreSystemsNavBtn";
    nextBtn.textContent = "▶";
    const backBtn = document.createElement("button");
    backBtn.className = "coreSystemsBackBtn";
    backBtn.textContent = "Back";
    backBtn.onclick = () => showMainMenu();
    topBar.appendChild(backBtn);
    content.appendChild(topBar);
    const treesArea = document.createElement("div");
    treesArea.className = "coreSystemsTreesArea";
    treesArea.style.cssText = "flex:1; display:flex; justify-content:center; align-items:stretch; min-height:0; padding:0 10px; gap:18px;";
    const tree = SKILL_TREES[currentCoreTreeIndex] || SKILL_TREES[0];
    const slideDir = coreTreeSlideDir;
    coreTreeSlideDir = null;

    const infoPanel = document.createElement("div");
    infoPanel.className = "coreTreeInfoPanel";
    infoPanel.style.cssText = "position:absolute; max-width:240px; background:#000; color:#fff; border:1px solid #fff; border-radius:8px; padding:8px 12px; font-size:11px; line-height:1.4; box-shadow:0 0 24px rgba(0,0,0,.7); overflow:auto; display:none; pointer-events:none; z-index:5;";

    function buildNodeRow(node, level, maxLevel, unlocked){
      const row = document.createElement("div");
      row.className = "coreTreeNodeRow";
      row.style.cssText = "display:flex; flex-direction:row; align-items:center; gap:10px; flex-shrink:0; transform:translateX(-60px);";
      const costCell = document.createElement("div");
      costCell.className = "coreTreeCostCell";
      costCell.style.cssText = "width:72px; text-align:right; font-size:9px; font-weight:800; color:rgba(200,220,255,.9); min-width:72px; white-space:nowrap;";
      const nextCost = getCoreNodeCost(node, level, maxLevel);
      const canUpgrade = unlocked && level < maxLevel && tokens >= nextCost && nextCost > 0;
      costCell.textContent = (level < maxLevel && nextCost > 0) ? ("COST: " + String(nextCost)) : "";
      row.appendChild(costCell);
      const balloonWrap = document.createElement("div");
      balloonWrap.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:4px;";
      const balloon = document.createElement("div");
      balloon.className = "coreTreeBalloon";
      balloon.style.cssText = "width:162px; height:108px; border-radius:50%; background:rgb(50,100,180); border:2px solid rgba(120,180,255,.8); box-shadow:0 0 20px rgba(80,140,220,.35), inset 0 0 20px rgba(255,255,255,.08); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 12px; box-sizing:border-box;";
      if(!unlocked){ balloon.style.background = "rgb(45,55,75)"; balloon.style.borderColor = "rgba(100,120,140,.8)"; }
      else if(level >= maxLevel){ balloon.style.background = "rgb(60,140,100)"; balloon.style.borderColor = "rgba(140,220,180,.8)"; }
      const nameShort = node.name.length > 12 ? node.name.slice(0,11)+"…" : node.name;
      const balloonName = document.createElement("span");
      balloonName.className = "coreBalloonName";
      balloonName.textContent = nameShort;
      balloonName.style.cssText = "font-size:9px; font-weight:800; line-height:1.2; color:rgba(255,255,255,.98); text-align:center;";
      balloon.appendChild(balloonName);
      if(level >= 1){
        const balloonLevel = document.createElement("span");
        balloonLevel.className = "coreBalloonLevel";
        balloonLevel.textContent = level >= maxLevel ? "Level MAX" : "Level " + level;
        balloonLevel.style.cssText = "font-size:8px; font-weight:800; color:rgba(255,255,255,.75); margin-top:2px;";
        balloon.appendChild(balloonLevel);
      }
      balloonWrap.appendChild(balloon);

      balloon.addEventListener("mouseenter", () => { balloon.classList.add("coreTreeBalloonHover"); });
      balloon.addEventListener("mouseleave", () => { balloon.classList.remove("coreTreeBalloonHover"); });
      if(level < maxLevel) balloon.style.cursor = "pointer";
      balloon.addEventListener("click", (e) => {
        e.stopPropagation();
        if(level >= maxLevel) return;
        panel.querySelectorAll(".coreTreeConfirmMenu").forEach(m => m.remove());
        const menu = document.createElement("div");
        menu.className = "coreTreeConfirmMenu";
        menu.style.cssText = "position:absolute; background:#000; color:#fff; border:1px solid #fff; border-radius:8px; padding:10px 14px; font-size:11px; z-index:15; box-shadow:0 4px 20px rgba(0,0,0,.6); display:flex; flex-direction:column; gap:8px; min-width:140px;";
        const rect = balloon.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const menuWidth = 200;
        const menuHeight = 80;
        const idealLeft = rect.right - panelRect.left + 10;
        const maxLeft = panelRect.width - menuWidth - 8;
        const left = Math.max(8, Math.min(maxLeft, idealLeft));
        const idealTop = rect.top - panelRect.top + rect.height / 2 - menuHeight / 2;
        const maxTop = panelRect.height - menuHeight - 8;
        const top = Math.max(8, Math.min(maxTop, idealTop));
        menu.style.left = left + "px";
        menu.style.top = top + "px";
        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = "CONFIRM UPGRADE";
        confirmBtn.style.cssText = "padding:8px 12px; border:1px solid rgba(124,255,178,.6); background:rgba(124,255,178,.2); color:#b8ffe0; font-weight:800; cursor:pointer; border-radius:6px;";
        confirmBtn.disabled = !canUpgrade;
        if(!canUpgrade) confirmBtn.style.opacity = "0.6";
        confirmBtn.onclick = () => {
          if(!canUpgrade) return;
          const costNow = getCoreNodeCost(node, level, maxLevel);
          if(costNow <= 0 || tokens < costNow) return;
          tokens -= costNow;
          skillLevels[node.id] = (skillLevels[node.id]||0) + 1;
          localStorage.setItem("affixloot_tokens", String(tokens));
          localStorage.setItem("affixloot_skill_levels", JSON.stringify(skillLevels));
          beep({freq:640,dur:0.06,type:"triangle",gain:0.05});
          showCoreSystemsMenu();
        };
        const backBtn = document.createElement("button");
        backBtn.textContent = "BACK";
        backBtn.style.cssText = "padding:8px 12px; border:1px solid rgba(255,255,255,.5); background:rgba(255,255,255,.1); color:#fff; font-weight:800; cursor:pointer; border-radius:6px;";
        backBtn.onclick = () => { menu.remove(); };
        menu.appendChild(confirmBtn);
        menu.appendChild(backBtn);
        panel.appendChild(menu);
      });

      row.addEventListener("mouseenter", () => {
        panel.querySelectorAll(".coreTreeConfirmMenu").forEach(m => m.remove());
        if(!infoPanel) return;
        const info = describeCoreNode(node, level, maxLevel);
        infoPanel.innerHTML = `
          <div class="coreTreeInfoTitle">${info.title}</div>
          ${info.desc ? `<div class="coreTreeInfoDesc">${info.desc}</div>` : ""}
          <div class="coreTreeInfoStats">
            <div class="coreTreeStatRow"><span class="coreTreeStatLabel">Current stat</span><div class="coreTreeStatValue">${info.current}</div></div>
            <div class="coreTreeStatRow"><span class="coreTreeStatLabel">Next stat</span><div class="coreTreeStatValue">${info.next}</div></div>
          </div>
        `;
        const panelRect = panel.getBoundingClientRect();
        const balloonRect = balloon.getBoundingClientRect();
        const left = Math.min(panelRect.width - 260, Math.max(8, balloonRect.right - panelRect.left + 10));
        const top = Math.max(8, balloonRect.top - panelRect.top - 4);
        infoPanel.style.left = left + "px";
        infoPanel.style.top = top + "px";
        infoPanel.style.display = "block";
      });
      row.addEventListener("mouseleave", () => {
        infoPanel.style.display = "none";
      });

      row.appendChild(balloonWrap);
      return row;
    }

    function describeCoreNode(node, level, maxLevel){
      const nextLevel = Math.min(maxLevel, level + 1);
      const info = { title: node.name, desc: "", current: "", next: "" };
      const pct = (v)=> (v*100).toFixed(0) + "%";
      switch(node.id){
        case "war_base": {
          const curMul = 1 + 0.10*level;
          const nxtMul = 1 + 0.10*nextLevel;
          info.desc = "Increase base weapon damage for all attacks.";
          info.current = level === 0 ? "Damage multiplier: ×1.00" : "Damage multiplier: ×" + curMul.toFixed(2);
          info.next = level >= maxLevel ? "Max level reached." : "Damage multiplier at next level: ×" + nxtMul.toFixed(2);
          break;
        }
        case "war_crit_chance": {
          const cur = 0.03*level;
          const nxt = 0.03*nextLevel;
          info.desc = "Increase chance to deal a critical hit.";
          info.current = "Crit chance bonus: " + pct(cur);
          info.next = level >= maxLevel ? "Max level reached." : "Crit chance bonus at next level: " + pct(nxt);
          break;
        }
        case "war_crit_dmg": {
          const cur = 0.25*level;
          const nxt = 0.25*nextLevel;
          info.desc = "Increase how hard critical hits strike.";
          info.current = "Crit damage bonus: +" + (cur*100).toFixed(0) + "%";
          info.next = level >= maxLevel ? "Max level reached." : "Crit damage bonus at next level: +" + (nxt*100).toFixed(0) + "%";
          break;
        }
        case "war_stun_chance": {
          const cur = 0.05*level;
          const nxt = 0.05*nextLevel;
          info.desc = "Chance to briefly stun enemies you hit.";
          info.current = "Stun chance: " + pct(cur);
          info.next = level >= maxLevel ? "Max level reached." : "Stun chance at next level: " + pct(nxt);
          break;
        }
        case "war_stun_duration": {
          const baseDur = 0.6;
          const cur = baseDur + 0.25*level;
          const nxt = baseDur + 0.25*nextLevel;
          info.desc = "How long stunned enemies stay unable to move.";
          info.current = "Stun duration: " + cur.toFixed(2) + "s";
          info.next = level >= maxLevel ? "Max level reached." : "Stun duration at next level: " + nxt.toFixed(2) + "s";
          break;
        }
        case "war_rate": {
          const cur = 0.06*level;
          const nxt = 0.06*nextLevel;
          info.desc = "Increase your attack speed.";
          info.current = "Rate of fire bonus: " + pct(cur);
          info.next = level >= maxLevel ? "Max level reached." : "Rate of fire bonus at next level: " + pct(nxt);
          break;
        }
        case "war_pierce_chance": {
          const cur = 0.08*level;
          const nxt = 0.08*nextLevel;
          info.desc = "Chance for shots to pierce through enemies.";
          info.current = "Pierce chance: " + pct(cur);
          info.next = level >= maxLevel ? "Max level reached." : "Pierce chance at next level: " + pct(nxt);
          break;
        }
        case "war_pierce_dmg": {
          const cur = 0.15*level;
          const nxt = 0.15*nextLevel;
          info.desc = "Damage dealt to enemies after the first pierce.";
          info.current = "Pierce damage: +" + (cur*100).toFixed(0) + "%";
          info.next = level >= maxLevel ? "Max level reached." : "Pierce damage at next level: +" + (nxt*100).toFixed(0) + "%";
          break;
        }
        case "war_splash": {
          const cur = 0.15*level;
          const nxt = 0.15*nextLevel;
          info.desc = "Area damage around where your shots land.";
          info.current = "Splash radius & damage: +" + (cur*100).toFixed(0) + "%";
          info.next = level >= maxLevel ? "Max level reached." : "Splash at next level: +" + (nxt*100).toFixed(0) + "%";
          break;
        }
        case "war_obliterate": {
          const cur = 0.02*level;
          const nxt = 0.02*nextLevel;
          info.desc = "Small chance to instantly obliterate non-boss enemies. Mini-bosses have reduced chance. Always spawns a blood pool with extra gore.";
          info.current = "Obliterate chance: " + pct(cur) + " on normal mobs (less on mini-bosses).";
          info.next = level >= maxLevel ? "Max level reached." : "Obliterate chance at next level: " + pct(nxt) + " on normal mobs.";
          break;
        }
        default: {
          info.desc = "No detailed description yet.";
          info.current = level <= 0 ? "No effect yet." : "Effect is active.";
          info.next = level >= maxLevel ? "Max level reached." : "Next level will improve this effect.";
        }
      }
      return info;
    }

    if(tree && tree.branched && tree.nodes && tree.nodes.length){
      const col = document.createElement("div");
      col.className = "coreTreeColumn coreTreeBranched";
      col.style.cssText = "display:flex; flex-direction:column; align-items:center; flex:1; min-width:0; max-width:1260px;";
      if(slideDir === "next") col.style.animation = "coreTreeSlideFromRight 0.28s ease-out";
      else if(slideDir === "prev") col.style.animation = "coreTreeSlideFromLeft 0.28s ease-out";
      const leftNodes = tree.nodes.filter(n=>n.branch==="left").sort((a,b)=>a.branchIndex-b.branchIndex);
      const rightNodes = tree.nodes.filter(n=>n.branch==="right").sort((a,b)=>a.branchIndex-b.branchIndex);
      const baseNode = tree.nodes.find(n=>n.branch==="base");
      const topNode = tree.nodes.find(n=>n.branch==="top");
      const branchWrap = document.createElement("div");
      branchWrap.className = "coreTreeBranchWrap";
      branchWrap.style.cssText = "position:relative; flex:1; width:100%; min-height:320px; display:flex; flex-direction:column; justify-content:space-between; padding:8px 0;";
      const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.setAttribute("class","coreTreeBranchSvg");
      svg.setAttribute("viewBox","0 0 400 320");
      svg.setAttribute("preserveAspectRatio","none");
      svg.style.cssText = "position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:0;";
      const path = document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("fill","none");
      path.setAttribute("stroke","rgba(100,160,220,.55)");
      path.setAttribute("stroke-width","2");
      path.setAttribute("d","M 200 300 L 80 240 L 80 180 L 80 120 L 80 60 L 200 24 M 200 300 L 320 240 L 320 180 L 320 120 L 320 60 L 200 24");
      svg.appendChild(path);
      branchWrap.appendChild(svg);
      const topRow = document.createElement("div");
      topRow.style.cssText = "display:flex; justify-content:center; position:relative; z-index:1; flex-shrink:0; transform:translateX(10px);";
      if(topNode){
        const l = Math.min(skillLevels[topNode.id]||0, topNode.maxLevel||SKILL_TREE_MAX_LEVEL);
        const ml = topNode.maxLevel != null ? topNode.maxLevel : SKILL_TREE_MAX_LEVEL;
        const req = Array.isArray(topNode.requires)?topNode.requires:[];
        let un = true; for(const r of req) if((skillLevels[r]||0)<=0){ un=false; break; }
        topRow.appendChild(buildNodeRow(topNode, l, ml, un));
      }
      const midRow = document.createElement("div");
      midRow.style.cssText = "display:flex; justify-content:space-between; align-items:flex-start; flex:1; min-height:0; position:relative; z-index:1; padding:0; transform:translateX(19px);";
      const leftCol = document.createElement("div");
      leftCol.style.cssText = "flex:0 0 40%; display:flex; flex-direction:column-reverse; justify-content:space-around; align-items:center; padding-bottom:22%; box-sizing:border-box;";
      const midSpacer = document.createElement("div");
      midSpacer.style.cssText = "flex:0 0 20%; min-width:0;";
      const rightCol = document.createElement("div");
      rightCol.style.cssText = "flex:0 0 40%; display:flex; flex-direction:column-reverse; justify-content:space-around; align-items:center; padding-bottom:22%; box-sizing:border-box;";
      for(const node of leftNodes){
        const level = Math.min(skillLevels[node.id]||0, node.maxLevel||SKILL_TREE_MAX_LEVEL);
        const maxLevel = node.maxLevel != null ? node.maxLevel : SKILL_TREE_MAX_LEVEL;
        const requires = Array.isArray(node.requires)?node.requires:[];
        let unlocked = true; for(const r of requires) if((skillLevels[r]||0)<=0){ unlocked=false; break; }
        leftCol.appendChild(buildNodeRow(node, level, maxLevel, unlocked));
      }
      for(const node of rightNodes){
        const level = Math.min(skillLevels[node.id]||0, node.maxLevel||SKILL_TREE_MAX_LEVEL);
        const maxLevel = node.maxLevel != null ? node.maxLevel : SKILL_TREE_MAX_LEVEL;
        const requires = Array.isArray(node.requires)?node.requires:[];
        let unlocked = true; for(const r of requires) if((skillLevels[r]||0)<=0){ unlocked=false; break; }
        rightCol.appendChild(buildNodeRow(node, level, maxLevel, unlocked));
      }
      midRow.appendChild(leftCol);
      midRow.appendChild(midSpacer);
      midRow.appendChild(rightCol);
      const bottomRow = document.createElement("div");
      bottomRow.style.cssText = "display:flex; justify-content:center; position:relative; z-index:1; flex-shrink:0; transform:translateX(10px);";
      if(baseNode){
        const level = Math.min(skillLevels[baseNode.id]||0, baseNode.maxLevel||SKILL_TREE_MAX_LEVEL);
        const maxLevel = baseNode.maxLevel != null ? baseNode.maxLevel : SKILL_TREE_MAX_LEVEL;
        bottomRow.appendChild(buildNodeRow(baseNode, level, maxLevel, true));
      }
      branchWrap.appendChild(topRow);
      branchWrap.appendChild(midRow);
      branchWrap.appendChild(bottomRow);
      const label = document.createElement("div");
      label.className = "coreTreeLabel";
      label.textContent = tree.name;
      label.style.cssText = "font-size:28px; font-weight:900; letter-spacing:.18em; color:rgba(220,235,255,.96); margin-bottom:14px; flex-shrink:0; text-shadow:0 0 16px rgba(120,180,255,.6); text-align:center;";
      col.appendChild(label);
      col.appendChild(branchWrap);
      if(tree.id !== "warrior"){
        col.style.position = "relative";
        const comingSoon = document.createElement("div");
        comingSoon.className = "coreTreeComingSoon";
        comingSoon.textContent = "COMING SOON";
        comingSoon.style.cssText = "position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:900; letter-spacing:0.2em; color:rgba(220,235,255,.95); text-shadow:0 0 24px rgba(120,180,255,.7); z-index:10; pointer-events:none;";
        col.appendChild(comingSoon);
      }
      treesArea.appendChild(col);
    } else if(tree && tree.nodes && tree.nodes.length){
      const col = document.createElement("div");
      col.className = "coreTreeColumn";
      col.style.cssText = "display:flex; flex-direction:column; align-items:center; flex:1; min-width:0; max-width:220px;";
      if(slideDir === "next") col.style.animation = "coreTreeSlideFromRight 0.28s ease-out";
      else if(slideDir === "prev") col.style.animation = "coreTreeSlideFromLeft 0.28s ease-out";
      const nodesWrap = document.createElement("div");
      nodesWrap.className = "coreTreeNodesWrap";
      nodesWrap.style.cssText = "position:relative; flex:1; width:100%; min-height:0; padding-left:0;";
      const line = document.createElement("div");
      line.className = "coreTreeString";
      line.style.cssText = "position:absolute; width:2px; left:0; top:20px; bottom:20px; background:linear-gradient(180deg, rgba(120,180,255,.5), rgba(80,140,220,.7)); border-radius:1px; z-index:0; pointer-events:none;";
      nodesWrap.appendChild(line);
      const nodesCol = document.createElement("div");
      nodesCol.style.cssText = "position:relative; z-index:1; height:100%; display:flex; flex-direction:column-reverse; justify-content:space-between; align-items:stretch; padding:12px 0 12px 22px; box-sizing:border-box;";
      for(const node of tree.nodes){
        const level = Math.min(skillLevels[node.id]||0, node.maxLevel || SKILL_TREE_MAX_LEVEL);
        const maxLevel = node.maxLevel != null ? node.maxLevel : SKILL_TREE_MAX_LEVEL;
        const requires = Array.isArray(node.requires) ? node.requires : [];
        let unlocked = true;
        for(const reqId of requires){ if((skillLevels[reqId]||0) <= 0){ unlocked = false; break; } }
        nodesCol.appendChild(buildNodeRow(node, level, maxLevel, unlocked));
      }
      nodesWrap.appendChild(nodesCol);
      col.appendChild(nodesWrap);
      const label = document.createElement("div");
      label.className = "coreTreeLabel";
      label.textContent = tree.name;
      label.style.cssText = "font-size:28px; font-weight:900; letter-spacing:.18em; color:rgba(220,235,255,.96); margin-bottom:14px; flex-shrink:0; text-shadow:0 0 16px rgba(120,180,255,.6); text-align:center;";
      col.appendChild(label);
      treesArea.appendChild(col);
    } else if(tree){
      const col = document.createElement("div");
      col.className = "coreTreeColumn";
      col.style.cssText = "display:flex; flex-direction:column; align-items:center; flex:1;";
      if(slideDir === "next") col.style.animation = "coreTreeSlideFromRight 0.28s ease-out";
      else if(slideDir === "prev") col.style.animation = "coreTreeSlideFromLeft 0.28s ease-out";
      const label = document.createElement("div");
      label.className = "coreTreeLabel";
      label.textContent = tree.name;
      label.style.cssText = "font-size:28px; font-weight:900; letter-spacing:.18em; color:rgba(220,235,255,.96); margin-bottom:14px; flex-shrink:0; text-shadow:0 0 16px rgba(120,180,255,.6); text-align:center;";
      col.appendChild(label);
      treesArea.appendChild(col);
    }

    if(tree && tree.nodes && tree.nodes.length){
      panel.appendChild(infoPanel);
    }
    content.appendChild(treesArea);
    panel.appendChild(content);

    // Side navigation buttons (left/right) – wrap around first/last
    if(prevBtn){
      prevBtn.style.cssText = "position:absolute; left:12px; top:50%; transform:translateY(-50%); z-index:20;";
      panel.appendChild(prevBtn);
      prevBtn.onclick = () => {
        currentCoreTreeIndex = (currentCoreTreeIndex - 1 + SKILL_TREES.length) % SKILL_TREES.length;
        currentCoreInfoId = null;
        coreTreeSlideDir = "prev";
        beep({freq:420,dur:0.08,type:"square",gain:0.04});
        showCoreSystemsMenu();
      };
    }
    if(nextBtn){
      nextBtn.style.cssText = "position:absolute; right:12px; top:50%; transform:translateY(-50%); z-index:20;";
      panel.appendChild(nextBtn);
      nextBtn.onclick = () => {
        currentCoreTreeIndex = (currentCoreTreeIndex + 1) % SKILL_TREES.length;
        currentCoreInfoId = null;
        coreTreeSlideDir = "next";
        beep({freq:520,dur:0.08,type:"square",gain:0.04});
        showCoreSystemsMenu();
      };
    }
    panel.addEventListener("mousedown", (e) => {
      const open = panel.querySelector(".coreTreeConfirmMenu");
      if(open && !open.contains(e.target)) open.remove();
    });
    ovBody.innerHTML = "";
    ovBody.appendChild(panel);
  }

  function showHighScore(){
    const overlayCard = document.getElementById("overlayCard");
    if(overlayCard) overlayCard.classList.remove("mainMenuActive");
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent="High Score";
    ovSub.textContent="";
    ovBody.innerHTML=`
      <div class="compareCard">
        <div style="font-weight:1000; letter-spacing:.25px;">High Score</div>
        <div style="margin-top:8px; color:rgba(234,242,255,.75); font-size:13px; line-height:1.55;">
          <div>⏱️ Best Time: <b>${hiBestTime ? formatTime(hiBestTime) : "—"}</b></div>
          <div style="margin-top:6px;">💀 Best Kills: <b>${hiBestKills ? hiBestKills : "—"}</b></div>
          <div style="margin-top:10px; opacity:.85;">Boss has high loot chance — good chance for rare/legendary.</div>
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
        <button id="hsBack">Back</button>
        <button class="menuBtnPrimary" id="hsStart">Start Looting!</button>
        <button id="hsReset">Reset High Score</button>
      </div>
    `;
    document.getElementById("hsBack").onclick=()=>showMainMenu();
    document.getElementById("hsStart").onclick=()=>{ ensureAudio(); startGame(false); };
    document.getElementById("hsReset").onclick=()=>{
      hiBestTime=0; hiBestKills=0;
      localStorage.setItem("affixloot_best_time","0");
      localStorage.setItem("affixloot_best_kills","0");
      beep({freq:260,dur:0.08,type:"triangle",gain:0.05});
      showHighScore();
    };
  }

  // ========= Pause / Game Over =========
  function togglePause(){
    if(inCompare) return;
    if(tutorialOverlay !== null) return;
    paused=!paused;

    if(paused){
      overlay.classList.remove("hidden");
      const oc = document.getElementById("overlayCard");
      if(oc) oc.classList.remove("mainMenuActive");
      if(ovHead) ovHead.style.display="";
      ovTitle.textContent="Paused";
      ovSub.textContent="Press P to resume, or restart.";
      ovBtns.innerHTML="";
      const resume=document.createElement("button");
      resume.textContent="Resume";
      resume.onclick=()=>{ overlay.classList.add("hidden"); if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); paused=false; tLast = now(); };
      const restart=document.createElement("button");
      restart.textContent="Restart";
      restart.onclick=()=>startGame(practice);
      const menu=document.createElement("button");
      menu.textContent="Main Menu";
      menu.onclick=()=>showMainMenu();
      ovBtns.appendChild(resume);
      ovBtns.appendChild(restart);
      ovBtns.appendChild(menu);
      ovBody.innerHTML=`
        <div class="pauseVolumeWrap">
          ${getVolumeControlsHTML()}
        </div>
        <div class="pauseStatsWrap">
          <div class="pauseStatsTitle">Current Stats</div>
          <!-- TODO later: show "NEW HIGH!" behind/over a stat value when it's the highest ever in game history -->
          <div class="pauseStatsGrid" id="pauseStatsGrid"></div>
        </div>
      `;
      const grid = document.getElementById("pauseStatsGrid");
      if(grid){
        const s = computeStats(equipped);
        const atkPerSec = s.atkRate > 0 ? (1/s.atkRate).toFixed(1) : "—";
        const rows = [
          ["Damage", String(Math.round(s.dmg))],
          ["Attack speed", `${atkPerSec}/s`],
          ["Move speed", s.moveSpeed.toFixed(1)],
          ["HP", String(s.maxHP)],
          ["Shield", String(s.maxShield)],
          ["Shield regen", `${(s.shieldRegenPct*100).toFixed(1)}%`],
          ["Crit chance", `${(s.crit*100).toFixed(1)}%`],
          ["Crit damage", `${(s.critDmg*100).toFixed(0)}%`],
          ["Lifesteal", `${(s.lifesteal*100).toFixed(1)}%`],
          ["Splash", `${(s.splash*100).toFixed(1)}%`],
          ["Pierce", String(s.pierce)],
          ["Pickup", String(Math.round(s.pickup))],
          ["Slow aura", `${(s.slowAura*100).toFixed(1)}%`],
          ["Thorns", `${(s.thorns*100).toFixed(1)}%`],
          ["XP gain", `${(s.xpGainPct*100).toFixed(1)}%`],
          ["Loot invuln", `${s.lootInvulnSec.toFixed(1)}s`],
        ];
        rows.forEach(([label, value])=>{
          const row = document.createElement("div");
          row.className = "pauseStatsRow";
          row.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
          grid.appendChild(row);
        });
      }
      attachVolumeListeners(ovBody);
    } else {
      overlay.classList.add("hidden");
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      tLast = now(); // NEW: prevents dt spike & keeps time frozen while paused
    }
  }

  function gameOver(){
    running=false; paused=false; inCompare=false;
    if(runMusic){ runMusic.pause(); runMusic=null; }

    const elapsed=gameTime;
    const fin=Math.floor(elapsed);
    if(fin>hiBestTime){hiBestTime=fin; localStorage.setItem("affixloot_best_time", String(hiBestTime));}
    if(kills>hiBestKills){hiBestKills=kills; localStorage.setItem("affixloot_best_kills", String(hiBestKills));}

    overlay.classList.remove("hidden");
    const oc = document.getElementById("overlayCard");
    if(oc) oc.classList.remove("mainMenuActive");
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent="You died";
    ovSub.innerHTML = `Time: <b>${formatTime(elapsed)}</b> • Kills: <b>${kills}</b> • Loot: <b>${lootCount}</b> • Level: <b>${player.level}</b>`;

    ovBtns.innerHTML="";
    const restart=document.createElement("button");
    restart.textContent="Restart";
    restart.onclick=()=>startGame(practice);
    const menu=document.createElement("button");
    menu.textContent="Main Menu";
    menu.onclick=()=>showMainMenu();
    ovBtns.appendChild(restart);
    ovBtns.appendChild(menu);

    ovBody.innerHTML=`
      <div class="compareCard">
        <div style="font-weight:1000; letter-spacing:.25px;">All items and loot is lost</div>
        <div style="margin-top:10px; color:rgba(234,242,255,.78); font-size:12px; line-height:1.6;">
          Items stored in the Armory can be re-equipped after respawn in the pod.
        </div>
      </div>
    `;

    beep({freq:96,dur:0.22,type:"sawtooth",gain:0.07,slide:0.55});
    beep({freq:72,dur:0.30,type:"triangle",gain:0.06,slide:0.7});
  }

  // ========= Reset / Start =========
  function resetState(keepEquipped){
    enemies=[]; bullets=[]; orbs=[]; lootDrops=[]; particles=[]; levelUpRings=[];
    kills=0; lootCount=0; streak=0; streakT=0;
    threat=1.0; spawnAcc=0; atkCD=0;
    lootPickupCooldown=0;
    minibossWarned=false; minibossSpawned=false; bossWarned=false; bossSpawned=false; bossKilled=false;
    lastSpawnedBossMinute = -1;
    lastSpawnedMinibossMinute = -1;
    lastWarningWave = 0;
    lastSpawnedMegaBoss = false;
    lastMegaBossWarned = false;
    roundEnd=false; victoryPhase=false;
    victorySuckAt=0; suckActive=false;
    extractionCountdown=null;
    extractionLiftoff=null;
    extractionRocketParticles=[];
    extractionFlameRing=null;
    extractionTransition=null;
    deathSequence=null;
    tutorialOverlay=null;
    tutorialCountdown=null;
    if(tutorialBubbleEl && tutorialBubbleEl.parentNode) tutorialBubbleEl.remove();
    tutorialBubbleEl=null;
    runLootByRarity={ common:0, uncommon:0, rare:0, legendary:0 };
    runBloodMlByType={ common:0, uncommon:0, rare:0, legendary:0 };
    bloodPools = [];
    runBloodMl = {};
    gatheringPool = null;
    gatheringAccumulatedMs = 0;

    // Level 1-1 manhole-zone scenario state
    level11Active = !!(currentLevelConfig && currentLevelConfig.id === "1-1");
    level11Zones = [];
    level11ZonesCleared = 0;
    level11Arrow = null;
    level11WeldingZoneId = null;
    level11WeldMs = 0;
    level11Kills = 0;
    level11WeaponDropped = false;
    level11BossPhase = null;
    level11BossPhaseMs = 0;

    runTotalXp = 0;
    tokenBarProgress = 0;
    tokenPops = [];

    mapW = 4 * W;
    mapH = 4 * H;
    const margin = 80 * DPR;
    const manholeR = 32 * DPR;
    const fountainCx = mapW / 2, fountainCy = mapH / 2;
    const avoidR = (80 * 1.4 * DPR) + manholeR + 40 * DPR;
    manholes = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const zoneW = mapW / 2, zoneH = mapH / 3;
        let x = margin + rand(0, zoneW - 2 * margin) + col * zoneW;
        let y = margin + rand(0, zoneH - 2 * margin) + row * zoneH;
        const toFountain = Math.hypot(x - fountainCx, y - fountainCy);
        if (toFountain < avoidR) {
          const angle = Math.atan2(y - fountainCy, x - fountainCx);
          x = fountainCx + Math.cos(angle) * avoidR;
          y = fountainCy + Math.sin(angle) * avoidR;
        }
        manholes.push({ x, y, r: manholeR });
      }
    }
    const doorInset = 40 * DPR;
    // Small mall buildings: 8×5 floor tiles (tiled floor is 48×48px before DPR).
    const TILE = 48 * DPR;
    const SHOP_W = 8 * TILE;
    const SHOP_H = 5 * TILE;
    const shopTypes = [
      { id: "Hot Dog Stand",  w: SHOP_W, h: SHOP_H, fill: "#8B4513", stroke: "#5D2E0C", sign: "🌭" },
      { id: "Clothing Store", w: SHOP_W, h: SHOP_H, fill: "#4A6FA5", stroke: "#2E4563", sign: "👕" },
      { id: "Shoe Store",     w: SHOP_W, h: SHOP_H, fill: "#2C1810", stroke: "#1a0e08", sign: "👟" },
      { id: "Newsstand",      w: SHOP_W, h: SHOP_H, fill: "#C41E3A", stroke: "#8B1528", sign: "📰" },
      { id: "Flower Shop",    w: SHOP_W, h: SHOP_H, fill: "#228B22", stroke: "#145214", sign: "🌸" },
      { id: "Trash",          w: SHOP_W, h: SHOP_H, fill: "#3d3d3d", stroke: "#252525", sign: "🗑️" },
    ];
    mallProps = [];
    const zoneW = mapW / 2, zoneH = mapH / 3;
    const pad = 55 * DPR;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        // Place top-left of an 8×5 tile shop somewhere inside this zone, avoiding fountain area.
        const T = shopTypes[ mallProps.length % shopTypes.length ];
        const maxXSpan = Math.max(10, zoneW - T.w - 2*pad);
        const maxYSpan = Math.max(10, zoneH - T.h - 2*pad);
        let x = pad + rand(0, maxXSpan) + col * zoneW;
        let y = pad + rand(0, maxYSpan) + row * zoneH;
        const cx = x, cy = y;
        if (Math.hypot(cx - fountainCx, cy - fountainCy) < avoidR + 90*DPR) {
          const angle = Math.atan2(cy - fountainCy, cx - fountainCx);
          x = fountainCx + Math.cos(angle) * (avoidR + 90*DPR);
          y = fountainCy + Math.sin(angle) * (avoidR + 90*DPR);
        }
        mallProps.push({ kind: "shop", type: T.id, x, y, w: T.w, h: T.h, fill: T.fill, stroke: T.stroke, sign: T.sign });
      }
    }

    // Helper: axis-aligned rectangle overlap
    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh){
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }
    // Helper: check if proposed rect overlaps any existing mallProp or is too close to a manhole or fountain
    function canPlaceRect(x, y, w, h){
      const cx = x + w/2;
      const cy = y + h/2;
      // Keep inside map
      const marginInner = 40 * DPR;
      if(x < marginInner || y < marginInner || x + w > mapW - marginInner || y + h > mapH - marginInner) return false;
      // Avoid fountain
      const dF = Math.hypot(cx - fountainCx, cy - fountainCy);
      if(dF < avoidR + Math.max(w,h)*0.6) return false;
      // Avoid manholes
      for(const m of manholes){
        const d = Math.hypot(cx - m.x, cy - m.y);
        if(d < m.r + Math.max(w,h)*0.6) return false;
      }
      // Avoid other props
      for(const p of mallProps){
        if(rectsOverlap(x,y,w,h, p.x, p.y, p.w, p.h)) return false;
      }
      return true;
    }

    // Additional scenery: benches with trash (2×3 tiles), small flower pots (1×1), large plants (2×2)
    const BENCH_W = 2 * TILE, BENCH_H = 3 * TILE;
    const POT_W = 1 * TILE, POT_H = 1 * TILE;
    const PLANT_W = 2 * TILE, PLANT_H = 2 * TILE;

    function placeScenery(kind, count){
      const maxAttempts = 40;
      for(let i=0;i<count;i++){
        let placed = false;
        for(let attempt=0; attempt<maxAttempts && !placed; attempt++){
          let w, h;
          if(kind === "bench"){
            w = BENCH_W; h = BENCH_H;
          } else if(kind === "flowerPotSmall"){
            w = POT_W; h = POT_H;
          } else {
            w = PLANT_W; h = PLANT_H;
          }
          const x = rand(60*DPR, mapW - w - 60*DPR);
          const y = rand(60*DPR, mapH - h - 60*DPR);
          if(!canPlaceRect(x,y,w,h)) continue;
          if(kind === "bench"){
            mallProps.push({ kind:"bench", type:"Bench", x, y, w, h });
          } else if(kind === "flowerPotSmall"){
            mallProps.push({ kind:"flowerPotSmall", type:"Flower Pot", x, y, w, h });
          } else if(kind === "plantLarge"){
            // Precompute leaf layout so large plants are static (no per-frame randomness).
            const leaves = [];
            const leafCount = 7;
            for(let j=0;j<leafCount;j++){
              const ang = (j/leafCount) * Math.PI * 2;
              const mul = 0.6 + 0.4 * Math.random();
              leaves.push({ ang, mul });
            }
            mallProps.push({ kind:"plantLarge", type:"Planter", x, y, w, h, leaves });
          }
          placed = true;
        }
      }
    }

    placeScenery("bench", 5);
    placeScenery("flowerPotSmall", 8);
    placeScenery("plantLarge", 4);

    // Level 1-1: pre-place clustered mice and corpses around each manhole
    if(level11Active){
      setupLevel11Zones();
    }
    const poolR = 80 * 1.4 * DPR;
    const spawnDist = poolR + player.r + 28 * DPR;
    const spawnAngle = Math.random() * Math.PI * 2;
    player.x = fountainCx + Math.cos(spawnAngle) * spawnDist;
    player.y = fountainCy + Math.sin(spawnAngle) * spawnDist;
    player.vx=0; player.vy=0;
    player.level=1; player.xp=0; player.xpNeed=BASE.xpNeed;

    player.hp=BASE.hp; player.maxHP=BASE.hp;
    player.shield=0; player.maxShield=0;
    player.shieldRegenPct=0;
    player.invuln=0;
    player.dashT=0;
    player.dashCD=0;
    player.dashIx=0;
    player.dashIy=0;
    player.dashPending=false;
    player.lastDir="front";

    if(!keepEquipped){
      equipped={weapon:null, armor:null, ring1:null, ring2:null, jewel:null};
    }
    player.levelBonuses={};
    recomputeBuild();
    player.shield=player.maxShield;
    renderEquipMini();
    endCompareInputGate();

    // NEW: reset game clock
    gameTime = 0;
    tLast = now();
  }

  function startGame(isPractice){
    practice=!!isPractice;
    currentLevelConfig = getLevelConfig(selectedLevelId);
    if(DEV_TUTORIAL_EVERY_RUN){
      try{
        const keys = Object.keys(localStorage).filter(k => k.startsWith(TUTORIAL_STORAGE_PREFIX));
        keys.forEach(k => localStorage.removeItem(k));
      }catch(e){}
    }
    stopMenuMusic();
    if(runMusic){ runMusic.pause(); runMusic=null; }
    resetState(true);
    if(DEV_GIVE_LEGENDARY_WEAPON){
      equipped.weapon = makeItem("weapon", "legendary");
    }
    tokensAtRunStart = tokens;
    recomputeBuild();
    renderEquipMini();

    overlay.classList.add("hidden");
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
    running=true; paused=false; inCompare=false;

    const runTrack = 1 + Math.floor(Math.random() * 5);
    runMusic = new Audio(`assets/audio/${runTrack}.mp3`);
    runMusic.loop = true;
    applyMusicVolume();
    stopMenuMusic(); // ensure menu music is off before starting run track
    if(musicVol>0) runMusic.play().catch(()=>{});

    // Fountain decor: randomize position each run; currently always duck for easy mode.
    fountainDecorKind = "duck";
    fountainDecorAngle = rand(0, Math.PI * 2);
    fountainDecorRadiusFrac = 0.32 + rand(0, 0.16);

    // Level 1-1 uses custom manhole-cluster scenario; other levels use standard initial spawns
    if(!level11Active){
      if(ENDLESS_RUN){
        for(let i=0;i<28;i++) spawnEnemy(false);
      } else if(TEST_SINGLE_MOB_MODE){
        for(let i=0;i<14;i++) spawnEnemy(false);
      } else {
        for(let i=0;i<4;i++) spawnEnemy(false);
      }
    }
    ensureAudio();
  }

  // ========= Level 1-1: Manhole cluster scenario =========
  const LEVEL11_CLUSTER_PER_MANHOLE = 20;
  const LEVEL11_CLUSTER_INNER_COUNT = 6;
  const LEVEL11_MINIBOSS_DELAY_SEC = 30;
  const LEVEL11_WELD_DURATION_SEC = 3.0;
  const LEVEL11_WELD_RADIUS = 70; // world units before DPR multiplier applied when used

  function setupLevel11Zones(){
    if(!level11Active || !manholes || !manholes.length) return;
    level11Zones = [];
    level11ZonesCleared = 0;
    level11Arrow = null;
    level11WeldingZoneId = null;
    level11WeldMs = 0;

    const corpseR = player ? player.r : 10 * DPR;
    // Aggro zone slightly larger than bullet range so mice aggro before player can shoot them from outside
    const bulletRange = (BASE.bulletSpeed * BASE.bulletLife) * DPR;
    const aggroR = Math.max(260 * DPR, bulletRange * 1.12);
    const totalZones = Math.min(6, manholes.length);
    for(let i=0;i<totalZones;i++){
      const m = manholes[i];
      if(!m) continue;
      const ang = Math.random() * Math.PI * 2;
      const dist = m.r + 70 * DPR;
      const cx = m.x + Math.cos(ang) * dist;
      const cy = m.y + Math.sin(ang) * dist;
      const zone = {
        id: i,
        manholeIndex: i,
        corpseX: cx,
        corpseY: cy,
        corpseR,
        aggroR,
        activated: false,
        triggeredAt: null,
        minibossSpawned: false,
        spawnsStopped: false,
        spawnAcc: 0,
        closed: false
      };
      level11Zones.push(zone);
      spawnLevel11ClusterForZone(zone);
    }
  }

  function spawnLevel11ClusterForZone(zone){
    const total = LEVEL11_CLUSTER_PER_MANHOLE;
    const inner = Math.min(LEVEL11_CLUSTER_INNER_COUNT, total);
    const outer = total - inner;
    const innerR = zone.corpseR * 1.3;
    const outerR = zone.corpseR * 2.4;

    for(let i=0;i<total;i++){
      const isInner = i < inner;
      const ringIndex = isInner ? i : (i - inner);
      const ringCount = isInner ? inner : Math.max(1, outer);
      const baseAngle = (ringIndex / ringCount) * Math.PI * 2;
      const jitter = rand(-Math.PI * 0.04, Math.PI * 0.04);
      const ang = baseAngle + jitter;
      const baseR = isInner ? innerR : outerR;
      const r = baseR * rand(0.7, 1.15);
      const x = zone.corpseX + Math.cos(ang) * r;
      const y = zone.corpseY + Math.sin(ang) * r;

      // Reuse normal enemy creation but override position and mark as cluster-idle
      spawnEnemy(false);
      const e = enemies[enemies.length - 1];
      if(!e) continue;
      e.x = x;
      e.y = y;
      e.clusterZone = zone.id;
      e.clusterIdle = true;
      e.clusterInner = !!isInner;
      e.clusterAggro = false;
    }
  }

  function updateLevel11Zones(dt, elapsed){
    if(!level11Active || !level11Zones.length) return;

    for(const zone of level11Zones){
      const m = manholes[zone.manholeIndex];
      if(!m) continue;

      if(!zone.activated){
        // Check if player enters aggression zone around corpse
        const dx = player.x - zone.corpseX;
        const dy = player.y - zone.corpseY;
        if(dx*dx + dy*dy <= zone.aggroR * zone.aggroR){
          zone.activated = true;
          zone.triggeredAt = elapsed;
          // All cluster mice from this zone wake up and start attacking
          for(const e of enemies){
            if(e && e.clusterZone === zone.id){
              e.clusterIdle = false;
              e.clusterAggro = true;
            }
          }
          showSimpleToast("Cluster sighted — clear the zone!");
          showTutorial("manhole", "Manholes spawn enemies. Clear the zone and seal the manhole to stop the threat.", m.x, m.y);
        }
      }

      if(zone.activated && !zone.closed){
        const since = zone.triggeredAt != null ? (elapsed - zone.triggeredAt) : 0;

        // Spawn regular enemies from this manhole for a short period
        if(!zone.spawnsStopped){
          const spawnRate = 0.7; // enemies per second while active
          zone.spawnAcc += spawnRate * dt;
          while(zone.spawnAcc >= 1){
            zone.spawnAcc -= 1;
            const elite = Math.random() < 0.12;
            spawnEnemy(elite);
            const e = enemies[enemies.length - 1];
            if(e){
              const angle = Math.random() * Math.PI * 2;
              const dist = m.r + 22 * DPR;
              e.x = m.x + Math.cos(angle) * dist;
              e.y = m.y + Math.sin(angle) * dist;
              e.clusterZone = zone.id;
              e.clusterAggro = true;
            }
          }
        }

        // After delay: spawn one miniboss from this manhole and stop further spawns
        if(!zone.minibossSpawned && since >= LEVEL11_MINIBOSS_DELAY_SEC){
          zone.minibossSpawned = true;
          zone.spawnsStopped = true;
          spawnBoss(true);
          const boss = enemies[enemies.length - 1];
          if(boss){
            boss.x = m.x;
            boss.y = m.y;
            boss.clusterZone = zone.id;
            boss.clusterAggro = true;
          }
          showTutorial("miniboss", "A mini-boss has appeared! Defeat it, then seal the manhole.", m.x, m.y);
        }
      }
    }

    // Arrow timer (blink next target for a few seconds, with optional delay)
    if(level11Arrow){
      level11Arrow.t += dt;
      const delay = level11Arrow.delay || 0;
      const life = level11Arrow.life || 4;
      if(level11Arrow.t >= delay + life){
        level11Arrow = null;
      }
    }

    // Handle welding interaction (similar to blood sample collection)
    updateLevel11Weld(dt, elapsed);

    // Handle boss warning + spawn sequence after all manholes are sealed
    updateLevel11BossPhase(dt);
  }

  function updateLevel11Weld(dt, elapsed){
    if(!level11Active || !level11Zones.length) return;

    const weldR = LEVEL11_WELD_RADIUS * DPR;
    let candidate = null;

    for(const zone of level11Zones){
      if(!zone.activated || zone.closed) continue;

      // Zone must be cleared of its own enemies before welding
      let hasZoneEnemies = false;
      for(const e of enemies){
        if(!e) continue;
        if(e.clusterZone === zone.id){
          hasZoneEnemies = true;
          break;
        }
      }
      if(hasZoneEnemies) continue;

      const m = manholes[zone.manholeIndex];
      if(!m) continue;
      const dx = player.x - m.x;
      const dy = player.y - m.y;
      const d2 = dx*dx + dy*dy;
      if(d2 <= weldR * weldR){
        candidate = zone;
        break;
      }
    }

    if(!candidate){
      level11WeldingZoneId = null;
      level11WeldMs = 0;
      return;
    }

    if(level11WeldingZoneId !== candidate.id){
      level11WeldingZoneId = candidate.id;
      level11WeldMs = 0;
    }

    // Pause welding during compare/menus
    if(inCompare || paused || victoryPhase) return;

    level11WeldMs += dt * 1000;
    if(level11WeldMs >= LEVEL11_WELD_DURATION_SEC * 1000){
      candidate.closed = true;
      level11ZonesCleared++;
      if(level11ZonesCleared > level11Zones.length) level11ZonesCleared = level11Zones.length;
      level11WeldingZoneId = null;
      level11WeldMs = 0;

      // Mark underlying manhole as closed and spawn a small ring effect
      const manhole = manholes[candidate.manholeIndex];
      if(manhole){
        manhole.closed = true;
        levelUpRings.push({
          x: manhole.x,
          y: manhole.y,
          r: 0,
          maxR: manhole.r * 2.6,
          life: 0.6,
          t: 0
        });
      }

      // Notification
      showSimpleToast("Manhole Sealed");

      // Point towards nearest next zone (unsealed manhole) for a few seconds
      let next = null;
      let bestD2 = Infinity;
      if(level11ZonesCleared < level11Zones.length){
        const srcManhole = manhole;
        if(srcManhole){
          for(const z of level11Zones){
            if(z.closed) continue;
            const mz = manholes[z.manholeIndex];
            if(!mz) continue;
            const dx = mz.x - srcManhole.x;
            const dy = mz.y - srcManhole.y;
            const d2 = dx*dx + dy*dy;
            if(d2 < bestD2){
              bestD2 = d2;
              next = z;
            }
          }
        }
      }
      if(next){
        const m2 = manholes[next.manholeIndex];
        if(m2){
          // Arrow: 1s delay, then blink for 4s pointing from player towards next manhole.
          level11Arrow = { targetX: m2.x, targetY: m2.y, t: 0, life: 4, delay: 1 };
        }
      }

      // If this was the last manhole, start boss warning sequence
      if(level11ZonesCleared === level11Zones.length && level11Zones.length > 0 && !level11BossPhase){
        level11BossPhase = "warnDelay";
        level11BossPhaseMs = 0;
      }
    }
  }

  function updateLevel11BossPhase(dt){
    if(!level11Active || !level11Zones.length) return;
    if(level11ZonesCleared < level11Zones.length) return;
    if(!level11BossPhase) return;

    level11BossPhaseMs += dt;

    if(level11BossPhase === "warnDelay" && level11BossPhaseMs >= 5){
      level11BossPhase = "warned";
      level11BossPhaseMs = 0;
      if(bossBanner){
        bossBanner.textContent = "⚠️ BOSS INCOMING! ⚠️";
        bossBanner.classList.remove("show"); void bossBanner.offsetWidth;
        bossBanner.classList.add("show");
      }
      bossApproachSound();
      return;
    }

    if(level11BossPhase === "warned" && level11BossPhaseMs >= 5){
      level11BossPhase = "spawned";
      level11BossPhaseMs = 0;
      // Spawn main boss and then hand control back to endless spawn system
      spawnBoss(false);
      const mainBoss = enemies[enemies.length - 1];
      if(mainBoss) showTutorial("boss", "The boss has appeared! Defeat it to enable extraction.", mainBoss.x, mainBoss.y);
      level11Active = false; // re-enable global endless spawns and wave bosses
    }
  }

  // ========= HUD =========
  function updateHUD(elapsedS){
    const hpPct=player.maxHP>0 ? player.hp/player.maxHP : 0;
    hpFill.style.width=`${clamp(hpPct,0,1)*100}%`;
    hpTxt.textContent=`${Math.round(player.hp)}/${Math.round(player.maxHP)}`;

    const shPct=player.maxShield>0 ? player.shield/player.maxShield : 0;
    shFill.style.width=`${clamp(shPct,0,1)*100}%`;
    shTxt.textContent=`${Math.round(player.shield)}/${Math.round(player.maxShield)}`;

    const xpPct=player.xpNeed>0 ? player.xp/player.xpNeed : 0;
    xpFill.style.width=`${clamp(xpPct,0,1)*100}%`;
    xpTxt.textContent=`${Math.round(player.xp)}/${Math.round(player.xpNeed)}`;

    const tokenPct = Math.min(1, tokenBarProgress / 1000);
    if(tokenFill) tokenFill.style.width=`${tokenPct*100}%`;
    if(tokenTxt) tokenTxt.textContent=`${Math.round(tokenBarProgress)}/1000`;

    tTag.textContent=formatTime(elapsedS);
    kTag.textContent=`${kills}`;
    lTag.textContent=`${lootCount}`;
    dpsTag.textContent=`DPS ${Math.round(player.dpsEst)}`;
    streakTag.textContent=`${streak}`;
    threatTag.textContent=`${threat.toFixed(2)}×`;

    // NEW: show only during active run; keep out of menus/overlays
    const showRunStats = running; // running is false in menus/after victory/game over
    dmgWrap.style.display = showRunStats ? "inline-flex" : "none";
    atkWrap.style.display = showRunStats ? "inline-flex" : "none";

    if(showRunStats){
      dmgTag.textContent = `DMG ${Math.round(player.dmg)}`;
      const atkPerSec = 1 / Math.max(0.0001, player.atkRate);
      atkTag.textContent = `ATK ${atkPerSec.toFixed(2)}/s`;
    }
  }

  function updateQuestAfterSuccessfulRun(summary, elapsedS){
    if(!questState || !questState.active) return;
    const q = questState.active;
    if(q.kind === "kills"){
      q.progressKills = (q.progressKills||0) + (kills||0);
      if(q.progressKills >= (q.target||0)){
        questState.completed = q;
        questState.active = null;
        showSimpleToast("✓ Quest complete! Return to base.");
      }
    } else if(q.kind === "survive"){
      q.progressSeconds = (q.progressSeconds||0) + (elapsedS||0);
      if(q.progressSeconds >= (q.targetSeconds||0)){
        questState.completed = q;
        questState.active = null;
        showSimpleToast("✓ Quest complete! Return to base.");
      }
    } else if(q.kind === "blood"){
      let gainedMl = 0;
      if(summary && summary.runBloodMl){
        for(const id in summary.runBloodMl){
          gainedMl += summary.runBloodMl[id]|0;
        }
      }
      q.progressMl = (q.progressMl||0) + gainedMl;
      if(q.progressMl >= (q.targetMl||0)){
        questState.completed = q;
        questState.active = null;
        showSimpleToast("✓ Quest complete! Return to base.");
      }
    }
    saveQuestState();
  }

  // ========= Main loop =========
  function loop(){
    requestAnimationFrame(loop);
    try {
      render();
    } catch (err) {
      console.error("Render error:", err);
      return;
    }

    // NOTE: Hard freeze time handled by not advancing gameTime when paused/not running
    if(!running || paused) return;

    const t=now();
    let dt=(t-tLast)/1000;
    dt=Math.min(dt,0.033);
    tLast=t;

    // NEW: advance game clock only while running & unpaused
    gameTime += dt;
    const elapsed = gameTime;
    const lvl = currentLevelConfig || getLevelConfig("1-1");
    const roundSeconds = lvl.roundSeconds;

    // Level 1-1: update manhole zones (aggression, spawns, miniboss timers, welding)
    if(level11Active){
      updateLevel11Zones(dt, elapsed);
    }

    // Extraction countdown: when X pressed, count down; at 0 and alive → liftoff
    if(extractionCountdown!=null){
      extractionCountdown -= dt;
      if(extractionCountdown<=0){
        extractionCountdown=null;
        if(player.hp>0){
          extractionLiftoff = { t: 0, duration: EXTRACTION_LIFTOFF_DURATION, ignitionDuration: EXTRACTION_IGNITION_DURATION, rocketSounded: false };
          extractionFlameRing = { t: 0, duration: 0.7, maxR: 550*DPR };
          spawnLevelUpRing(player.x, player.y);
          for(let n=0;n<28;n++){
            extractionRocketParticles.push({
              x: player.x + rand(-20,20)*DPR, y: player.y,
              vx: rand(-40,40)*DPR, vy: rand(80,220)*DPR,
              r: rand(8,22)*DPR, life: rand(0.3,0.7), t: 0,
              col: pick(["#ff6600","#ff8800","#ffaa00","#ff2200"])
            });
          }
          beep({freq:55,dur:0.25,type:"sawtooth",gain:0.08,slide:0.3});
          beep({freq:75,dur:0.18,type:"sawtooth",gain:0.05,slide:0.5});
          beep({noise:true,dur:0.12,gain:0.04});
        }
      }
    }
    if(player.hp<=0) extractionCountdown=null;

    // Extraction liftoff: flame ring spreads and kills mobs (loot stays), then scale animation
    if(extractionLiftoff){
      extractionLiftoff.t += dt;
      if(extractionFlameRing){
        extractionFlameRing.t += dt;
        const ringR = Math.min(extractionFlameRing.maxR, (extractionFlameRing.t / extractionFlameRing.duration) * extractionFlameRing.maxR);
        for(let i=enemies.length-1;i>=0;i--){
          const e=enemies[i];
          if(dist2(player.x,player.y,e.x,e.y) <= ringR*ringR) killEnemy(e);
        }
        if(extractionFlameRing.t >= extractionFlameRing.duration) extractionFlameRing=null;
      }
      if(!extractionLiftoff.rocketSounded && extractionLiftoff.t >= extractionLiftoff.ignitionDuration){
        extractionLiftoff.rocketSounded = true;
        beep({freq:65,dur:0.35,type:"sawtooth",gain:0.07,slide:0.2});
        beep({freq:45,dur:0.28,type:"sawtooth",gain:0.05,slide:0.15});
        beep({noise:true,dur:0.2,gain:0.035});
      }
      for(let i=levelUpRings.length-1;i>=0;i--){
        const r=levelUpRings[i];
        r.t+=dt;
        r.r=r.maxR*Math.min(1,r.t/r.life);
        if(r.t>=r.life) levelUpRings.splice(i,1);
      }
      for(let i=extractionRocketParticles.length-1;i>=0;i--){
        const p=extractionRocketParticles[i];
        p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.98; p.vy*=1.02;
        if(p.t>=p.life) extractionRocketParticles.splice(i,1);
      }
      if(extractionLiftoff.t >= extractionLiftoff.duration){
        extractionSummaryData = {
          tokensEarned: Math.max(0, tokens - tokensAtRunStart),
          lootByRarity: { ...runLootByRarity },
          bloodMlByType: { ...runBloodMlByType },
          runBloodMl: { ...runBloodMl }
        };
        extractionTransition = { t: 0, duration: 1.2 };
        extractionLiftoff=null;
        extractionRocketParticles=[];
      }
      updateHUD(elapsed);
      return;
    }

    if(extractionTransition){
      extractionTransition.t += dt;
      if(extractionTransition.t >= extractionTransition.duration){
        const savedSummary = extractionSummaryData;
        updateQuestAfterSuccessfulRun(savedSummary, elapsed);
        for(const id in runBloodMl){ baseBloodMl[id] = (baseBloodMl[id]||0) + runBloodMl[id]; }
        if(Object.keys(runBloodMl).length) localStorage.setItem("affixloot_base_blood_ml", JSON.stringify(baseBloodMl));
        extractionTransition = null;
        extractionSummaryData = null;
        running = false;
        if(runMusic){ runMusic.pause(); runMusic.currentTime=0; runMusic=null; }
        applyMusicVolume();
        resetState(true);
        showMainMenu();
        if(menuMusic && musicVol>0) menuMusic.play().catch(()=>{});
        showExtractionSummary(savedSummary);
      }
      updateHUD(elapsed);
      return;
    }

    if(deathSequence){
      deathSequence.t += dt;
      const dx = deathSequence.px, dy = deathSequence.py;
      const feedSpeed = 45*DPR;
      for(const e of enemies){
        const ex= e.x, ey= e.y;
        const d = Math.hypot(dx-ex, dy-ey)||1;
        if(d > e.r + player.r*1.2){
          e.x += ((dx-ex)/d)*feedSpeed*dt;
          e.y += ((dy-ey)/d)*feedSpeed*dt;
        }
        if(e.hitFlash>0) e.hitFlash-=dt;
      }
      if(Math.random() < 0.42){
        const a = Math.random()*Math.PI*2;
        const sp = rand(40,140)*DPR;
        particles.push({
          x: dx + rand(-12,12)*DPR, y: dy + rand(-12,12)*DPR,
          vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - rand(0,30)*DPR,
          r: rand(2,6)*DPR, life: rand(0.4,0.9), t: 0,
          col: pick(["#8b0000","#660000","#4a0000","#2d0000","#1a0000"])
        });
      }
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
        p.vx*=(1-2.8*dt); p.vy*=(1-2.8*dt); p.vy+=20*DPR*dt;
        if(p.t>p.life) particles.splice(i,1);
      }
      if(deathSequence.t >= deathSequence.duration){
        equipped = { weapon: null, armor: null, ring1: null, ring2: null, jewel: null };
        deathSequence = null;
        gameOver();
      }
      updateHUD(elapsed);
      return;
    }

    // round end: no more spawns (disabled in endless)
    if(!practice && !ENDLESS_RUN && elapsed>=roundSeconds && !roundEnd){
      roundEnd=true;
    }

    // Endless: miniboss every 20s; every 3rd = boss. Warning ~2s before (always run when ENDLESS_RUN).
    // For level 1-1, we only want the boss to spawn after all manholes are sealed,
    // so we disable the normal wave-based boss/miniboss logic entirely there.
    if(!practice && (!level11Active && !(currentLevelConfig && currentLevelConfig.id === "1-1")) && (ENDLESS_RUN || !TEST_SINGLE_MOB_MODE)){
      if(ENDLESS_RUN){
        const currentWave = Math.floor(elapsed / 20);
        const nextWave = Math.max(1, lastSpawnedMinibossMinute + 1);
        const isBossWave = nextWave > 0 && nextWave % 3 === 0;

        if(elapsed >= nextWave * 20 - 2 && nextWave > lastWarningWave){
          lastWarningWave = nextWave;
          bossBanner.textContent = isBossWave ? "⚠️ BOSS INCOMING! ⚠️" : "⚠️ MINIBOSS INCOMING! ⚠️";
          bossBanner.classList.remove("show"); void bossBanner.offsetWidth;
          bossBanner.classList.add("show");
          bossApproachSound();
        }
        if(currentWave >= 1 && currentWave > lastSpawnedMinibossMinute){
          lastSpawnedMinibossMinute = currentWave;
          const spawnBossThisWave = (currentWave % 3 === 0);
          if(spawnBossThisWave){
            bossBanner.textContent = "⚠️ BOSS! ⚠️";
            bossBanner.classList.remove("show"); void bossBanner.offsetWidth;
            bossBanner.classList.add("show");
            spawnBoss(false, currentWave);
            beep({freq:120,dur:0.22,type:"sawtooth",gain:0.07,slide:0.6});
            beep({noise:true,dur:0.06,gain:0.025});
          } else {
            bossBanner.textContent = "⚠️ MINIBOSS! ⚠️";
            bossBanner.classList.remove("show"); void bossBanner.offsetWidth;
            bossBanner.classList.add("show");
            spawnBoss(true, currentWave);
            beep({freq:160,dur:0.18,type:"triangle",gain:0.06,slide:0.7});
            beep({noise:true,dur:0.05,gain:0.02});
          }
        }

        if(elapsed >= 148 && !lastMegaBossWarned){
          lastMegaBossWarned = true;
          bossBanner.textContent = "⚠️ MEGA BOSS INCOMING! ⚠️";
          bossBanner.classList.remove("show"); void bossBanner.offsetWidth;
          bossBanner.classList.add("show");
          bossApproachSound();
        }
        if(elapsed >= 150 && !lastSpawnedMegaBoss){
          lastSpawnedMegaBoss = true;
          bossBanner.textContent = "⚠️ MEGA BOSS! ⚠️";
          bossBanner.classList.remove("show"); void bossBanner.offsetWidth;
          bossBanner.classList.add("show");
          spawnMegaBoss();
          beep({freq:100,dur:0.28,type:"sawtooth",gain:0.08,slide:0.5});
          beep({noise:true,dur:0.08,gain:0.03});
        }
      } else {
        const minibossApproachAt = roundSeconds * lvl.minibossPct * 0.9;
        const minibossSpawnAt = roundSeconds * lvl.minibossPct;
        const bossApproachAt = roundSeconds * lvl.bossPct - 8;
        const bossSpawnAt = roundSeconds * lvl.bossPct;
        if(!minibossWarned && elapsed>=minibossApproachAt){
          minibossWarned=true;
          bossBanner.textContent="⚠️ MINIBOSS! ⚠️";
          bossBanner.classList.remove("show"); void bossBanner.offsetWidth;
          bossBanner.classList.add("show");
          bossApproachSound();
        }
        if(!minibossSpawned && elapsed>=minibossSpawnAt){
          minibossSpawned=true;
          spawnBoss(true);
          beep({freq:160,dur:0.18,type:"triangle",gain:0.06,slide:0.7});
          beep({noise:true,dur:0.05,gain:0.02});
        }
        if(!bossWarned && elapsed>=bossApproachAt){
          bossWarned=true;
          bossBanner.textContent="⚠️ BOSS APPROACHING! ⚠️";
          bossBanner.classList.remove("show"); void bossBanner.offsetWidth;
          bossBanner.classList.add("show");
          bossApproachSound();
        }
        if(!bossSpawned && elapsed>=bossSpawnAt){
          bossSpawned=true;
          spawnBoss(false);
          beep({freq:160,dur:0.18,type:"triangle",gain:0.06,slide:0.7});
          beep({noise:true,dur:0.05,gain:0.02});
        }
      }
    }

    // victory when all enemies dead after round end (2.5 min)
    if(roundEnd && enemies.length===0 && !victoryPhase){
      victoryPhase=true;
      victorySuckAt=now()+2000; // start suck + fanfare in 2s
      beep({freq:1040,dur:0.12,type:"triangle",gain:0.06});
      beep({freq:1560,dur:0.16,type:"sine",gain:0.06,slide:0.75});
    }
    if(victoryPhase && victorySuckAt>0 && now()>=victorySuckAt){
      victorySuckAt=0;
      suckActive=true;
      victorySuckFanfare();
    }

    // spawning: endless = 20% more mobs per 20s (rate × 1.2^wave); mobs get 1.2^wave HP/speed/dmg
    if(!level11Active){
      if(ENDLESS_RUN || !roundEnd){
        if(ENDLESS_RUN || !TEST_SINGLE_MOB_MODE){
          if(ENDLESS_RUN){
            const baseRate = 0.47;
            const spawnsPerSec = baseRate * getWaveScale();
            spawnAcc += Math.min(2, spawnsPerSec) * dt;
          } else {
            threat = 1.0 + (elapsed*elapsed) / (lvl.threatDivisor || 1800);
            const baseRate = (0.26 + elapsed/75) * (lvl.spawnScale || 1);
            spawnAcc += baseRate * threat * 0.45 * dt;
          }
          while(spawnAcc>=1){
            spawnAcc -= 1;
            const eliteChance = clamp(0.02 + elapsed/110, 0.02, 0.12);
            spawnEnemy(Math.random()<eliteChance);
          }
        }
      }
    }
    if(!ENDLESS_RUN && roundEnd){
      threat = 1.0 + (elapsed*elapsed) / (lvl.threatDivisor || 1800);
    }

    streakT -= dt;
    if(streakT<=0){streak=0;streakT=0;}

    if(player.maxShield>0 && player.shieldRegenPct>0){
      player.shield=clamp(player.shield + player.maxShield*player.shieldRegenPct*dt, 0, player.maxShield);
    }
    if(player.invuln>0) player.invuln -= dt;

    // movement (WASD only; arrows used for shooting)
    const up=keys.has("w");
    const down=keys.has("s");
    const left=keys.has("a");
    const right=keys.has("d");
    let ix=(right?1:0)-(left?1:0);
    let iy=(down?1:0)-(up?1:0);
    const il=Math.hypot(ix,iy)||1;
    if(ix||iy){ ix/=il; iy/=il; }

    player.dashCD=Math.max(0, player.dashCD-dt);
    let speed=player.moveSpeed*DPR;

    // Defer dash direction by one frame so all keydowns (e.g. W+A+Space) are in keys set.
    // Fixes diagonal dash (e.g. up-left) when Space is delivered before arrow keys locally/debug.
    if(player.dashPending){
      const dx=(right?1:0)-(left?1:0), dy=(down?1:0)-(up?1:0);
      const dl=Math.hypot(dx,dy);
      if(dl>0){
        player.dashIx=dx/dl;
        player.dashIy=dy/dl;
        player.dashT=BASE.dashDur;
        player.dashCD=BASE.dashCD;
        player.invuln=Math.max(player.invuln,0.12);
        beep({freq:620,dur:0.06,type:"triangle",gain:0.05,slide:1.4});
      }
      player.dashPending=false;
    } else if(keys.has("space") && player.dashCD<=0 && !player.dashT){
      player.dashPending=true;
    }
    if(player.dashT>0){
      player.dashT-=dt;
      speed=BASE.dashSpeed*DPR;
      player.vx=player.dashIx*speed;
      player.vy=player.dashIy*speed;
    } else {
      player.vx=ix*speed;
      player.vy=iy*speed;
    }
    const margin = 24 * DPR;
    player.x=clamp(player.x+player.vx*dt, margin, mapW-margin);
    player.y=clamp(player.y+player.vy*dt, margin, mapH-margin);
    let out = pushOutOfFountain(player.x, player.y, player.r);
    player.x = out.x; player.y = out.y;
    out = pushOutOfManholes(player.x, player.y, player.r);
    player.x = out.x; player.y = out.y;
    out = pushOutOfMallProps(player.x, player.y, player.r);
    player.x = out.x; player.y = out.y;
    const plSpeed = Math.sqrt(player.vx*player.vx + player.vy*player.vy);
    if (plSpeed > 0.5*DPR) {
      const vy = player.vy || 0;
      let dir = vy < 0 ? "back" : "front";
      const aimUp = keys.has("arrowup"), aimDown = keys.has("arrowdown");
      if (vy > 0 && aimUp && !aimDown) dir = "back";
      else if (vy < 0 && aimDown && !aimUp) dir = "front";
      player.lastDir = dir;
    }

    // slow aura
    const aura=player.slowAura;
    const auraR=(90+aura*120)*DPR;
    const auraR2=auraR*auraR;

    // enemies move + collision
    for(const e of enemies){
      if(!e || typeof e.x !== "number" || typeof e.y !== "number") continue;

      const isClusterIdle = level11Active && e.clusterZone != null && !e.clusterAggro;
      if(isClusterIdle){
        // Cluster mice for level 1-1 stay on their corpse until their zone is triggered
        if(e.hitFlash>0) e.hitFlash-=dt;
        continue;
      }

      // Move enemy toward player (with slow aura)
      const dx0 = player.x - e.x, dy0 = player.y - e.y;
      const d0 = Math.hypot(dx0,dy0) || 1;
      let sp = e.sp;
      // 1-1: fastest mice never faster than character — cap just below player speed
      if(lvl.id === "1-1" && sp > player.moveSpeed * DPR) sp = player.moveSpeed * DPR * 0.99;
      if(aura>0 && (dx0*dx0+dy0*dy0)<auraR2) sp *= (1-aura);
      e.x += (dx0/d0)*sp*dt;
      e.y += (dy0/d0)*sp*dt;

      // Push enemies out of static obstacles
      let eOut = pushOutOfFountain(e.x, e.y, e.r);
      e.x = eOut.x; e.y = eOut.y;
      eOut = pushOutOfManholes(e.x, e.y, e.r);
      e.x = eOut.x; e.y = eOut.y;
      eOut = pushOutOfMallProps(e.x, e.y, e.r);
      e.x = eOut.x; e.y = eOut.y;
      if(e.hitFlash>0) e.hitFlash-=dt;

      // Player contact damage + separation: enemies stay at least MIN_GAP from player center (can touch and deal damage, but not overlap sprite)
      const minGap = 22 * DPR;
      const rr = (player.r + e.r + minGap);
      const dx = player.x - e.x, dy = player.y - e.y;
      const dist2 = dx*dx + dy*dy;
      if(dist2 < rr*rr){
        const contact = e.contactDmg != null ? e.contactDmg : (e.boss?18: e.elite?12:7);
        takeDamage(contact);
        if(player.thorns>0){
          const th=Math.round((e.boss?18:e.elite?10:6)*player.thorns);
          if(th>0) hitEnemy(e, th);
        }
        const d = Math.sqrt(dist2) || 1;
        const push = rr - d;
        if(push > 0){
          const nx = dx / d, ny = dy / d;
          e.x -= nx * push;
          e.y -= ny * push;
        }
      }
    }

    // shooting (arrow keys = 8 directions; no autofire)
    atkCD -= dt;
    const arrowUp=keys.has("arrowup"), arrowDown=keys.has("arrowdown");
    const arrowLeft=keys.has("arrowleft"), arrowRight=keys.has("arrowright");
    const ax=(arrowRight?1:0)-(arrowLeft?1:0), ay=(arrowDown?1:0)-(arrowUp?1:0);
    if(atkCD<=0 && (ax!==0 || ay!==0)){
      const len=Math.hypot(ax,ay)||1;
      const ux = ax/len, uy = ay/len;
      shootInDirection(ux, uy);
      player.lastShotUx = ux;
      player.lastShotUy = uy;
      atkCD = player.atkRate;
    }

    // bullets
    for(let i=bullets.length-1;i>=0;i--){
      const b=bullets[i];
      b.x += b.vx*dt; b.y += b.vy*dt;
      b.life -= dt;
      if(b.life<=0 || b.x<-100 || b.x>mapW+100 || b.y<-100 || b.y>mapH+100){
        bullets.splice(i,1); continue;
      }
      for(let j=enemies.length-1;j>=0;j--){
        const e=enemies[j];
        const rr=b.r+e.r;
        if(dist2(b.x,b.y,e.x,e.y) < rr*rr){
          let dealt=b.dmg;
          if(b.crit) dealt=Math.round(dealt*player.critDmg);
          hitEnemy(e,dealt);
          healFromLifesteal(dealt);
          if(player.splash>0) splashDamage(e.x,e.y, Math.round(dealt*player.splash));
          if(b.pierce>0){
            b.pierce--;
            b.x += b.vx*0.002; b.y += b.vy*0.002;
          } else bullets.splice(i,1);
          break;
        }
      }
    }

    // orbs
    for(let i=orbs.length-1;i>=0;i--){
      const o=orbs[i];
      const d2p=dist2(o.x,o.y,player.x,player.y);
      const rr=player.r+o.r;
      if(suckActive){
        const d=Math.sqrt(d2p)||1;
        const sp=1200*DPR;
        o.vx = ((player.x-o.x)/d)*sp;
        o.vy = ((player.y-o.y)/d)*sp;
        o.x += o.vx*dt; o.y += o.vy*dt;
      } else {
        o.x += o.vx*dt; o.y += o.vy*dt;
        o.vx *= (1-4*dt); o.vy *= (1-4*dt);
        const pr=player.pickup*DPR;
        if(d2p < pr*pr){
          const d=Math.sqrt(d2p)||1;
          const pull=clamp(1-d/pr,0,1);
          const sp=(240+pull*520)*DPR;
          o.vx += ((player.x-o.x)/d)*sp*dt;
          o.vy += ((player.y-o.y)/d)*sp*dt;
        }
      }
      const d2pCheck=dist2(o.x,o.y,player.x,player.y);
      if(d2pCheck < rr*rr){
        orbs.splice(i,1);
        const xpAmt = o.r>5*DPR?6:3;
        gainXP(xpAmt);
        runBloodMlByType.common = (runBloodMlByType.common||0) + (o.r>5*DPR?3:1);
        beep({freq:880,dur:0.02,type:"sine",gain:0.02,slide:0.92});
      }
    }

    // Blood pools: age in seconds; 0–10s = sampleable (red → dark); 10s = coagulated; remove after 20s
    const R = BLOOD_GATHER_RADIUS * DPR;
    for (let i = bloodPools.length - 1; i >= 0; i--) {
      const pool = bloodPools[i];
      if (pool.gathered) {
        bloodPools.splice(i, 1);
        continue;
      }
      const ageMs = now() - pool.spawnT;
      const ageSec = ageMs / 1000;
      if (ageSec >= BLOOD_POOL_REMOVE_AFTER_SEC) {
        bloodPools.splice(i, 1);
        continue;
      }
      if (ageSec >= BLOOD_POOL_MAX_AGE_SEC) pool.expired = true;
      if (!pool.coagulated && ageSec >= BLOOD_COAGULATE_SEC) pool.coagulated = true;
      if (!pool.coagulated || pool.expired) {
        if (gatheringPool === pool) gatheringPool = null;
        continue;
      }
      const d2 = dist2(pool.x, pool.y, player.x, player.y);
      if (d2 < R * R) {
        if (!gatheringPool || gatheringPool !== pool) {
          gatheringPool = pool;
          gatheringAccumulatedMs = 0;
        }
        if (!inCompare && !paused) gatheringAccumulatedMs += dt * 1000;
        if (gatheringAccumulatedMs >= BLOOD_GATHER_SEC * 1000) {
          runBloodMl[pool.bloodTypeId] = (runBloodMl[pool.bloodTypeId] || 0) + pool.ml;
          pool.gathered = true;
          gatheringPool = null;
          gatheringAccumulatedMs = 0;
          showSimpleToast("Blood sample secured +" + pool.ml + " ml");
          beep({ freq: 523, dur: 0.09, type: "sine", gain: 0.14 });
          setTimeout(() => { beep({ freq: 659, dur: 0.10, type: "sine", gain: 0.12 }); }, 70);
        }
      } else {
        if (gatheringPool === pool) gatheringPool = null;
      }
    }

    if(lootPickupCooldown>0) lootPickupCooldown -= dt;

    // loot drops -> compare (no magnet; pickup only by walking over)
    for(let i=lootDrops.length-1;i>=0;i--){
      const L=lootDrops[i];
      L.t += dt;
      const d2p=dist2(L.x,L.y,player.x,player.y);
      const rr=player.r+L.r;
      if(d2p < rr*rr && lootPickupCooldown<=0){
        openCompare(L);
        break;
      }
    }

    // particles
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];
      p.t += dt;
      p.x += p.vx*dt;
      p.y += p.vy*dt;
      p.vx *= (1-2.8*dt);
      p.vy *= (1-2.8*dt);
      p.vy += 20*DPR*dt;
      if(p.t > p.life) particles.splice(i,1);
    }
    // level-up rings
    for(let i=levelUpRings.length-1;i>=0;i--){
      const r=levelUpRings[i];
      r.t += dt;
      r.r = r.maxR * Math.min(1, r.t / r.life);
      if(r.t >= r.life) levelUpRings.splice(i,1);
    }
    // token pop effects (float up, fade)
    for(let i=tokenPops.length-1;i>=0;i--){
      const pop=tokenPops[i];
      pop.t += dt;
      if(pop.t >= pop.life) tokenPops.splice(i,1);
    }

    updateHUD(elapsed);
  }

  // ========= Rendering =========
  function drawGrid(){
    const step = 46*DPR;
    ctx.save();
    ctx.globalAlpha = 0.095;
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1*DPR;

    const ox = (player.x*0.08) % step;
    const oy = (player.y*0.08) % step;

    for(let x=-step; x<W+step; x+=step){
      ctx.beginPath();
      ctx.moveTo(x+ox,0);
      ctx.lineTo(x+ox,H);
      ctx.stroke();
    }
    for(let y=-step; y<H+step; y+=step){
      ctx.beginPath();
      ctx.moveTo(0,y+oy);
      ctx.lineTo(W,y+oy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function glowCircle(x,y,r,color,alpha=1,blur=22){
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur*DPR;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function roundRect(x,y,w,h,r){
    r=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y, x+w,y+h, r);
    ctx.arcTo(x+w,y+h, x,y+h, r);
    ctx.arcTo(x,y+h, x,y, r);
    ctx.arcTo(x,y, x+w,y, r);
    ctx.closePath();
  }

  // Mall 1st floor: tiled floor with variation, grout, subtle gradients, rare cracks
  function drawMallFloorPlaceholder(){
    const tile = 48 * DPR;
    const gap = Math.max(1, 1 * DPR);
    const w = Math.ceil(mapW / tile) + 1;
    const h = Math.ceil(mapH / tile) + 1;
    ctx.save();
    // Deterministic hash for (i,j) – same run = same look
    function tileHash(i, j){ let v = (i * 31 + j) * 2654435761; return (v >>> 0) % 100000; }
    const shades = ["#4a4439", "#423b32", "#3d362e", "#353028"];
    // Base = grout (dark lines between tiles)
    ctx.fillStyle = "#2a2520";
    ctx.fillRect(0, 0, mapW, mapH);
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        const x = i * tile + gap;
        const y = j * tile + gap;
        const size = tile - gap * 2;
        const h = tileHash(i, j);
        const baseColor = shades[h % shades.length];
        const darkColor = shades[(h + 2) % shades.length];
        const g = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size * 0.6);
        g.addColorStop(0, baseColor);
        g.addColorStop(1, darkColor);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, size, size);
        // Rare cracks (~8% of tiles), spread so similar ones are far apart
        if ((i * 7 + j * 11) % 13 === 2) {
          ctx.strokeStyle = "rgba(22,20,16,0.75)";
          ctx.lineWidth = 1.2 * DPR;
          const cx = x + size/2, cy = y + size/2;
          const angle = (h % 360) * Math.PI / 180;
          const len = size * (0.12 + (h % 25) / 150);
          ctx.beginPath();
          ctx.moveTo(cx - Math.cos(angle) * len, cy - Math.sin(angle) * len);
          ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
          ctx.stroke();
          if (h % 3 === 0) {
            const a2 = angle + 0.7;
            const len2 = size * 0.1;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a2) * len2, cy + Math.sin(a2) * len2);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  // Fountain collision: same radius as drawn pool (solid obstacle)
  const FOUNTAIN_R = 80 * 1.4 * 1;  // *DPR applied when used
  let fountainDecorKind = "duck";   // "duck" for easy; "skull" reserved for hard mode later
  let fountainDecorAngle = 0;
  let fountainDecorRadiusFrac = 0.4;
  function getFountainCenter(){ return { cx: mapW / 2, cy: mapH / 2 }; }
  function pushOutOfFountain(x, y, entityR){
    const { cx, cy } = getFountainCenter();
    const fr = FOUNTAIN_R * DPR;
    const d = Math.hypot(x - cx, y - cy) || 1;
    const minDist = fr + entityR;
    if (d < minDist) {
      const scale = minDist / d;
      return { x: cx + (x - cx) * scale, y: cy + (y - cy) * scale };
    }
    return { x, y };
  }

  function pushOutOfCircle(x, y, entityR, cx, cy, cr){
    const d = Math.hypot(x - cx, y - cy) || 1;
    const minDist = cr + entityR;
    if (d < minDist) {
      const scale = minDist / d;
      return { x: cx + (x - cx) * scale, y: cy + (y - cy) * scale };
    }
    return { x, y };
  }
  function pushOutOfManholes(x, y, entityR){
    let px = x, py = y;
    for (const m of manholes) {
      const out = pushOutOfCircle(px, py, entityR, m.x, m.y, m.r);
      px = out.x; py = out.y;
    }
    return { x: px, y: py };
  }

  function pushOutOfRect(px, py, entityR, rx, ry, rw, rh){
    const cx = clamp(px, rx, rx + rw);
    const cy = clamp(py, ry, ry + rh);
    const d = Math.hypot(px - cx, py - cy) || 1;
    const minDist = entityR + 2*DPR;
    if (d < minDist) {
      const scale = minDist / d;
      return { x: cx + (px - cx) * scale, y: cy + (py - cy) * scale };
    }
    return { x: px, y: py };
  }
  function pushOutOfMallProps(x, y, entityR){
    let px = x, py = y;
    for (const p of mallProps) {
      const out = pushOutOfRect(px, py, entityR, p.x, p.y, p.w, p.h);
      px = out.x; py = out.y;
    }
    return { x: px, y: py };
  }

  function drawFountain(){
    const cx = mapW / 2, cy = mapH / 2;
    const t = now() * 0.001;
    const baseR = 80 * DPR;
    const poolR = baseR * 1.4;
    const ringW = 14 * DPR;
    const waterR = poolR - ringW;
    const coreR = waterR * 0.22;
    ctx.save();
    // 1) Outer concrete ring (betongring)
    ctx.fillStyle = "#5c554a";
    ctx.beginPath();
    ctx.arc(cx, cy, poolR, 0, Math.PI * 2);
    ctx.arc(cx, cy, waterR, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.strokeStyle = "#7a7266";
    ctx.lineWidth = 2 * DPR;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, poolR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, waterR, 0, Math.PI * 2);
    ctx.strokeStyle = "#4a4438";
    ctx.stroke();
    // 2) Water – gradient + subtle shimmer (slight ellipse pulse)
    const wave = 1 + 0.018 * Math.sin(t * 2.2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, wave);
    ctx.translate(-cx, -cy);
    const waterG = ctx.createRadialGradient(cx, cy, 0, cx, cy, waterR);
    waterG.addColorStop(0, "#5a9ab5");
    waterG.addColorStop(0.5, "#3d6b85");
    waterG.addColorStop(0.85, "#2c4a5e");
    waterG.addColorStop(1, "#243a4a");
    ctx.fillStyle = waterG;
    ctx.beginPath();
    ctx.arc(cx, cy, waterR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(90,160,200,0.35)";
    ctx.lineWidth = 1.5 * DPR;
    ctx.beginPath();
    ctx.arc(cx, cy, waterR, 0, Math.PI * 2);
    ctx.stroke();
    // 3) Wavy water surface line + floating decor (duck for easy; skull for hard later)
    const decorAngle = fountainDecorAngle || 0;
    const decorR = waterR * (fountainDecorRadiusFrac || 0.4);
    const decorX = cx + Math.cos(decorAngle) * decorR;
    const baseDecorY = cy + Math.sin(decorAngle) * (waterR * 0.25);
    const isDuck = fountainDecorKind === "duck";
    const bobAmp = (isDuck ? 1.2 : 2.5) * DPR;
    const decorBob = bobAmp * Math.sin(t * (isDuck ? 1.2 : 1.6));
    const decorY = baseDecorY + decorBob;
    const lineHalfW = (isDuck ? 22 : 18) * DPR;
    const waveAmp = 2.2 * DPR;
    const waveFreq = 0.12;
    const waveY = (x) => baseDecorY + waveAmp * Math.sin((x - decorX) * waveFreq);
    ctx.save();
    ctx.strokeStyle = "rgba(25,45,65,0.85)";
    ctx.lineWidth = 2.2 * DPR;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const x = decorX - lineHalfW + (i / 24) * (2 * lineHalfW);
      const y = waveY(x);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    const topY = baseDecorY - 20 * DPR;
    ctx.moveTo(decorX - lineHalfW, topY);
    ctx.lineTo(decorX + lineHalfW, topY);
    ctx.lineTo(decorX + lineHalfW, waveY(decorX + lineHalfW));
    for (let i = 23; i >= 0; i--) {
      const x = decorX - lineHalfW + (i / 24) * (2 * lineHalfW);
      ctx.lineTo(x, waveY(x));
    }
    ctx.closePath();
    ctx.clip();
    ctx.save();
    ctx.translate(decorX, decorY);
    if(!isDuck) ctx.rotate(-Math.PI * 0.25);
    ctx.font = `${22 * DPR}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(isDuck ? "🦆" : "💀", 0, 0);
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  function drawMallProps(){
    ctx.save();
    for (const p of mallProps) {
      const x = p.x, y = p.y, w = p.w, h = p.h;
      if(p.kind && p.kind !== "shop"){
        // Non-shop props: benches, pots, large plants
        if(p.kind === "bench"){
          const seatH = h * 0.25;
          const backH = h * 0.25;
          const seatY = y + h - seatH - 4*DPR;
          const backY = seatY - backH;
          // Bench back
          ctx.fillStyle = "rgba(90,70,50,0.96)";
          ctx.strokeStyle = "rgba(30,22,15,0.9)";
          ctx.lineWidth = 2 * DPR;
          roundRect(x + 4*DPR, backY, w - 30*DPR, backH, 4*DPR);
          ctx.fill();
          ctx.stroke();
          // Bench seat
          ctx.fillStyle = "rgba(130,95,60,0.98)";
          roundRect(x + 4*DPR, seatY, w - 30*DPR, seatH, 4*DPR);
          ctx.fill();
          // Legs
          ctx.fillStyle = "rgba(20,16,12,0.9)";
          const legW = 6*DPR, legH = seatH*0.7;
          ctx.fillRect(x + 10*DPR, seatY + seatH - 2*DPR, legW, legH);
          ctx.fillRect(x + w - 10*DPR - legW, seatY + seatH - 2*DPR, legW, legH);
          // Trash can at one end
          const binW = 20*DPR, binH = h * 0.7;
          const binX = x + w - binW - 4*DPR;
          const binY = y + h - binH - 2*DPR;
          const binGrad = ctx.createLinearGradient(binX, binY, binX, binY + binH);
          binGrad.addColorStop(0, "rgba(60,70,80,0.98)");
          binGrad.addColorStop(1, "rgba(30,34,40,0.98)");
          ctx.fillStyle = binGrad;
          roundRect(binX, binY, binW, binH, 5*DPR);
          ctx.fill();
          ctx.strokeStyle = "rgba(200,220,255,0.5)";
          ctx.lineWidth = 1 * DPR;
          ctx.beginPath();
          ctx.moveTo(binX + 4*DPR, binY + 8*DPR);
          ctx.lineTo(binX + binW - 4*DPR, binY + 8*DPR);
          ctx.stroke();
          ctx.font = `${10*DPR}px ui-sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(220,230,240,0.95)";
          ctx.fillText("🗑️", binX + binW/2, binY + binH*0.45);
        } else if(p.kind === "flowerPotSmall"){
          // Small flower pot (1×1 tile)
          const potH = h * 0.4;
          const potY = y + h - potH;
          const potGrad = ctx.createLinearGradient(x, potY, x, potY + potH);
          potGrad.addColorStop(0, "rgba(140,90,55,0.98)");
          potGrad.addColorStop(1, "rgba(90,60,35,0.98)");
          ctx.fillStyle = potGrad;
          roundRect(x + 4*DPR, potY, w - 8*DPR, potH, 5*DPR);
          ctx.fill();
          // Soil
          ctx.fillStyle = "rgba(40,26,18,0.95)";
          roundRect(x + 5*DPR, potY - 4*DPR, w - 10*DPR, 6*DPR, 4*DPR);
          ctx.fill();
          // Flowers/leaves
          const cx = x + w/2;
          const cy = potY - 6*DPR;
          ctx.fillStyle = "rgba(70,150,85,0.96)";
          ctx.beginPath();
          ctx.arc(cx, cy, w*0.3, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,210,120,0.96)";
          ctx.beginPath();
          ctx.arc(cx, cy, w*0.14, 0, Math.PI*2);
          ctx.fill();
        } else if(p.kind === "plantLarge"){
          // Large planter with lots of leaves (2×2 tiles)
          const potH = h * 0.35;
          const potY = y + h - potH;
          ctx.fillStyle = "rgba(60,60,65,0.98)";
          roundRect(x + 6*DPR, potY, w - 12*DPR, potH, 8*DPR);
          ctx.fill();
          ctx.strokeStyle = "rgba(210,220,230,0.28)";
          ctx.lineWidth = 1.5*DPR;
          ctx.beginPath();
          ctx.moveTo(x + 10*DPR, potY + 8*DPR);
          ctx.lineTo(x + w - 10*DPR, potY + 8*DPR);
          ctx.stroke();
          // Dense leaves above
        const cx = x + w/2;
        const baseY = potY - 6*DPR;
        const leafR = Math.min(w, h) * 0.35;
        const leafColors = ["rgba(50,135,80,0.98)","rgba(40,115,70,0.96)","rgba(30,95,60,0.96)"];
        const leaves = Array.isArray(p.leaves) && p.leaves.length ? p.leaves : [
          { ang: 0, mul: 0.9 },
          { ang: Math.PI*0.35, mul: 0.8 },
          { ang: Math.PI*0.7, mul: 1.0 },
          { ang: Math.PI*1.05, mul: 0.75 },
          { ang: Math.PI*1.4, mul: 0.85 },
          { ang: Math.PI*1.75, mul: 0.95 },
          { ang: Math.PI*2.1, mul: 0.7 },
        ];
        for(let i=0;i<leaves.length;i++){
          const cfg = leaves[i];
          const ang = cfg.ang;
          const r = leafR * cfg.mul;
          const lx = cx + Math.cos(ang)*r*0.5;
          const ly = baseY + Math.sin(ang)*r*0.4;
          ctx.fillStyle = leafColors[i % leafColors.length];
          ctx.beginPath();
          ctx.ellipse(lx, ly, r*0.55, r*0.9, ang, 0, Math.PI*2);
          ctx.fill();
        }
        }
        continue;
      }
      // Shops
      const roofH = h * 0.22;
      const facadeY = y + roofH;
      const facadeH = h - roofH;

      // Building base (walls)
      ctx.fillStyle = p.fill;
      ctx.strokeStyle = p.stroke;
      ctx.lineWidth = 3 * DPR;
      roundRect(x, y, w, h, 10 * DPR);
      ctx.fill();
      ctx.stroke();

      // Roof
      ctx.save();
      ctx.fillStyle = "rgba(12,10,8,0.95)";
      roundRect(x, y, w, roofH, 10 * DPR);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1.5 * DPR;
      ctx.beginPath();
      ctx.moveTo(x + 6*DPR, y + roofH - 3*DPR);
      ctx.lineTo(x + w - 6*DPR, y + roofH - 3*DPR);
      ctx.stroke();
      ctx.restore();

      // Glass facade
      const glassTop = facadeY + 6*DPR;
      const glassH = facadeH - 18*DPR;
      const glassW = w - 16*DPR;
      const gx = x + 8*DPR;
      const gy = glassTop;
      const glassGrad = ctx.createLinearGradient(gx, gy, gx, gy + glassH);
      glassGrad.addColorStop(0, "rgba(190,230,255,0.85)");
      glassGrad.addColorStop(0.4, "rgba(130,190,230,0.75)");
      glassGrad.addColorStop(1, "rgba(60,100,140,0.85)");
      ctx.fillStyle = glassGrad;
      roundRect(gx, gy, glassW, glassH, 8 * DPR);
      ctx.fill();
      // Vertical mullions
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.2 * DPR;
      const cols = 4;
      for(let i=1;i<cols;i++){
        const cx = gx + (glassW * i/cols);
        ctx.beginPath();
        ctx.moveTo(cx, gy + 4*DPR);
        ctx.lineTo(cx, gy + glassH - 4*DPR);
        ctx.stroke();
      }
      // Horizontal mullion
      ctx.beginPath();
      ctx.moveTo(gx + 4*DPR, gy + glassH*0.55);
      ctx.lineTo(gx + glassW - 4*DPR, gy + glassH*0.55);
      ctx.stroke();

      // Door (simple darker glass panel in midten)
      const doorW = Math.min(46*DPR, glassW * 0.22);
      const doorH = glassH * 0.65;
      const doorX = x + w*0.5 - doorW/2;
      const doorY = gy + glassH - doorH - 4*DPR;
      const doorGrad = ctx.createLinearGradient(doorX, doorY, doorX, doorY + doorH);
      doorGrad.addColorStop(0, "rgba(170,220,255,0.95)");
      doorGrad.addColorStop(1, "rgba(80,130,180,0.95)");
      ctx.fillStyle = doorGrad;
      roundRect(doorX, doorY, doorW, doorH, 6 * DPR);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1 * DPR;
      ctx.beginPath();
      ctx.moveTo(doorX + doorW*0.5, doorY + 6*DPR);
      ctx.lineTo(doorX + doorW*0.5, doorY + doorH - 6*DPR);
      ctx.stroke();

      // Sign with icon + name
      const signW = Math.min(w * 0.65, 220 * DPR);
      const signH = roofH * 0.55;
      const signX = x + w*0.5 - signW/2;
      const signY = y + roofH*0.15;
      const signGrad = ctx.createLinearGradient(signX, signY, signX, signY + signH);
      signGrad.addColorStop(0, "rgba(20,20,26,0.96)");
      signGrad.addColorStop(1, "rgba(55,65,80,0.96)");
      ctx.fillStyle = signGrad;
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.6 * DPR;
      roundRect(signX, signY, signW, signH, 999);
      ctx.fill();
      ctx.stroke();

      const name = String(p.type || "").toUpperCase();
      ctx.font = `${11*DPR}px ui-sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(240,245,255,0.96)";
      const textX = signX + signW*0.5;
      const textY = signY + signH*0.5;
      const label = `${p.sign || ""} ${name}`.trim();
      ctx.fillText(label, textX, textY);
    }
    ctx.restore();
  }

  function drawManholes(){
    ctx.save();
    for (const m of manholes) {
      const r = m.r;
      const isClosed = !!m.closed;
      // Outer ring
      ctx.fillStyle = isClosed ? "#254026" : "#3a3632";
      ctx.strokeStyle = isClosed ? "#5e9b60" : "#5c5750";
      ctx.lineWidth = 3 * DPR;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Inner disc
      ctx.fillStyle = isClosed ? "#1b2f1d" : "#2a2824";
      ctx.beginPath();
      ctx.arc(m.x, m.y, r * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isClosed ? "#6ecf73" : "#4a4540";
      ctx.lineWidth = 1.5 * DPR;
      ctx.stroke();
      // Center plug
      ctx.fillStyle = isClosed ? "#142015" : "#1e1c1a";
      ctx.beginPath();
      ctx.arc(m.x, m.y, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const DOOR_W = 56 * DPR;
  const DOOR_H = 90 * DPR;
  const DOOR_INSET = 40 * DPR;
  function drawBlackOutsideMap(){
    const pad = 1e4;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 1;
    ctx.fillRect(-pad, -pad, pad, mapH + pad);           // left
    ctx.fillRect(mapW, -pad, pad, mapH + pad);          // right
    ctx.fillRect(0, -pad, mapW, pad);                    // top
    ctx.fillRect(0, mapH, mapW, pad);                    // bottom
    ctx.restore();
  }

  function drawDoors(){
    ctx.save();
    const d = DOOR_INSET;
    const dw = DOOR_W, dh = DOOR_H;
    const drawDoor = (x, y, vertical) => {
      const w = vertical ? dh : dw;
      const h = vertical ? dw : dh;
      ctx.fillStyle = "#2a2520";
      ctx.strokeStyle = "rgba(180,160,120,0.6)";
      ctx.lineWidth = 2 * DPR;
      roundRect(x - w/2, y - h/2, w, h, 6 * DPR);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "rgba(120,100,80,0.5)";
      roundRect(x - w/2 + 4*DPR, y - h/2 + 4*DPR, w - 8*DPR, h - 8*DPR, 4 * DPR);
      ctx.fill();
    };
    drawDoor(mapW / 2, d, false);           // north
    drawDoor(mapW / 2, mapH - d, false);   // south
    drawDoor(d, mapH / 2, true);            // west
    drawDoor(mapW - d, mapH / 2, true);     // east
    ctx.restore();
  }

  function render(){
    // Tutorial countdown tick (runs every frame while countdown active)
    if(tutorialCountdown !== null){
      if(now() >= tutorialCountdownEndT){
        tutorialCountdown--;
        tutorialCountdownEndT = now() + 1;
        if(tutorialCountdown <= 0){
          tutorialCountdown = null;
          paused = false;
          tLast = now();
        }
      }
    }

    ctx.clearRect(0,0,W,H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.beginPath();

    if(extractionTransition){
      ctx.fillStyle = "rgb(0,0,0)";
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const camOffsetX = W*0.5 - player.x;
    const camOffsetY = H*0.5 - player.y;

    if(extractionLiftoff){
      const ign = extractionLiftoff.ignitionDuration || 0;
      const liftDur = extractionLiftoff.duration - ign;
      const liftProgress = extractionLiftoff.t <= ign ? 0 : Math.min(1, (extractionLiftoff.t - ign) / liftDur);
      const progress = extractionLiftoff.t <= ign ? (extractionLiftoff.t / ign) * 0.06 : 0.06 + (1 - 0.06) * liftProgress;
      const worldScale = 1 / (1 + progress * 2.2);
      const playerScale = 1 + progress * 2.2;
      ctx.save();
      ctx.translate(camOffsetX, camOffsetY);
      ctx.translate(player.x, player.y);
      ctx.scale(worldScale, worldScale);
      ctx.translate(-player.x, -player.y);
      if (mapW > 0 && mapH > 0) {
        drawMallFloorPlaceholder();
        drawFountain();
        drawManholes();
        drawMallProps();
        drawDoors();
        drawBlackOutsideMap();
      }
      for(const L of lootDrops) drawLoot(L);
      for(const p of bloodPools) drawBloodPool(p);
      for(const o of orbs) drawOrb(o);
      for(const b of bullets) drawBullet(b);
      for(const e of enemies) drawEnemy(e);
      for(const p of particles) drawParticle(p);
      if(extractionFlameRing){
        const ringR = Math.min(extractionFlameRing.maxR, (extractionFlameRing.t / extractionFlameRing.duration) * extractionFlameRing.maxR);
        const ringW = 56*DPR;
        ctx.save();
        const cx = player.x, cy = player.y;
        const grad = ctx.createRadialGradient(cx, cy, Math.max(0, ringR - ringW), cx, cy, ringR + ringW);
        grad.addColorStop(0, "rgba(255,60,10,0.15)");
        grad.addColorStop(0.4, "rgba(255,140,40,0.5)");
        grad.addColorStop(0.6, "rgba(255,200,80,0.4)");
        grad.addColorStop(0.85, "rgba(255,100,20,0.2)");
        grad.addColorStop(1, "rgba(40,10,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR + ringW, 0, Math.PI*2);
        ctx.arc(cx, cy, Math.max(0, ringR - ringW), 0, Math.PI*2, true);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,160,50,0.85)";
        ctx.lineWidth = ringW * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI*2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,220,120,0.5)";
        ctx.lineWidth = ringW * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }
      for(const ring of levelUpRings) drawLevelUpRing(ring);
      drawBloodGatherBar();
      drawLevel11WeldBar();
      for(const p of extractionRocketParticles){
        const t=p.t/p.life;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.col;
        ctx.shadowColor = p.col;
        ctx.shadowBlur = 12*DPR;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r*(1+t), 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      // Draw extraction sprite centered on screen (screen-space), on top of world
      drawExtractionSpriteScreenCenter();
    } else {
      ctx.save();
      ctx.translate(camOffsetX, camOffsetY);
      if (mapW > 0 && mapH > 0) {
        drawMallFloorPlaceholder();
        drawFountain();
        drawManholes();
        drawMallProps();
        drawDoors();
        drawBlackOutsideMap();
      }
      for(const L of lootDrops) drawLoot(L);
      for(const p of bloodPools) drawBloodPool(p);
      for(const o of orbs) drawOrb(o);
      for(const b of bullets) drawBullet(b);
      for(const e of enemies) drawEnemy(e);
      for(const p of particles) drawParticle(p);
      for(const ring of levelUpRings) drawLevelUpRing(ring);
      drawBloodGatherBar();
      drawLevel11WeldBar();
      if(deathSequence) drawCorpse(); else drawPlayer();
      for(const pop of tokenPops) drawTokenPop(pop);
      ctx.restore();
    }

    // Level 1-1: permanent sealed counter (1/6 … 6/6) + arrow to next/miniboss manhole
    if(currentLevelConfig && currentLevelConfig.id === "1-1" && level11Zones.length > 0){
      drawLevel11StatusHUD();
    }
    if((level11Active || (currentLevelConfig && currentLevelConfig.id === "1-1")) && level11Arrow){
      drawLevel11ArrowIndicator();
    }

    if(extractionCountdown!=null && extractionCountdown>0){
      const sec = Math.ceil(extractionCountdown);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `bold ${Math.min(72, W/8)*DPR}px ui-sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,200,80,0.95)";
      ctx.shadowColor = "rgba(255,180,50,0.9)";
      ctx.shadowBlur = 20*DPR;
      ctx.fillText("Extraction: " + sec, W/2, H*0.22);
      ctx.restore();
    }

    if(victoryPhase){
      ctx.save();
      ctx.globalAlpha=0.92;
      ctx.fillStyle="rgba(0,0,0,0.35)";
      ctx.fillRect(0,0,W,H);
      ctx.font=`bold ${Math.min(72, W/10)*DPR}px ui-sans-serif`;
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillStyle="rgba(255,220,100,0.98)";
      ctx.shadowColor="rgba(255,200,80,0.9)";
      ctx.shadowBlur=24*DPR;
      ctx.fillText("Victory!", W/2, H*0.32);
      ctx.font=`${14*DPR}px ui-sans-serif`;
      ctx.fillStyle="rgba(234,242,255,0.9)";
      ctx.shadowBlur=0;
      ctx.fillText("Collect XP — press M or Esc for menu", W/2, H*0.42);
      ctx.restore();
    }

    // Tutorial overlay: dim game and highlight ring at focus (screen space)
    if(tutorialOverlay){
      const camOffsetX = W*0.5 - player.x;
      const camOffsetY = H*0.5 - player.y;
      const sx = camOffsetX + tutorialOverlay.focusX;
      const sy = camOffsetY + tutorialOverlay.focusY;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,220,80,0.95)";
      ctx.lineWidth = 4 * DPR;
      ctx.shadowColor = "rgba(255,200,50,0.9)";
      ctx.shadowBlur = 24 * DPR;
      const ringR = 48 * DPR;
      ctx.beginPath();
      ctx.arc(sx, sy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Tutorial countdown 3-2-1
    if(tutorialCountdown !== null && tutorialCountdown > 0){
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `bold ${Math.min(120, W/5)}px ui-sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,240,180,0.98)";
      ctx.shadowColor = "rgba(255,200,80,0.9)";
      ctx.shadowBlur = 20 * DPR;
      ctx.fillText(String(tutorialCountdown), W/2, H/2);
      ctx.restore();
    }
  }

  function showVictoryEndScreen(){
    if(!victoryPhase) return;
    running=false;
    if(runMusic){ runMusic.pause(); runMusic=null; }
    const elapsed=gameTime;
    const fin=Math.floor(elapsed);
    if(fin>hiBestTime){hiBestTime=fin; localStorage.setItem("affixloot_best_time", String(hiBestTime));}
    if(kills>hiBestKills){hiBestKills=kills; localStorage.setItem("affixloot_best_kills", String(hiBestKills));}
    // Unlock next level on victory (non-practice)
    if(!practice && currentLevelConfig){
      const idx = LEVELS.findIndex(l=>l.id===currentLevelConfig.id);
      if(idx>=0 && idx<LEVELS.length-1){
        const nextId = LEVELS[idx+1].id;
        if(!unlockedLevels.includes(nextId)){
          unlockedLevels.push(nextId);
          localStorage.setItem("affixloot_unlocked_levels", JSON.stringify(unlockedLevels));
        }
      }
    }
    overlay.classList.remove("hidden");
    const oc = document.getElementById("overlayCard");
    if(oc) oc.classList.remove("mainMenuActive");
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent="Victory!";
    ovSub.innerHTML=`Round complete! Level <b>${currentLevelConfig ? currentLevelConfig.id : selectedLevelId}</b> • Kills: <b>${kills}</b> • Loot: <b>${lootCount}</b> • Level: <b>${player.level}</b>`;
    ovBtns.innerHTML="";
    const again=document.createElement("button");
    again.textContent="Run it back";
    again.onclick=()=>startGame(false);
    const menu=document.createElement("button");
    menu.textContent="Main Menu";
    menu.onclick=()=>showMainMenu();
    ovBtns.appendChild(again);
    ovBtns.appendChild(menu);
    ovBody.innerHTML="";
  }

  function drawCorpse(){
    const x = player.x, y = player.y, r = player.r;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(x, y + 10*DPR, r*1.2, r*0.5, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    const bodyGrad = ctx.createRadialGradient(x - r*0.3, y - r*0.2, 0, x, y, r*1.5);
    bodyGrad.addColorStop(0, "rgba(80,20,15,0.95)");
    bodyGrad.addColorStop(0.5, "rgba(50,10,8,0.9)");
    bodyGrad.addColorStop(1, "rgba(25,5,5,0.85)");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, r*1.1, r*0.85, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,10,8,0.8)";
    ctx.lineWidth = 2*DPR;
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer(){
    const t=now()*0.001;

    if(extractionLiftoff){
      // During extraction we draw the sprite in a dedicated screen-space helper.
      drawExtractionSpriteScreenCenter();
      return;
    }

    function drawPlayerFallback(){
      ctx.save();
      ctx.globalAlpha = (player.invuln > 0.4) ? (0.4 + 0.6 * Math.abs(Math.sin(t * 18))) : 1;
      const bodyGrad=ctx.createRadialGradient(player.x-player.r*0.4, player.y-player.r*0.5, 2, player.x, player.y, player.r*1.6);
      bodyGrad.addColorStop(0, "rgba(255,255,255,0.95)");
      bodyGrad.addColorStop(0.2, "rgba(200,220,255,0.9)");
      bodyGrad.addColorStop(0.5, "rgba(100,140,200,0.85)");
      bodyGrad.addColorStop(1, "rgba(30,50,90,0.95)");
      ctx.fillStyle=bodyGrad;
      ctx.strokeStyle="rgba(200,220,255,0.35)";
      ctx.lineWidth=2*DPR;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      const domeR = player.r * 0.92;
      ctx.beginPath();
      ctx.arc(player.x, player.y - player.r*0.15, domeR, 0, Math.PI*2);
      const domeGrad = ctx.createRadialGradient(player.x - domeR*0.3, player.y - player.r*0.4, 0, player.x, player.y - player.r*0.15, domeR);
      domeGrad.addColorStop(0, "rgba(220,240,255,0.55)");
      domeGrad.addColorStop(0.5, "rgba(180,220,255,0.25)");
      domeGrad.addColorStop(1, "rgba(140,200,255,0.12)");
      ctx.fillStyle = domeGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5*DPR;
      ctx.stroke();
      ctx.font = `${16*DPR}px ui-sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle="rgba(0,0,0,0.65)";
      ctx.fillText("😺", player.x, player.y+1*DPR);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha=0.18;
    ctx.fillStyle="rgba(0,0,0,0.7)";
    ctx.beginPath();
    ctx.ellipse(player.x, player.y+10*DPR, player.r*1.05, player.r*0.70, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    glowCircle(player.x, player.y, player.r*0.85, "rgba(120,180,255,0.65)", 0.30, 26);

    const blinkAlpha = (player.invuln > 0.4) ? (0.4 + 0.6 * Math.abs(Math.sin(t * 18))) : 1;
    ctx.save();
    ctx.globalAlpha = blinkAlpha;

    const spriteReady = (img) => img && img.complete && img.naturalWidth > 0;
    const hasFront = playerSprites.front.length >= 1 && spriteReady(playerSprites.front[0]);
    const hasBack = playerSprites.back.length >= 1 && spriteReady(playerSprites.back[0]);

    if (hasFront && hasBack) {
      const vy = player.vy || 0;
      const speed = Math.sqrt((player.vx||0)**2 + (player.vy||0)**2);
      const standing = speed <= 0.5*DPR;
      const lastD = player.lastDir || "front";
      let img = null;
      if (standing) {
        const idle = lastD === "back" ? playerSprites.backIdle : playerSprites.frontIdle;
        if (idle && spriteReady(idle)) img = idle;
        if (!img) {
          const dir = lastD;
          const frames = playerSprites[dir];
          img = frames[0];
        }
      }
      if (!img) {
        let dir;
        if (standing) {
          dir = lastD;
        } else {
          dir = vy < 0 ? "back" : "front";
          const aimUp = keys.has("arrowup"), aimDown = keys.has("arrowdown");
          if (vy > 0 && aimUp && !aimDown) dir = "back";
          else if (vy < 0 && aimDown && !aimUp) dir = "front";
        }
        const frames = playerSprites[dir];
        const frameIndex = Math.min(Math.floor((t * 4 + (player.animOffset || 0)) % 2), frames.length - 1);
        img = frames[frameIndex];
      }
      if (img && spriteReady(img)) {
        const size = player.r * 16;
        const w = size, h = size;
        ctx.drawImage(img, player.x - w/2, player.y - h/2, w, h);
      } else {
        drawPlayerFallback();
      }
    } else {
      drawPlayerFallback();
    }
    ctx.restore();

    if(player.dashT>0){
      ctx.save();
      ctx.globalAlpha=0.25;
      ctx.strokeStyle="rgba(120,180,255,0.85)";
      ctx.lineWidth=4*DPR;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r*2.0, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    if(player.shield>0){
      const pct = player.maxShield>0 ? player.shield/player.maxShield : 0;
      ctx.save();
      ctx.globalAlpha = 0.18 + pct*0.18;
      ctx.strokeStyle = "rgba(78,166,255,0.92)";
      ctx.lineWidth = 3*DPR;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r+6*DPR, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    if(player.invuln>0){
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2*DPR;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r+10*DPR + Math.sin(t*18)*2*DPR, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemy(e){
    const hpPct=clamp(e.hp/e.maxHP,0,1);
    const isBoss = e.boss;
    const isSkMouse = e.kind === "skitteringMouse";

    // Shadow
    ctx.save();
    ctx.globalAlpha=0.15;
    ctx.fillStyle="rgba(0,0,0,0.8)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y+6*DPR, e.r*0.54, e.r*0.35, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    const spriteReady = (img) => img && img.complete && img.naturalWidth > 0;
    const hasMoveFrames = spriteReady(skMouseSprites.move1) && spriteReady(skMouseSprites.move2);
    const hasAnySprite = spriteReady(skMouseSprites.base) || hasMoveFrames;
    if (isSkMouse && hasAnySprite) {
      // Only move1 and move2 (2-frame run loop); no gape frame.
      const t = now()*0.001 + (e.animOffset || 0);
      let img = null;
      if (hasMoveFrames) {
        const phase = Math.floor(t*10)%2;
        img = phase === 0 ? skMouseSprites.move1 : skMouseSprites.move2;
      } else if (spriteReady(skMouseSprites.base)) {
        img = skMouseSprites.base;
      }
      if (img && spriteReady(img)) {
        const size = e.r*4.8;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, e.x - size/2, e.y - size/2, size, size);
        ctx.restore();
      } else {
        ctx.save();
        ctx.font = `${18*DPR}px ui-sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillText(e.icon, e.x, e.y + 1*DPR);
        ctx.restore();
      }
    } else {
      const glowCol = isBoss ? "rgba(255,210,77,0.85)" : e.elite ? "rgba(255,138,42,0.86)" : "rgba(255,77,109,0.78)";
      glowCircle(e.x,e.y,e.r*0.9, glowCol, isBoss?0.34:(e.elite?0.26:0.20), isBoss?44:(e.elite?34:26));

      const grad=ctx.createRadialGradient(e.x-e.r*0.4, e.y-e.r*0.5, 2, e.x, e.y, e.r*1.7);
      grad.addColorStop(0, "rgba(255,255,255,0.22)");
      grad.addColorStop(0.3, isBoss ? "rgba(255,210,77,0.20)" : e.elite ? "rgba(255,138,42,0.24)" : "rgba(255,77,109,0.20)");
      grad.addColorStop(1, "rgba(6,8,18,0.95)");
      ctx.fillStyle=grad;
      ctx.strokeStyle = isBoss ? "rgba(255,210,77,0.55)" : e.elite ? "rgba(255,138,42,0.42)" : "rgba(255,255,255,0.12)";
      ctx.lineWidth=2*DPR;
      ctx.beginPath();
      ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();

      if(e.hitFlash>0){
        ctx.save();
        ctx.globalAlpha=0.35*(e.hitFlash/0.12);
        ctx.fillStyle="rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(e.x,e.y,e.r*0.92,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.font = `${(isBoss?30:(e.elite?22:18))*DPR}px ui-sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle="rgba(255,255,255,0.92)";
      ctx.fillText(e.icon, e.x, e.y+1*DPR);
      ctx.restore();
    }

    // HP bar
    const bw=e.r*2.2, bh=6*DPR;
    const bx=e.x-bw/2, by=e.y-e.r-14*DPR;
    ctx.save();
    ctx.globalAlpha=0.85;
    ctx.fillStyle="rgba(255,255,255,0.10)";
    roundRect(bx,by,bw,bh,999); ctx.fill();
    ctx.fillStyle = isBoss ? "rgba(255,210,77,0.95)" : e.elite ? "rgba(255,138,42,0.95)" : "rgba(255,77,109,0.92)";
    roundRect(bx,by,bw*hpPct,bh,999); ctx.fill();
    ctx.restore();
  }

  function drawBullet(b){
    const col = b.crit ? "rgba(255,210,77,0.95)" : "rgba(124,255,178,0.95)";
    glowCircle(b.x,b.y,b.r,col,0.20,18);
    ctx.save();
    ctx.fillStyle=col;
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawOrb(o){
    glowCircle(o.x,o.y,o.r,"rgba(124,255,178,0.8)",0.10,18);
    ctx.save();
    ctx.fillStyle="rgba(124,255,178,0.92)";
    ctx.beginPath();
    ctx.arc(o.x,o.y,o.r,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawLoot(L){
    const it=L.item;
    const c=RAR[it.rarity].color;
    const t=(L.t||0)+L.bob;
    const sizePulse=1+0.075*Math.sin(t*4);
    const baseR=L.r*1.5;
    const r=baseR*sizePulse;

    ctx.save();
    ctx.translate(L.x, L.y+16*DPR);

    const grad=ctx.createRadialGradient(-r*0.35, -r*0.45, 2, 0, 0, r*2.0);
    grad.addColorStop(0, "rgba(255,255,255,0.26)");
    grad.addColorStop(0.28, `${c}66`);
    grad.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.arc(0,0,r,0,Math.PI*2);
    ctx.fill();

    ctx.font=`${(20*1.5)*DPR}px ui-sans-serif`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="rgba(255,255,255,0.96)";
    ctx.fillText(it.icon, 0, 1*DPR);

    ctx.restore();
  }

  function drawBloodPool(pool){
    const mainR = pool.mainR != null ? pool.mainR : 14 * DPR;
    const ageSec = (now() - pool.spawnT) / 1000;
    const coagulated = !!pool.coagulated;
    const expired = !!pool.expired;
    const stageIndex = Math.min(4, Math.floor(ageSec / 2));
    const col = expired ? "#0d0000" : (BLOOD_POOL_COLOR_STAGES[stageIndex] || pool.bloodTypeColor || "#c0392b");
    ctx.save();
    ctx.globalAlpha = expired ? 0.7 : 0.96;
    ctx.fillStyle = col;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = Math.max(1, 2 * DPR * (pool.scale || 1));

    ctx.beginPath();
    ctx.arc(pool.x, pool.y, mainR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (pool.secondary && pool.secondary.length) {
      for (const s of pool.secondary) {
        ctx.beginPath();
        ctx.arc(pool.x + s.dx, pool.y + s.dy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (pool.splatter && pool.splatter.length) {
      for (const sp of pool.splatter) {
        ctx.beginPath();
        ctx.arc(pool.x + sp.dx, pool.y + sp.dy, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBloodGatherBar(){
    if(!gatheringPool) return;
    const t = clamp(gatheringAccumulatedMs / (BLOOD_GATHER_SEC * 1000), 0, 1);
    const bw = 72 * DPR;
    const bh = 12 * DPR;
    const x = player.x - bw / 2;
    const y = player.y - player.r - 32 * DPR;
    const fillW = bw * (1 - t);
    ctx.save();
    try {
      ctx.beginPath();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3 * DPR;
      roundRect(x, y, bw, bh, 999);
      ctx.fill();
      ctx.stroke();
      if(fillW > 3 * DPR){
        const innerW = fillW - 2 * DPR;
        if(innerW > 0){
          ctx.fillStyle = "rgba(255,240,200,0.98)";
          roundRect(x + (bw - fillW), y + 2*DPR, innerW, bh - 4*DPR, 999);
          ctx.fill();
        }
      }
    } finally {
      ctx.restore();
      ctx.beginPath();
    }
  }

  function drawExtractionSpriteScreenCenter(){
    const extractionImg = playerSprites.extraction;
    const idle = playerSprites.frontIdle || (playerSprites.front && playerSprites.front[0]);
    const img = (extractionImg && extractionImg.complete && extractionImg.naturalWidth>0)
      ? extractionImg
      : (idle && idle.complete && idle.naturalWidth>0 ? idle : null);
    const baseSize = 0.5 * Math.min(W, H);
    const size = Math.max(160 * DPR, baseSize);
    const w = size, h = size;
    const cx = W * 0.5;
    const cy = H * 0.5;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if(img){
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, cx - w/2, cy - h/2, w, h);
    } else {
      const bodyGrad = ctx.createRadialGradient(cx - size*0.15, cy - size*0.2, 4, cx, cy, size*0.6);
      bodyGrad.addColorStop(0, "rgba(255,255,255,0.95)");
      bodyGrad.addColorStop(0.5, "rgba(200,220,255,0.9)");
      bodyGrad.addColorStop(1, "rgba(80,120,180,0.9)");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, size*0.35, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLevel11WeldBar(){
    if(!level11Active || level11WeldingZoneId == null) return;
    const zone = level11Zones.find(z => z.id === level11WeldingZoneId);
    if(!zone) return;
    const t = clamp(level11WeldMs / (LEVEL11_WELD_DURATION_SEC * 1000), 0, 1);
    const bw = 72 * DPR;
    const bh = 12 * DPR;
    const x = player.x - bw / 2;
    const y = player.y - player.r - 52 * DPR; // slightly above blood gather bar
    const fillW = bw * (1 - t);
    ctx.save();
    try {
      ctx.beginPath();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.9)";
      ctx.strokeStyle = "rgba(255,220,120,0.95)";
      ctx.lineWidth = 3 * DPR;
      roundRect(x, y, bw, bh, 999);
      ctx.fill();
      ctx.stroke();
      if(fillW > 3 * DPR){
        const innerW = fillW - 2 * DPR;
        if(innerW > 0){
          ctx.fillStyle = "rgba(255,210,80,0.98)";
          roundRect(x + (bw - fillW), y + 2*DPR, innerW, bh - 4*DPR, 999);
          ctx.fill();
        }
      }
    } finally {
      ctx.restore();
      ctx.beginPath();
    }
  }

  function drawLevelUpRing(ring){
    const t = ring.t / ring.life;
    const alpha = 1 - t*t;
    const col = "rgba(255,220,100,0.95)";
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 24*DPR;
    ctx.lineWidth = 4*DPR;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
  function drawTokenPop(pop){
    const t = pop.t / pop.life;
    const alpha = 1 - t * t;
    const floatY = pop.y - 28*DPR - pop.t * 70*DPR;
    const scale = 1 + t * 0.4;
    const r = 14 * DPR * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pop.x, floatY);
    ctx.scale(scale, scale);
    ctx.shadowColor = "rgba(255,212,106,0.9)";
    ctx.shadowBlur = 16*DPR;
    ctx.fillStyle = "rgba(255,212,106,0.95)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2*DPR;
    ctx.stroke();
    ctx.font = `bold ${12*DPR}px ui-sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText("+1", 0, 0);
    ctx.restore();
  }
  function drawParticle(p){
    const t=p.t/p.life;
    if(p.pulse){
      const r=lerp(10*DPR, 96*DPR, t);
      ctx.save();
      ctx.globalAlpha=(1-t)*0.55;
      ctx.strokeStyle=p.col;
      ctx.shadowColor=p.col;
      ctx.shadowBlur=28*DPR;
      ctx.lineWidth=4*DPR;
      ctx.beginPath();
      ctx.arc(p.x,p.y,r,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha=(1-t)*0.95;
    if(p.glow){
      ctx.shadowColor=p.col;
      ctx.shadowBlur=18*DPR;
    }
    ctx.fillStyle=p.col;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawLevel11StatusHUD(){
    if(!currentLevelConfig || currentLevelConfig.id !== "1-1" || !level11Zones || !level11Zones.length) return;
    const text = `${level11ZonesCleared}/${level11Zones.length}`;
    const padX = 10 * DPR;
    const padY = 4 * DPR;
    ctx.save();
    ctx.font = `${11*DPR}px ui-sans-serif`;
    const tw = ctx.measureText(text).width;
    const bw = tw + padX * 2;
    const bh = 18 * DPR;
    const x = W * 0.5 - bw / 2;
    const y = 12 * DPR;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5 * DPR;
    roundRect(x, y, bw, bh, 999);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, W * 0.5, y + bh / 2);
    ctx.restore();
  }

  function drawLevel11ArrowIndicator(){
    if(!level11Arrow) return;
    const targetX = level11Arrow.targetX;
    const targetY = level11Arrow.targetY;
    const delay = level11Arrow.delay || 0;
    const t = level11Arrow.t || 0;
    if(t < delay) return; // wait 1s before showing arrow

    const dxWorld = targetX - player.x;
    const dyWorld = targetY - player.y;
    if(!isFinite(dxWorld) || !isFinite(dyWorld)) return;
    const dist = Math.hypot(dxWorld, dyWorld);
    if(dist <= 1e-2) return;

    const ang = Math.atan2(dyWorld, dxWorld);
    const px = W * 0.5;
    const py = H * 0.5;
    const arrowLen = Math.min(dist * 0.5, 160 * DPR);

    // Blink strength over lifetime (4s) – fades slightly towards the end
    const age = t - delay;
    const life = level11Arrow.life || 4;
    const lifeFrac = Math.max(0, Math.min(1, age / life));
    const blinkBase = 0.5 + 0.5 * Math.sin(now() * 10);
    const alpha = (0.6 + 0.4 * blinkBase) * (1 - 0.2 * lifeFrac);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(px, py);
    ctx.rotate(ang);

    const size = 32 * DPR;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,240,160,0.98)";
    ctx.shadowColor = "rgba(255,240,160,0.95)";
    ctx.shadowBlur = 14 * DPR;

    // Draw a thick arrow starting at player center and pointing towards the manhole
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(arrowLen - size * 0.4, 0);
    ctx.lineTo(arrowLen - size * 0.4, size * 0.35);
    ctx.lineTo(arrowLen, 0);
    ctx.lineTo(arrowLen - size * 0.4, -size * 0.35);
    ctx.lineTo(arrowLen - size * 0.4, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ========= Boot =========
  function resetUI(){
    hpFill.style.width="100%";
    shFill.style.width="0%";
    xpFill.style.width="0%";
    if(tokenFill) tokenFill.style.width="0%";
    if(tokenTxt) tokenTxt.textContent="0/1000";
  }
  resetUI();
  renderEquipMini();
  showSplash();

  function loopStart(){ loop(); }
  loopStart();

})();
