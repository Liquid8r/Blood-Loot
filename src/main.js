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
  const GAME_VERSION = "1.003.5";
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
        if(menuMusic && musicVol>0) menuMusic.play().catch(()=>{});
        if(runMusic && musicVol>0) runMusic.play().catch(()=>{});
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
    const gainMul = Math.max(0.0001, gain * sfxVol);
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

    baseDmg: 8,
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
  // v1.003.5: temporary test mode where we only spawn a small number of
  // Skittering Mouse enemies and disable all other mob types and bosses.
  const TEST_SINGLE_MOB_MODE = true;
  // Endless run: no round end from time; boss every 60s; extract when player chooses.
  const ENDLESS_RUN = true;

  // ========= Levels (1-1 = current board; beat to unlock 1-2, then 1-3) =========
  const LEVELS = [
    { id: "1-1", name: "1-1", roundSeconds: 150, spawnScale: 1,    enemyHpScale: 1,   bossHpScale: 1,   threatDivisor: 1800, minibossPct: 0.47, bossPct: 0.93 },
    { id: "1-2", name: "1-2", roundSeconds: 165, spawnScale: 1.12, enemyHpScale: 1.18, bossHpScale: 1.18, threatDivisor: 1500, minibossPct: 0.47, bossPct: 0.93 },
    { id: "1-3", name: "1-3", roundSeconds: 180, spawnScale: 1.28, enemyHpScale: 1.4,  bossHpScale: 1.35, threatDivisor: 1200, minibossPct: 0.47, bossPct: 0.93 },
  ];
  function getLevelConfig(id){
    return LEVELS.find(l=>l.id===id) || LEVELS[0];
  }

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

    xp:0,
    level:1,
    xpNeed:BASE.xpNeed,

    dpsEst:0,
    levelBonuses:{},
  };

  let equipped = {weapon:null, armor:null, ring1:null, ring2:null, jewel:null};

  let enemies=[], bullets=[], orbs=[], lootDrops=[], particles=[], levelUpRings=[];
  let kills=0, lootCount=0, streak=0, streakT=0;
  let threat=1.0, spawnAcc=0, atkCD=0;
  let lootPickupCooldown=0;

  // Boss control (endless: mini-boss every minute, boss every 5 minutes)
  let minibossWarned=false, minibossSpawned=false, bossWarned=false, bossSpawned=false;
  let lastSpawnedBossMinute = -1;
  let lastSpawnedMinibossMinute = -1;
  let lastWarningWave = 0;
  let lastSpawnedMegaBoss = false;
  let lastMegaBossWarned = false;
  let roundEnd=false, victoryPhase=false;
  let victorySuckAt=0;   // when to start sucking loot/XP (now + 2s when last enemy dies)
  let suckActive=false;  // strong pull on orbs and loot toward player

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

  // Player sprites: front/back animasjon + idle når stå stille.
  const playerSprites = { front: [], back: [], frontIdle: null, backIdle: null };
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
  })();

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
    const icon = type==="weapon"?"⚔️":type==="armor"?"🛡️":type==="ring"?"💍":"💎";
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

    lootPickupCooldown = 5;

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
    const item=makeItem(type,rarity);
    lootDrops.push({ x:x+rand(-14,14)*DPR, y:y+rand(-14,14)*DPR, r:12*DPR, item, t:0, bob:rand(0,Math.PI*2) });
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
      player.xpNeed = Math.round(player.xpNeed*1.22 + 6);
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
    const sp = baseSp * spMult;
    const contactDmg = Math.round((isElite ? 10 : 8) * scaleDmg);

    enemies.push({
      kind: "skitteringMouse",
      x,y, r: baseR*DPR,
      hp: (hp*(isElite?1.15:1)) * (currentLevelConfig ? currentLevelConfig.enemyHpScale : 1),
      maxHP: (hp*(isElite?1.15:1)) * (currentLevelConfig ? currentLevelConfig.enemyHpScale : 1),
      sp: sp*DPR,
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

    if(isMiniboss){
      const r = BASE_MOUSE_R * 3;
      const hp = smallestMobHP * 5;
      const contactDmg = Math.round(smallestMobDmg * 5);
      enemies.push({
        kind: "skitteringMouse",
        x,y,
        r: r*DPR,
        hp, maxHP: hp,
        sp: 92*DPR * Math.min(1, scaleSpeed),
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
    const hp = smallestMobHP * 20;
    const contactDmg = Math.round(smallestMobDmg * 20);
    enemies.push({
      kind: "skitteringMouse",
      x,y,
      r: r*DPR,
      hp, maxHP: hp,
      sp: 98*DPR * Math.min(1, scaleSpeed),
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
    const r = BASE_MOUSE_R * 8;
    const hp = smallestMobHP * 55;
    const contactDmg = Math.round(smallestMobDmg * 55);
    enemies.push({
      kind: "skitteringMouse",
      x,y,
      r: r*DPR,
      hp, maxHP: hp,
      sp: 88*DPR,
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
    const ux=dx/d, uy=dy/d;
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
    if(player.hp<=0){ player.hp=0; gameOver(); }
  }

  function killEnemy(e){
    enemies.splice(enemies.indexOf(e),1);
    kills++;
    streak++; streakT=1.8;

    dropXP(e.x,e.y, e.elite, e.boss);
    dropLoot(e.x,e.y, e.elite, e.boss, e.miniboss);

    if(e.boss){
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
  function showSplash(){
    running=false; paused=false; inCompare=false;
    overlay.classList.remove("hidden");
    const overlayCard = document.getElementById("overlayCard");
    if(overlayCard) overlayCard.classList.add("mainMenuActive");
    if(ovHead) ovHead.style.display="none";
    ovBtns.innerHTML="";
    ovTitle.textContent="";
    ovSub.textContent="";
    ovBody.innerHTML=`
      <div class="menuSplashWrap" id="splashWrap">
        <div class="menuSplashPrompt">Click to start</div>
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

    ovBody.innerHTML=`
      <div class="menuMainWrap">
        <img class="menuMainBg" src="assets/graphics/Main Menu.png" alt="" />
        <div class="menuMainGrid">
          <button type="button" class="menuBox menuBoxPrimary" id="btnStartLooting">Start Looting!</button>
          <button type="button" class="menuBox menuBoxPlaceholder" id="btnUpgrades">Upgrades</button>
          <button type="button" class="menuBox menuBoxPlaceholder" id="btnChooseLevel">Choose Level</button>
          <div class="menuBox menuBoxVolume" id="volumeBox">
            ${getVolumeControlsHTML()}
          </div>
        </div>
      </div>
    `;

    if(menuMusic && musicVol>0){
      applyMusicVolume();
      menuMusic.play().catch(()=>{});
    }

    document.getElementById("btnStartLooting").onclick=()=>{
      ensureAudio();
      stopMenuMusic();
      startGame(false);
    };
    document.getElementById("btnUpgrades").onclick=()=>showUpgradesMenu();
    document.getElementById("btnChooseLevel").onclick=()=>showChooseLevelMenu();
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
    ovSub.textContent="Unlock each level by winning the previous one. Selected level is used when you Start Looting.";
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
        ${unlocked ? (selected ? '<span class="levelSelectBadge">✓ Selected</span>' : '<span class="levelSelectBadge">Select</span>') : '<span class="levelSelectLock">🔒 Locked</span>'}
      `;
      if(unlocked){
        row.onclick = () => {
          selectedLevelId = lvl.id;
          beep({freq:520,dur:0.06,type:"triangle",gain:0.05});
          showChooseLevelMenu();
        };
      }
      wrap.appendChild(row);
    }
    ovBody.appendChild(wrap);
    const backWrap = document.createElement("div");
    backWrap.className = "upgradeBackWrap";
    const backBtn = document.createElement("button");
    backBtn.textContent = "Back";
    backBtn.onclick = () => showMainMenu();
    backWrap.appendChild(backBtn);
    ovBody.appendChild(backWrap);
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
    ovTitle.textContent="Game Over";
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
        <div style="font-weight:1000; letter-spacing:.25px;">Build Tip</div>
        <div style="margin-top:8px; color:rgba(234,242,255,.75); font-size:13px; line-height:1.55;">
          Attack speed is slightly reduced — you <b>need</b> to find 💨 affixes (attack speed) and better weapons.
          Boss mid-run has higher loot chance.
        </div>
      </div>
    `;

    beep({freq:96,dur:0.22,type:"sawtooth",gain:0.07,slide:0.55});
    beep({freq:72,dur:0.30,type:"triangle",gain:0.06,slide:0.7});
  }

  // ========= Reset / Start =========
  function resetState(){
    enemies=[]; bullets=[]; orbs=[]; lootDrops=[]; particles=[]; levelUpRings=[];
    kills=0; lootCount=0; streak=0; streakT=0;
    threat=1.0; spawnAcc=0; atkCD=0;
    lootPickupCooldown=0;
    minibossWarned=false; minibossSpawned=false; bossWarned=false; bossSpawned=false;
    lastSpawnedBossMinute = -1;
    lastSpawnedMinibossMinute = -1;
    lastWarningWave = 0;
    lastSpawnedMegaBoss = false;
    lastMegaBossWarned = false;
    roundEnd=false; victoryPhase=false;
    victorySuckAt=0; suckActive=false;

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
    const propTypes = [
      { id: "pølsebod", w: 70*DPR, h: 50*DPR, fill: "#8B4513", stroke: "#5D2E0C", sign: "🌭" },
      { id: "klesbutikk", w: 85*DPR, h: 55*DPR, fill: "#4A6FA5", stroke: "#2E4563", sign: "👕" },
      { id: "skobutikk", w: 65*DPR, h: 48*DPR, fill: "#2C1810", stroke: "#1a0e08", sign: "👟" },
      { id: "kiosk", w: 55*DPR, h: 45*DPR, fill: "#C41E3A", stroke: "#8B1528", sign: "📰" },
      { id: "blomster", w: 60*DPR, h: 50*DPR, fill: "#228B22", stroke: "#145214", sign: "🌸" },
      { id: "søppel", w: 50*DPR, h: 45*DPR, fill: "#3d3d3d", stroke: "#252525", sign: "🗑️" },
    ];
    mallProps = [];
    const zoneW = mapW / 2, zoneH = mapH / 3;
    const pad = 55 * DPR;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        let x = pad + rand(0, Math.max(10, zoneW - 110*DPR)) + col * zoneW;
        let y = pad + rand(0, Math.max(10, zoneH - 90*DPR)) + row * zoneH;
        const cx = x, cy = y;
        if (Math.hypot(cx - fountainCx, cy - fountainCy) < avoidR + 90*DPR) {
          const angle = Math.atan2(cy - fountainCy, cx - fountainCx);
          x = fountainCx + Math.cos(angle) * (avoidR + 90*DPR);
          y = fountainCy + Math.sin(angle) * (avoidR + 90*DPR);
        }
        const T = propTypes[ mallProps.length % propTypes.length ];
        mallProps.push({ type: T.id, x, y, w: T.w, h: T.h, fill: T.fill, stroke: T.stroke, sign: T.sign });
      }
    }
    player.x = mapW / 2;
    player.y = mapH / 2;
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

    equipped={weapon:null, armor:null, ring1:null, ring2:null, jewel:null};
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
    stopMenuMusic();
    if(runMusic){ runMusic.pause(); runMusic=null; }
    resetState();

    // starter kit: nothing equipped so first loot of each type is always an upgrade
    equipped.weapon = null;
    equipped.armor = null;
    equipped.ring1 = null;
    equipped.ring2 = null;
    equipped.jewel = null;
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

    if(ENDLESS_RUN){
      for(let i=0;i<28;i++) spawnEnemy(false);
    } else if(TEST_SINGLE_MOB_MODE){
      for(let i=0;i<14;i++) spawnEnemy(false);
    } else {
      for(let i=0;i<4;i++) spawnEnemy(false);
    }
    ensureAudio();
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

    // round end: no more spawns (disabled in endless)
    if(!practice && !ENDLESS_RUN && elapsed>=roundSeconds && !roundEnd){
      roundEnd=true;
    }

    // Endless: miniboss every 20s; every 3rd = boss. Warning ~2s before (always run when ENDLESS_RUN).
    if(!practice && (ENDLESS_RUN || !TEST_SINGLE_MOB_MODE)){
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
    if(!ENDLESS_RUN && roundEnd){
      threat = 1.0 + (elapsed*elapsed) / (lvl.threatDivisor || 1800);
    }

    streakT -= dt;
    if(streakT<=0){streak=0;streakT=0;}

    if(player.maxShield>0 && player.shieldRegenPct>0){
      player.shield=clamp(player.shield + player.maxShield*player.shieldRegenPct*dt, 0, player.maxShield);
    }
    if(player.invuln>0) player.invuln -= dt;

    // movement
    const up=keys.has("w")||keys.has("arrowup");
    const down=keys.has("s")||keys.has("arrowdown");
    const left=keys.has("a")||keys.has("arrowleft");
    const right=keys.has("d")||keys.has("arrowright");
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
    if (plSpeed > 0.5*DPR) player.lastDir = (player.vy || 0) < 0 ? "back" : "front";

    // slow aura
    const aura=player.slowAura;
    const auraR=(90+aura*120)*DPR;
    const auraR2=auraR*auraR;

    // enemies move + collision
    for(const e of enemies){
      const dx=player.x-e.x, dy=player.y-e.y;
      const d=Math.hypot(dx,dy)||1;
      let sp=e.sp;
      if(aura>0 && (dx*dx+dy*dy)<auraR2) sp *= (1-aura);
      e.x += (dx/d)*sp*dt;
      e.y += (dy/d)*sp*dt;
      let eOut = pushOutOfFountain(e.x, e.y, e.r);
      e.x = eOut.x; e.y = eOut.y;
      eOut = pushOutOfManholes(e.x, e.y, e.r);
      e.x = eOut.x; e.y = eOut.y;
      eOut = pushOutOfMallProps(e.x, e.y, e.r);
      e.x = eOut.x; e.y = eOut.y;
      if(e.hitFlash>0) e.hitFlash-=dt;

      const rr=(player.r+e.r);
      if(dx*dx+dy*dy < rr*rr){
        const contact = e.contactDmg != null ? e.contactDmg : (e.boss?18: e.elite?12:7);
        takeDamage(contact);
        if(player.thorns>0){
          const th=Math.round((e.boss?18:e.elite?10:6)*player.thorns);
          if(th>0) hitEnemy(e, th);
        }
      }
    }

    // shooting
    atkCD -= dt;
    if(atkCD<=0 && enemies.length){
      const t = nearestEnemy(player.x,player.y);
      if(t){ shootAt(t); atkCD = player.atkRate; }
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
        gainXP(o.r>5*DPR?6:3);
        beep({freq:880,dur:0.02,type:"sine",gain:0.02,slide:0.92});
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

  // Mall 1st floor: 4x map size, tiled pattern in world space
  function drawMallFloorPlaceholder(){
    const tile = 48 * DPR;
    const w = Math.ceil(mapW / tile) + 1;
    const h = Math.ceil(mapH / tile) + 1;
    ctx.save();
    ctx.fillStyle = "#3d362e";
    ctx.fillRect(0, 0, mapW, mapH);
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? "#4a4439" : "#353028";
        ctx.fillRect(i * tile, j * tile, tile + 1, tile + 1);
      }
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1 * DPR;
    for (let i = 0; i <= w; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tile, 0);
      ctx.lineTo(i * tile, mapH);
      ctx.stroke();
    }
    for (let j = 0; j <= h; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * tile);
      ctx.lineTo(mapW, j * tile);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Fountain collision: same radius as drawn pool (solid obstacle)
  const FOUNTAIN_R = 80 * 1.4 * 1;  // *DPR applied when used
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
    const baseR = 80 * DPR;
    const poolR = baseR * 1.4;
    ctx.save();
    // Pool – solid (opaque)
    ctx.fillStyle = "#2c4a5e";
    ctx.strokeStyle = "#3d6b85";
    ctx.lineWidth = 3 * DPR;
    ctx.beginPath();
    ctx.arc(cx, cy, poolR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Base ring
    ctx.fillStyle = "#5a5248";
    ctx.strokeStyle = "#8a7d6a";
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Center pillar
    const pillarR = baseR * 0.35;
    ctx.fillStyle = "#6b6358";
    ctx.beginPath();
    ctx.arc(cx, cy, pillarR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Water on top – solid
    ctx.fillStyle = "#5b9bb5";
    ctx.beginPath();
    ctx.arc(cx, cy - 8 * DPR, pillarR * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Inner water – solid, slight shimmer tint
    ctx.fillStyle = "#7ab8d4";
    ctx.beginPath();
    ctx.arc(cx, cy, poolR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMallProps(){
    ctx.save();
    for (const p of mallProps) {
      ctx.fillStyle = p.fill;
      ctx.strokeStyle = p.stroke;
      ctx.lineWidth = 2 * DPR;
      roundRect(p.x, p.y, p.w, p.h, 6 * DPR);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      roundRect(p.x + 4*DPR, p.y + 4*DPR, p.w - 8*DPR, p.h - 8*DPR, 4 * DPR);
      ctx.fill();
      ctx.font = `${Math.min(24, p.h * 0.5)}px ui-sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(p.sign, p.x + p.w/2, p.y + p.h/2);
    }
    ctx.restore();
  }

  function drawManholes(){
    ctx.save();
    for (const m of manholes) {
      const r = m.r;
      ctx.fillStyle = "#3a3632";
      ctx.strokeStyle = "#5c5750";
      ctx.lineWidth = 3 * DPR;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a2824";
      ctx.beginPath();
      ctx.arc(m.x, m.y, r * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a4540";
      ctx.lineWidth = 1.5 * DPR;
      ctx.stroke();
      ctx.fillStyle = "#1e1c1a";
      ctx.beginPath();
      ctx.arc(m.x, m.y, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const DOOR_W = 56 * DPR;
  const DOOR_H = 90 * DPR;
  const DOOR_INSET = 40 * DPR;
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
    ctx.clearRect(0,0,W,H);

    // Camera: keep player visually centered, move world (including floor) relative to player.
    const camOffsetX = W*0.5 - player.x;
    const camOffsetY = H*0.5 - player.y;
    ctx.save();
    ctx.translate(camOffsetX, camOffsetY);

    if (mapW > 0 && mapH > 0) {
      drawMallFloorPlaceholder();
      drawFountain();
      drawManholes();
      drawMallProps();
      drawDoors();
    }

    for(const L of lootDrops) drawLoot(L);
    for(const o of orbs) drawOrb(o);
    for(const b of bullets) drawBullet(b);
    for(const e of enemies) drawEnemy(e);
    for(const p of particles) drawParticle(p);
    for(const ring of levelUpRings) drawLevelUpRing(ring);

    drawPlayer();
    for(const pop of tokenPops) drawTokenPop(pop);

    ctx.restore();

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

  function drawPlayer(){
    const t=now()*0.001;

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
        const dir = vy < 0 ? "back" : "front";
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
