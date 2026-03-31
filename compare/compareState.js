// compare/compareState.js

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEmptyComputedStats(baseStats = {}) {
  return {
    atk: baseStats.atk ?? 0,
    hp: baseStats.hp ?? 0,
    def: baseStats.def ?? 0,
    critRate: baseStats.critRate ?? 0,
    critDmg: baseStats.critDmg ?? 0,
    dmgBonus: baseStats.dmgBonus ?? 0,
    dmgReduction: baseStats.dmgReduction ?? 0,
    pDmgReduction: baseStats.pDmgReduction ?? 0,
    mDmgReduction: baseStats.mDmgReduction ?? 0,
    soulArmor: baseStats.soulArmor ?? 0,
    hitRate: baseStats.hitRate ?? 0,
    dodge: baseStats.dodge ?? 0,
    block: baseStats.block ?? 0,
    blockPiercing: baseStats.blockPiercing ?? 0,
    haste: baseStats.haste ?? 0,
    rageLimit: baseStats.rageLimit ?? 1000,

    // extra runtime stats
    fixedDmgBonus: 0,
    fixedDmgRes: 0,
    directDmgBonus: 0,
    healEffect: 0,
    normalAttackDamage: 0,
    techniqueDamage: 0,
    ultimateDamage: 0,
    finalDamageBonus: 0,
    blockRate: 0
  };
}

function createFighterRuntime(heroKey, heroData, loadout = {}) {
  const baseStats = deepClone(heroData.baseStats ?? {});
  const computedStats = createEmptyComputedStats(baseStats);

  return {
    key: heroKey,
    id: heroData.id ?? heroKey,
    name: heroData.name ?? heroKey,
    role: heroData.role ?? "unknown",
    type: heroData.type ?? "unknown",
    rarity: heroData.rarity ?? "unknown",

    heroData: deepClone(heroData),
    loadout: deepClone(loadout),

    baseStats,
    computedStats,

    current: {
      hp: computedStats.hp,
      rage: 0,
      soulArmor: 0,
      maxSoulArmor: 0
    },

    buffs: [],
    debuffs: [],
    cooldowns: {},
    counters: {
      normalAttackCount: 0,
      techniqueCount: 0
    },
    snapshots: {
      initialAtk: computedStats.atk,
      maxRecordedAtk: computedStats.atk
    },
    flags: {},
    alive: true
  };
}

function createBattleState(fighterA, fighterB, options = {}) {
  return {
    time: 0,
    tickSize: options.tickSize ?? 0.5,
    maxTime: options.maxTime ?? 120,
    winner: null,

    fighters: {
      a: fighterA,
      b: fighterB
    },

    queue: [],
    log: [],
    options: {
      verboseLog: options.verboseLog ?? true
    }
  };
}

function getOpponentKey(side) {
  return side === "a" ? "b" : "a";
}

function getFighter(battleState, side) {
  return battleState.fighters[side];
}

function getOpponent(battleState, side) {
  return battleState.fighters[getOpponentKey(side)];
}

function pushLog(battleState, entry) {
  battleState.log.push({
    time: Number(battleState.time.toFixed(2)),
    ...entry
  });
}

module.exports = {
  deepClone,
  createFighterRuntime,
  createBattleState,
  getFighter,
  getOpponent,
  getOpponentKey,
  pushLog
};
