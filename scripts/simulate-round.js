/**
 * Simulates one endless round (wave/spawn/boss logic only) for analysis.
 * Run: node scripts/simulate-round.js
 */
const DURATION_SEC = 300;
const DT = 1/30;

function getWaveScale(gameTime) {
  const waveIndex = Math.floor(gameTime / 20);
  return Math.pow(1.2, waveIndex);
}

function getWaveIndex(gameTime) {
  return Math.floor(gameTime / 20);
}

function simulate() {
  let gameTime = 0;
  let spawnAcc = 0;
  let lastSpawnedMinibossWave = -1;
  let lastWarningWave = 0;

  const events = [];
  let totalMobSpawns = 0;

  while (gameTime <= DURATION_SEC) {
    const elapsed = gameTime;
    const currentWave = Math.floor(elapsed / 20);
    const nextWave = lastSpawnedMinibossWave + 1;
    const isBossWave = nextWave > 0 && nextWave % 3 === 0;

    if (elapsed >= nextWave * 20 - 2 && nextWave > lastWarningWave) {
      lastWarningWave = nextWave;
      events.push({ t: elapsed.toFixed(1), type: 'WARNING', msg: isBossWave ? 'BOSS INCOMING' : 'MINIBOSS INCOMING', wave: nextWave });
    }
    if (currentWave >= 1 && currentWave > lastSpawnedMinibossWave) {
      lastSpawnedMinibossWave = currentWave;
      const spawnBossThisWave = currentWave % 3 === 0;
      events.push({
        t: elapsed.toFixed(1),
        type: spawnBossThisWave ? 'BOSS' : 'MINIBOSS',
        wave: currentWave,
        scale: getWaveScale(gameTime).toFixed(2),
      });
    }

    const baseRate = 0.22;
    const spawnsPerSec = Math.min(2, baseRate * getWaveScale(gameTime));
    spawnAcc += spawnsPerSec * DT;
    let spawnsThisStep = 0;
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      spawnsThisStep++;
      totalMobSpawns++;
    }
    if (spawnsThisStep > 0 && Math.floor(gameTime * 30) % 30 === 0) {
      events.push({ t: elapsed.toFixed(1), type: 'MOBS', count: spawnsThisStep, wave: getWaveIndex(gameTime), rate: spawnsPerSec.toFixed(2) });
    }

    gameTime += DT;
  }

  const waveSummaries = [];
  for (let w = 0; w <= getWaveIndex(DURATION_SEC); w++) {
    const scale = Math.pow(1.2, w);
    const rate = Math.min(2, 0.22 * scale);
    waveSummaries.push({ wave: w, scale: scale.toFixed(2), spawnRatePerSec: rate.toFixed(2) });
  }

  return { events, totalMobSpawns, waveSummaries, duration: DURATION_SEC };
}

const result = simulate();

console.log('=== SIMULERT RUNDE (endless) ===');
console.log(`Varighet: ${result.duration}s`);
console.log('');
console.log('--- Wave-oversikt (20s per wave) ---');
result.waveSummaries.forEach(({ wave, scale, spawnRatePerSec }) => {
  console.log(`  Wave ${wave} (${wave*20}-${(wave+1)*20}s): scale=${scale}, spawn rate=${spawnRatePerSec}/s`);
});
console.log('');
console.log('--- Varsler og miniboss/boss ---');
result.events.filter(e => e.type === 'WARNING' || e.type === 'BOSS' || e.type === 'MINIBOSS').forEach(e => {
  if (e.type === 'WARNING') console.log(`  ${e.t}s  [VARSEL] ${e.msg} (wave ${e.wave})`);
  else console.log(`  ${e.t}s  [SPAWN] ${e.type} wave=${e.wave} scale=${e.scale}`);
});
console.log('');
console.log(`Estimert antall vanlige mob-spawns (${result.duration}s): ~${result.totalMobSpawns}`);
console.log('=== SLUTT ===');
