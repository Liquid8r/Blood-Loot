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
  let audioOn=true;
  function ensureAudio(){
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended") audioCtx.resume();
  }
  function beep({freq=440, dur=0.06, type="sine", gain=0.06, slide=0, noise=false}={}){  // tiny synth
    if(!audioOn) return;
    ensureAudio();
    const t0 = audioCtx.currentTime;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0+0.01);
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
    playerR: 12,
    hp: 100,
    speed: 190,
    dashSpeed: 530,
    dashDur: 0.10,
    dashCD: 0.90,

    baseDmg: 10,
    baseAtk: 0.37,      // slightly slower
    bulletSpeed: 540,
    bulletLife: 0.95,

    xpNeed: 20,

    lootDropBase: 0.09,
    lootDropElite: 0.30,

    roundSeconds: 300,

    bossApproachAt: 115,
    bossSpawnAt: 125,
  };

  // ========= Inputs =========
  const keys=new Set();
  addEventListener("keydown",(e)=>{
    const k=e.key.toLowerCase();
    if(["w","a","s","d","arrowup","arrowleft","arrowdown","arrowright"," "].includes(k) || e.key===" ") e.preventDefault();
    if(k==="p" && running){ togglePause(); return; }
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

    dashT:0,
    dashCD:0,

    xp:0,
    level:1,
    xpNeed:BASE.xpNeed,

    dpsEst:0,
  };

  let equipped = {weapon:null, armor:null, ring1:null, ring2:null, jewel:null};

  let enemies=[], bullets=[], orbs=[], lootDrops=[], particles=[];
  let kills=0, lootCount=0, streak=0, streakT=0;
  let threat=1.0, spawnAcc=0, atkCD=0;

  // Boss control
  let bossWarned=false, bossSpawned=false;

  // High score
  let hiBestTime = +localStorage.getItem("affixloot_best_time") || 0;
  let hiBestKills = +localStorage.getItem("affixloot_best_kills") || 0;

  // Compare modal state
  let pendingLoot=null;
  let inCompare=false;

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
    return {type, rarity, icon, name, base, affixes};
  }

  function itemScore(it){
    if(!it) return -999;
    const tier = it.rarity==="common"?1:it.rarity==="uncommon"?2:it.rarity==="rare"?3:4;
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
    let hpFlat=0, shieldFlat=0, pickupFlat=0, pierceAdd=0;

    const items=[eq.weapon,eq.armor,eq.ring1,eq.ring2,eq.jewel].filter(Boolean);
    for(const it of items){
      for(const a of it.affixes){
        switch(a.id){
          case "dmgPct": dmgPct += a.value; break;
          case "asPct": asPct += a.value; break;
          case "msPct": msPct += a.value; break;
          case "regenPct": regenPct += a.value; break;
          case "critPct": critAdd += a.value/100; break;
          case "critDmg": critDmgPct += a.value/100; break;
          case "splash": splashPct += a.value/100; break;
          case "lifesteal": lsPct += a.value/100; break;
          case "slowAura": slowPct += a.value/100; break;
          case "thorns": thornsPct += a.value/100; break;
          case "xpGain": xpPct += a.value/100; break;
          case "hpFlat": hpFlat += a.value; break;
          case "shieldFlat": shieldFlat += a.value; break;
          case "pickup": pickupFlat += a.value; break;
          case "pierce": pierceAdd += a.value; break;
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

    if(prevMaxHP>0){
      const pct=clamp(player.hp/prevMaxHP,0,1);
      player.hp=clamp(pct*player.maxHP,1,player.maxHP);
    } else player.hp=clamp(player.hp,1,player.maxHP);

    if(prevMaxSh>0){
      const pct=clamp(player.shield/prevMaxSh,0,1);
      player.shield=clamp(pct*player.maxShield,0,player.maxShield);
    } else player.shield=clamp(player.shield,0,player.maxShield);

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
  function renderCompareCard(item, slotKey, header){
    const wrap=document.createElement("div");
    wrap.className="compareCard";
    const it=item||previewItem(slotKey);
    const c=item ? RAR[it.rarity].color : "rgba(255,255,255,.55)";
    const rarTxt=item ? rarityLabel(it.rarity) : "—";
    const baseLine = baseLineFor(it);
    const affHTML = it.affixes?.length
      ? it.affixes.map(a=>`<span class="pill">${a.icon} ${a.text}</span>`).join("")
      : `<span class="pill" style="opacity:.6;">No affixes</span>`;
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
        </div>
      </div>
    `;
    return wrap;
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
    ovTitle.textContent = `Loot Found — Choose (${slotKey.toUpperCase()})`;
    ovSub.innerHTML = `Spillet er pauset. Velg: <span class="keycap">←</span>/<span class="keycap">A</span> keep • <span class="keycap">→</span>/<span class="keycap">D</span> equip.`;

    ovBtns.innerHTML="";
    const equipBtn=document.createElement("button");
    equipBtn.textContent="Equip new";
    equipBtn.onclick=()=>{ ensureAudio(); beep({freq:760,dur:0.07,type:"triangle",gain:0.06,slide:0.8}); acceptCompare(true); };
    const keepBtn=document.createElement("button");
    keepBtn.textContent="Keep current";
    keepBtn.onclick=()=>{ ensureAudio(); beep({freq:540,dur:0.06,type:"triangle",gain:0.05}); acceptCompare(false); };
    const discardBtn=document.createElement("button");
    discardBtn.textContent="Discard new";
    discardBtn.onclick=()=>{ ensureAudio(); beep({freq:220,dur:0.08,type:"sawtooth",gain:0.05}); acceptCompare(false,true); };
    ovBtns.appendChild(equipBtn);
    ovBtns.appendChild(keepBtn);
    ovBtns.appendChild(discardBtn);

    const eqA={...equipped};
    const eqB={...equipped};
    eqB[slotKey]=newItem;

    const sA=computeStats(eqA);
    const sB=computeStats(eqB);

    ovBody.innerHTML="";
    const grid=document.createElement("div");
    grid.className="ovGrid";
    grid.appendChild(renderCompareCard(currentItem,slotKey,"Current"));
    grid.appendChild(renderCompareCard(newItem,slotKey,"New"));
    ovBody.appendChild(grid);
    ovBody.appendChild(renderStatsTable(sA,sB));

    beginCompareInputGate();
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

    pendingLoot=null;
    inCompare=false;
    overlay.classList.add("hidden");
    paused=false;

    endCompareInputGate();
  }

  // ========= Drops / XP =========
  function dropXP(x,y, elite=false, boss=false){
    const n = boss ? randi(6,10) : elite ? randi(3,5) : randi(1,2);
    for(let i=0;i<n;i++){
      orbs.push({ x:x+rand(-10,10)*DPR, y:y+rand(-10,10)*DPR, r:(boss?7:elite?6:4)*DPR, vx:rand(-20,20)*DPR, vy:rand(-20,20)*DPR });
    }
  }
  function dropLoot(x,y, elite=false, boss=false){
    let p = boss ? 0.95 : elite ? BASE.lootDropElite : BASE.lootDropBase;
    if(Math.random()>p) return;

    const roll=Math.random();
    const type = roll<0.44 ? "weapon" : roll<0.80 ? "armor" : roll<0.93 ? "ring" : "jewel";

    let rarity = rollRarity();
    const bump = boss ? 1 : elite ? 0.6 : 0;
    if(bump>0){
      if(rarity==="common" && Math.random()<0.70*bump) rarity="uncommon";
      if(rarity==="uncommon" && Math.random()<0.35*bump) rarity="rare";
      if(rarity==="rare" && Math.random()<0.18*bump) rarity="legendary";
    }
    const item=makeItem(type,rarity);
    lootDrops.push({ x:x+rand(-14,14)*DPR, y:y+rand(-14,14)*DPR, r:12*DPR, item, t:0, bob:rand(0,Math.PI*2) });
  }

  function gainXP(amount){
    const mul = 1 + player.xpGainPct;
    player.xp += amount*mul;
    while(player.xp >= player.xpNeed){
      player.xp -= player.xpNeed;
      player.level++;
      player.xpNeed = Math.round(player.xpNeed*1.22 + 6);
      beep({freq: 920, dur:0.09, type:"triangle", gain:0.06});
      player.maxHP += 6; player.hp += 6;
      player.dmg = Math.round(player.dmg * 1.02);
      player.dpsEst = estimateDPS(computeStats(equipped));
      showToast({type:"weapon",rarity:"uncommon",icon:"⬆️",name:`Level ${player.level}`,base:{},affixes:[]}, `Level ${player.level} (+HP, +DMG)`);
    }
  }

  // ========= Enemies & Boss =========
  function spawnEnemy(isElite=false){
    const margin=90*DPR;
    let x,y;
    const side=(Math.random()*4)|0;
    if(side===0){ x=rand(-margin,W+margin); y=-margin; }
    if(side===1){ x=W+margin; y=rand(-margin,H+margin); }
    if(side===2){ x=rand(-margin,W+margin); y=H+margin; }
    if(side===3){ x=-margin; y=rand(-margin,H+margin); }

    const baseR = isElite ? rand(16,20) : rand(11,15);
    const hp = isElite ? rand(80,110) : rand(22,34);
    const sp = isElite ? rand(76,92) : rand(92,120);

    const types=[{icon:"👾"},{icon:"🧟"},{icon:"🕷️"},{icon:"🦂"}];
    const t=pick(types);

    enemies.push({
      kind: isElite ? "elite" : "mob",
      x,y, r: baseR*DPR,
      hp: hp*(isElite?1.15:1),
      maxHP: hp*(isElite?1.15:1),
      sp: sp*DPR,
      elite: isElite,
      boss: false,
      icon: t.icon,
      hitFlash:0
    });
  }

  function spawnBoss(){
    const margin=120*DPR;
    let x,y;
    const side=(Math.random()*4)|0;
    if(side===0){ x=rand(-margin,W+margin); y=-margin; }
    if(side===1){ x=W+margin; y=rand(-margin,H+margin); }
    if(side===2){ x=rand(-margin,W+margin); y=H+margin; }
    if(side===3){ x=-margin; y=rand(-margin,H+margin); }

    const elapsed=gameTime;
    const scale=1+elapsed/220;

    enemies.push({
      kind:"boss",
      x,y,
      r: 32*DPR,
      hp: 650*scale,
      maxHP: 650*scale,
      sp: 78*DPR,
      elite: true,
      boss: true,
      icon:"👹",
      hitFlash:0,
      pulse: rand(0,Math.PI*2)
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

  function splashDamage(x,y, amount){
    if(amount<=0) return;
    const rad=(36+amount*0.55)*DPR;
    const r2=rad*rad;
    for(const e of enemies){
      const dd=dist2(x,y,e.x,e.y);
      if(dd<=r2){
        const t=1-Math.sqrt(dd)/rad;
        const dmg=Math.round(amount*(0.35+0.65*t));
        hitEnemy(e,dmg);
      }
    }
    beep({freq: 160, dur:0.08, type:"triangle", gain:0.05, slide:1.6});
  }

  function healFromLifesteal(dmgDealt){
    if(player.lifesteal<=0) return;
    const heal=dmgDealt*player.lifesteal;
    if(heal>0) player.hp=Math.min(player.maxHP, player.hp+heal);
  }

  function takeDamage(amount){
    if(player.invuln>0) return;
    let dmg=amount;
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
    dropLoot(e.x,e.y, e.elite, e.boss);

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
        acceptCompare(false);
      }
    } else if(k==="arrowright" || k==="d"){
      if(canAcceptCompareKey(k)){
        e.preventDefault();
        ensureAudio();
        beep({freq:760,dur:0.07,type:"triangle",gain:0.06,slide:0.8});
        acceptCompare(true);
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
  function showMainMenu(){
    running=false; paused=false; inCompare=false;
    overlay.classList.remove("hidden");
    if(ovHead) ovHead.style.display="none";
    ovBtns.innerHTML="";
    ovTitle.textContent="";
    ovSub.textContent="";

    ovBody.innerHTML=`
      <div id="menuHero">
        <div id="menuStars"></div>
        <div id="scanlines"></div>
        <h1 class="retroLogo"><span>Affix Loot</span></h1>
        <div class="logoSub">c64-ish main menu • loot & affixes • 5-min runs</div>
        <div class="menuBtnRow">
          <button class="menuBtnPrimary" id="btnStartLooting">Start Looting!</button>
          <button id="btnHighScore">High Score</button>
          <button id="btnMute">${audioOn ? "🔊 Lyd: På" : "🔇 Lyd: Av"}</button>
        </div>
        <div class="menuStats">
          <div class="statBox">Best Time<br><b>${hiBestTime ? formatTime(hiBestTime) : "—"}</b></div>
          <div class="statBox">Best Kills<br><b>${hiBestKills ? hiBestKills : "—"}</b></div>
          <div class="statBox"><span class="blink">▮</span> Tip<br><b>Boss mid-run</b></div>
        </div>
      </div>
      <div style="margin-top:12px; color:rgba(234,242,255,.70); font-size:12px; line-height:1.45;">
        Controls: WASD/Arrows + <span class="keycap">Space</span> dash • <span class="keycap">P</span> pause.
      </div>
    `;

    const btnStart = document.getElementById("btnStartLooting");
    const btnHighScore = document.getElementById("btnHighScore");
    const btnMute = document.getElementById("btnMute");
    if(btnStart) btnStart.onclick=()=>{ ensureAudio(); startGame(false); };
    if(btnHighScore) btnHighScore.onclick=()=>{ ensureAudio(); showHighScore(); };
    if(btnMute) btnMute.onclick=()=>{
      audioOn=!audioOn;
      btnMute.textContent = audioOn ? "🔊 Lyd: På" : "🔇 Lyd: Av";
      if(audioOn) beep({freq:800,dur:0.06,type:"sine",gain:0.05});
    };
  }

  function showHighScore(){
    if(ovHead) ovHead.style.display="";
    ovTitle.textContent="High Score";
    ovSub.textContent="";
    ovBody.innerHTML=`
      <div class="compareCard">
        <div style="font-weight:1000; letter-spacing:.25px;">High Score</div>
        <div style="margin-top:8px; color:rgba(234,242,255,.75); font-size:13px; line-height:1.55;">
          <div>⏱️ Best Time: <b>${hiBestTime ? formatTime(hiBestTime) : "—"}</b></div>
          <div style="margin-top:6px;">💀 Best Kills: <b>${hiBestKills ? hiBestKills : "—"}</b></div>
          <div style="margin-top:10px; opacity:.85;">Boss har høy loot-sjanse — bra sjanse for rare/legendary.</div>
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
      if(ovHead) ovHead.style.display="";
      ovTitle.textContent="Paused";
      ovSub.textContent="Trykk P for å fortsette, eller restart.";
      ovBtns.innerHTML="";
      const resume=document.createElement("button");
      resume.textContent="Resume";
      resume.onclick=()=>{ overlay.classList.add("hidden"); paused=false; tLast = now(); }; // NEW: reset dt source on resume
      const restart=document.createElement("button");
      restart.textContent="Restart";
      restart.onclick=()=>startGame(practice);
      const menu=document.createElement("button");
      menu.textContent="Main Menu";
      menu.onclick=()=>showMainMenu();
      ovBtns.appendChild(resume);
      ovBtns.appendChild(restart);
      ovBtns.appendChild(menu);
      ovBody.innerHTML="";
    } else {
      overlay.classList.add("hidden");
      tLast = now(); // NEW: prevents dt spike & keeps time frozen while paused
    }
  }

  function gameOver(){
    running=false; paused=false; inCompare=false;

    const elapsed=gameTime;
    const fin=Math.floor(elapsed);
    if(fin>hiBestTime){hiBestTime=fin; localStorage.setItem("affixloot_best_time", String(hiBestTime));}
    if(kills>hiBestKills){hiBestKills=kills; localStorage.setItem("affixloot_best_kills", String(hiBestKills));}

    overlay.classList.remove("hidden");
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
          Skytehastigheten er litt dempet — du <b>må</b> finne 💨 affixes (attack speed) og bedre våpen.
          Boss mid-run har høyere loot-sjanse.
        </div>
      </div>
    `;

    beep({freq:96,dur:0.22,type:"sawtooth",gain:0.07,slide:0.55});
    beep({freq:72,dur:0.30,type:"triangle",gain:0.06,slide:0.7});
  }

  // ========= Reset / Start =========
  function resetState(){
    enemies=[]; bullets=[]; orbs=[]; lootDrops=[]; particles=[];
    kills=0; lootCount=0; streak=0; streakT=0;
    threat=1.0; spawnAcc=0; atkCD=0;
    bossWarned=false; bossSpawned=false;

    player.x=W/2; player.y=H/2;
    player.vx=0; player.vy=0;
    player.level=1; player.xp=0; player.xpNeed=BASE.xpNeed;

    player.hp=BASE.hp; player.maxHP=BASE.hp;
    player.shield=0; player.maxShield=0;
    player.shieldRegenPct=0;
    player.invuln=0;
    player.dashT=0;
    player.dashCD=0;

    equipped={weapon:null, armor:null, ring1:null, ring2:null, jewel:null};
    recomputeBuild();
    renderEquipMini();
    endCompareInputGate();

    // NEW: reset game clock
    gameTime = 0;
    tLast = now();
  }

  function startGame(isPractice){
    practice=!!isPractice;
    resetState();

    // starter kit
    equipped.weapon = makeItem("weapon","uncommon");
    equipped.armor = makeItem("armor","common");
    if(Math.random()<0.55) equipped.ring1 = makeItem("ring","common");
    recomputeBuild();
    renderEquipMini();

    overlay.classList.add("hidden");
    running=true; paused=false; inCompare=false;

    // softer start
    for(let i=0;i<5;i++) spawnEnemy(false);
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
    render();

    // NOTE: Hard freeze time handled by not advancing gameTime when paused/not running
    if(!running || paused) return;

    const t=now();
    let dt=(t-tLast)/1000;
    dt=Math.min(dt,0.033);
    tLast=t;

    // NEW: advance game clock only while running & unpaused
    gameTime += dt;
    const elapsed = gameTime;

    // boss warning/spawn
    if(!practice){
      if(!bossWarned && elapsed>=BASE.bossApproachAt){
        bossWarned=true;
        bossBanner.classList.remove("show"); void bossBanner.offsetWidth;
        bossBanner.classList.add("show");
        bossApproachSound();
      }
      if(!bossSpawned && elapsed>=BASE.bossSpawnAt){
        bossSpawned=true;
        spawnBoss();
        beep({freq:160,dur:0.18,type:"triangle",gain:0.06,slide:0.7});
        beep({noise:true,dur:0.05,gain:0.02});
      }
      if(elapsed>=BASE.roundSeconds){
        running=false; paused=false;

        const fin=Math.floor(elapsed);
        if(fin>hiBestTime){hiBestTime=fin; localStorage.setItem("affixloot_best_time", String(hiBestTime));}
        if(kills>hiBestKills){hiBestKills=kills; localStorage.setItem("affixloot_best_kills", String(hiBestKills));}

        overlay.classList.remove("hidden");
        if(ovHead) ovHead.style.display="";
        ovTitle.textContent="Victory!";
        ovSub.innerHTML=`Du klarte 5 minutter! Kills: <b>${kills}</b> • Loot: <b>${lootCount}</b> • Level: <b>${player.level}</b>`;
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
        beep({freq:1040,dur:0.12,type:"triangle",gain:0.06});
        beep({freq:1560,dur:0.16,type:"sine",gain:0.06,slide:0.75});
        return;
      }
    }

    // softer early scaling
    threat = 1.0 + (elapsed*elapsed)/7200;

    const baseRate = 0.35 + elapsed/120;
    const spawnsPerSec = baseRate * threat * 0.55;
    spawnAcc += spawnsPerSec*dt;
    while(spawnAcc>=1){
      spawnAcc -= 1;
      const eliteChance = clamp(0.02 + elapsed/220, 0.02, 0.12);
      spawnEnemy(Math.random()<eliteChance);
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

    if(keys.has("space") && player.dashCD<=0){
      player.dashT=BASE.dashDur;
      player.dashCD=BASE.dashCD;
      player.invuln=Math.max(player.invuln,0.12);
      beep({freq:620,dur:0.06,type:"triangle",gain:0.05,slide:1.4});
    }
    if(player.dashT>0){
      player.dashT-=dt;
      speed=BASE.dashSpeed*DPR;
    }

    player.vx=ix*speed;
    player.vy=iy*speed;
    player.x=clamp(player.x+player.vx*dt, 20*DPR, W-20*DPR);
    player.y=clamp(player.y+player.vy*dt, 20*DPR, H-20*DPR);

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
      if(e.hitFlash>0) e.hitFlash-=dt;

      const rr=(player.r+e.r);
      if(dx*dx+dy*dy < rr*rr){
        takeDamage(e.boss?18: e.elite?12:7);
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
      if(b.life<=0 || b.x<-100 || b.x>W+100 || b.y<-100 || b.y>H+100){
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
      o.x += o.vx*dt; o.y += o.vy*dt;
      o.vx *= (1-4*dt); o.vy *= (1-4*dt);

      const pr=player.pickup*DPR;
      const d2p=dist2(o.x,o.y,player.x,player.y);
      if(d2p < pr*pr){
        const d=Math.sqrt(d2p)||1;
        const pull=clamp(1-d/pr,0,1);
        const sp=(240+pull*520)*DPR;
        o.vx += ((player.x-o.x)/d)*sp*dt;
        o.vy += ((player.y-o.y)/d)*sp*dt;
      }
      const rr=player.r+o.r;
      if(d2p < rr*rr){
        orbs.splice(i,1);
        gainXP(o.r>5*DPR?6:3);
        beep({freq:880,dur:0.02,type:"sine",gain:0.02,slide:0.92});
      }
    }

    // loot drops -> compare
    for(let i=lootDrops.length-1;i>=0;i--){
      const L=lootDrops[i];
      L.t += dt;
      const pr=(player.pickup+20)*DPR;
      const d2p=dist2(L.x,L.y,player.x,player.y);
      if(d2p < pr*pr){
        const d=Math.sqrt(d2p)||1;
        const pull=clamp(1-d/pr,0,1);
        const sp=(120+pull*480)*DPR;
        L.x += ((player.x-L.x)/d)*sp*dt;
        L.y += ((player.y-L.y)/d)*sp*dt;
      }
      const rr=player.r+L.r;
      if(d2p < rr*rr){
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

  function render(){
    ctx.clearRect(0,0,W,H);

    const g=ctx.createRadialGradient(W*0.64, H*0.22, 10, W*0.64, H*0.22, Math.max(W,H)*0.75);
    g.addColorStop(0, "rgba(78,166,255,0.075)");
    g.addColorStop(0.55, "rgba(255,138,42,0.040)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);

    drawGrid();

    for(const L of lootDrops) drawLoot(L);
    for(const o of orbs) drawOrb(o);
    for(const b of bullets) drawBullet(b);
    for(const e of enemies) drawEnemy(e);
    for(const p of particles) drawParticle(p);

    drawPlayer();
  }

  function drawPlayer(){
    const t=now()*0.001;

    ctx.save();
    ctx.globalAlpha=0.18;
    ctx.fillStyle="rgba(0,0,0,0.7)";
    ctx.beginPath();
    ctx.ellipse(player.x, player.y+10*DPR, player.r*1.05, player.r*0.70, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    glowCircle(player.x, player.y, player.r*0.85, "rgba(124,255,178,0.70)", 0.30, 26);

    const bodyGrad=ctx.createRadialGradient(player.x-player.r*0.4, player.y-player.r*0.5, 2, player.x, player.y, player.r*1.6);
    bodyGrad.addColorStop(0, "rgba(255,255,255,0.95)");
    bodyGrad.addColorStop(0.25, "rgba(124,255,178,0.85)");
    bodyGrad.addColorStop(1, "rgba(10,18,48,0.95)");
    ctx.fillStyle=bodyGrad;
    ctx.strokeStyle="rgba(255,255,255,0.18)";
    ctx.lineWidth=2*DPR;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();

    if(player.dashT>0){
      ctx.save();
      ctx.globalAlpha=0.25;
      ctx.strokeStyle="rgba(124,255,178,0.85)";
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

    ctx.save();
    ctx.font = `${16*DPR}px ui-sans-serif`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="rgba(0,0,0,0.65)";
    ctx.fillText("😺", player.x, player.y+1*DPR);
    ctx.restore();
  }

  function drawEnemy(e){
    ctx.save();
    ctx.globalAlpha=0.15;
    ctx.fillStyle="rgba(0,0,0,0.8)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y+12*DPR, e.r*1.08, e.r*0.70, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    const hpPct=clamp(e.hp/e.maxHP,0,1);
    const isBoss = e.boss;

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
    const bob=Math.sin((now()*0.002)+L.bob)*4*DPR;

    ctx.save();
    ctx.globalAlpha = it.rarity==="legendary" ? 0.45 : it.rarity==="rare" ? 0.38 : it.rarity==="uncommon" ? 0.32 : 0.26;
    ctx.shadowColor=c;
    ctx.shadowBlur=(it.rarity==="legendary"?58:44)*DPR;
    ctx.strokeStyle=c;
    ctx.lineWidth=(it.rarity==="legendary"?6:5)*DPR;
    ctx.beginPath();
    ctx.arc(L.x, L.y+16*DPR, (L.r*1.55) + (it.rarity==="legendary"?2*DPR:0), 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha=0.16+(it.rarity==="legendary"?0.10:0);
    ctx.shadowColor=c;
    ctx.shadowBlur=30*DPR;
    ctx.fillStyle=c;
    ctx.beginPath();
    ctx.ellipse(L.x, L.y+16*DPR, L.r*1.45, L.r*0.82, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(L.x, L.y+bob);

    const grad=ctx.createRadialGradient(-L.r*0.35, -L.r*0.45, 2, 0, 0, L.r*2.0);
    grad.addColorStop(0, "rgba(255,255,255,0.26)");
    grad.addColorStop(0.28, `${c}66`);
    grad.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle=grad;
    ctx.strokeStyle=`${c}AA`;
    ctx.lineWidth=2*DPR;
    ctx.beginPath();
    ctx.arc(0,0,L.r,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();

    ctx.font=`${20*DPR}px ui-sans-serif`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="rgba(255,255,255,0.96)";
    ctx.fillText(it.icon, 0, 1*DPR);

    const n=it.affixes.length;
    if(n>0){
      ctx.save();
      ctx.globalAlpha=0.92;
      for(let i=0;i<n;i++){
        const a=(i/n)*Math.PI*2 - Math.PI/2;
        const r0=L.r+2*DPR, r1=L.r+9*DPR;
        ctx.strokeStyle="rgba(255,255,255,0.86)";
        ctx.lineWidth=2*DPR;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*r0, Math.sin(a)*r0);
        ctx.lineTo(Math.cos(a)*r1, Math.sin(a)*r1);
        ctx.stroke();
      }
      ctx.restore();
    }

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
  }
  resetUI();
  renderEquipMini();
  showMainMenu();

  function loopStart(){ loop(); }
  loopStart();

})();
