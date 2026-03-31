// compare/compareEngine.js

const {
  createBattleState,
  getFighter,
  getOpponent,
  pushLog
} = require("./compareState");

const { emitEvent, processQueue } = require("./compareTriggers");
const { buildFighter } = require("./compareBuild");
const { dealBasicAttackDamage } = require("./compareEffects");

/**
 * Costruisce un fighter usando il compareBuild.
 * Qui colleghiamo il runtime ai moduli statici:
 * - rune
 * - noble phantasm
 * - equipment
 * - soul jade
 * - clothes
 */
function buildBattleFighter(heroKey, heroData, sideOptions = {}) {
  return buildFighter(
    heroKey,
    heroData,
    sideOptions.loadout ?? {},
    {
      runeSetData: sideOptions.runeSetData ?? null,
      noblePhantasmData: sideOptions.noblePhantasmData ?? null,
      equipmentSetData: sideOptions.equipmentSetData ?? null,
      soulJadeDataList: sideOptions.soulJadeDataList ?? [],
      clothesSetData: sideOptions.clothesSetData ?? null
    }
  );
}

function logFighterSnapshot(battleState, side, fighter) {
  pushLog(battleState, {
    kind: "fighter_built",
    side,
    fighterId: fighter.id,
    fighterName: fighter.name,
    computedStats: {
      atk: fighter.computedStats.atk,
      hp: fighter.computedStats.hp,
      def: fighter.computedStats.def,
      critRate: fighter.computedStats.critRate,
      critDmg: fighter.computedStats.critDmg,
      dmgBonus: fighter.computedStats.dmgBonus,
      fixedDmgBonus: fighter.computedStats.fixedDmgBonus,
      fixedDmgRes: fighter.computedStats.fixedDmgRes,
      blockRate: fighter.computedStats.blockRate
    },
    current: {
      hp: fighter.current.hp,
      rage: fighter.current.rage,
      soulArmor: fighter.current.soulArmor,
      maxSoulArmor: fighter.current.maxSoulArmor
    }
  });
}

function checkWinner(battleState) {
  const a = getFighter(battleState, "a");
  const b = getFighter(battleState, "b");

  if (!a.alive && !b.alive) {
    battleState.winner = "draw";
    return;
  }

  if (!a.alive) {
    battleState.winner = "b";
    return;
  }

  if (!b.alive) {
    battleState.winner = "a";
  }
}

function emitBattleStart(battleState) {
  emitEvent(battleState, {
    type: "onBattleStart",
    source: "a",
    target: "b",
    payload: {}
  });

  emitEvent(battleState, {
    type: "onBattleStart",
    source: "b",
    target: "a",
    payload: {}
  });
}

function emitTickEvents(battleState) {
  emitEvent(battleState, {
    type: "onTick",
    source: "a",
    target: "b",
    payload: { time: battleState.time }
  });

  emitEvent(battleState, {
    type: "onTick",
    source: "b",
    target: "a",
    payload: { time: battleState.time }
  });
}

/**
 * Esegue un basic attack completo:
 * 1. emette onNormalAttack
 * 2. risolve i trigger collegati
 * 3. infligge danno base
 * 4. emette onNormalAttackHit
 * 5. risolve eventuali effetti after-hit
 */
function performBasicAttack(battleState, sourceSide) {
  const source = getFighter(battleState, sourceSide);
  const targetSide = sourceSide === "a" ? "b" : "a";
  const target = getFighter(battleState, targetSide);

  if (!source?.alive || !target?.alive) return;

  emitEvent(battleState, {
    type: "onNormalAttack",
    source: sourceSide,
    target: targetSide,
    payload: { targetCount: 1 }
  });

  processQueue(battleState);

  // se uno dei due è morto durante i trigger, stop
  if (!source.alive || !target.alive) return;

  dealBasicAttackDamage({
    source,
    target,
    battleState
  });

  checkWinner(battleState);
  if (battleState.winner) return;

  emitEvent(battleState, {
    type: "onNormalAttackHit",
    source: sourceSide,
    target: targetSide,
    payload: { targetCount: 1 }
  });

  processQueue(battleState);
  checkWinner(battleState);
}

/**
 * Placeholder temporaneo:
 * per ora facciamo solo basic attack reali.
 * Più avanti qui entreranno:
 * - rage logic
 * - technique
 * - ultimate
 * - velocità / haste
 * - target count dinamico
 */
function simulateActionsPlaceholder(battleState) {
  const a = getFighter(battleState, "a");
  const b = getFighter(battleState, "b");

  if (!a.alive || !b.alive) return;

  performBasicAttack(battleState, "a");
  if (battleState.winner) return;

  performBasicAttack(battleState, "b");
}

/**
 * Riduce la durata di buff/debuff runtime.
 * Per ora semplice: decrementa di tickSize e rimuove se scaduti.
 */
function updateDurations(battleState) {
  const fighters = [battleState.fighters.a, battleState.fighters.b];

  for (const fighter of fighters) {
    fighter.buffs = fighter.buffs.filter(buff => {
      if (buff.remainingSec == null) return true;
      buff.remainingSec = Number((buff.remainingSec - battleState.tickSize).toFixed(2));
      return buff.remainingSec > 0;
    });

    fighter.debuffs = fighter.debuffs.filter(debuff => {
      if (debuff.remainingSec == null) return true;
      debuff.remainingSec = Number((debuff.remainingSec - battleState.tickSize).toFixed(2));
      return debuff.remainingSec > 0;
    });
  }
}

function advanceTick(battleState) {
  battleState.time = Number((battleState.time + battleState.tickSize).toFixed(2));

  pushLog(battleState, {
    kind: "tick",
    time: battleState.time
  });

  emitTickEvents(battleState);
  processQueue(battleState);

  checkWinner(battleState);
  if (battleState.winner) return;

  simulateActionsPlaceholder(battleState);
  if (battleState.winner) return;

  updateDurations(battleState);
  checkWinner(battleState);
}

/**
 * options:
 * {
 *   tickSize,
 *   maxTime,
 *   verboseLog,
 *
 *   sideA: {
 *     loadout,
 *     runeSetData,
 *     noblePhantasmData,
 *     equipmentSetData,
 *     soulJadeDataList,
 *     clothesSetData
 *   },
 *
 *   sideB: {
 *     loadout,
 *     runeSetData,
 *     noblePhantasmData,
 *     equipmentSetData,
 *     soulJadeDataList,
 *     clothesSetData
 *   }
 * }
 */
function runBattle(heroAKey, heroAData, heroBKey, heroBData, options = {}) {
  const sideA = options.sideA ?? {};
  const sideB = options.sideB ?? {};

  const fighterA = buildBattleFighter(heroAKey, heroAData, sideA);
  const fighterB = buildBattleFighter(heroBKey, heroBData, sideB);

  const battleState = createBattleState(fighterA, fighterB, {
    tickSize: options.tickSize ?? 0.5,
    maxTime: options.maxTime ?? 30,
    verboseLog: options.verboseLog ?? true
  });

  pushLog(battleState, {
    kind: "battle_starting",
    fighters: [fighterA.name, fighterB.name]
  });

  logFighterSnapshot(battleState, "a", fighterA);
  logFighterSnapshot(battleState, "b", fighterB);

  emitBattleStart(battleState);
  processQueue(battleState);
  checkWinner(battleState);

  while (!battleState.winner && battleState.time < battleState.maxTime) {
    advanceTick(battleState);
  }

  if (!battleState.winner) {
    battleState.winner = "timeout";
  }

  pushLog(battleState, {
    kind: "battle_finished",
    winner: battleState.winner,
    finalHp: {
      a: battleState.fighters.a.current.hp,
      b: battleState.fighters.b.current.hp
    },
    finalRage: {
      a: battleState.fighters.a.current.rage,
      b: battleState.fighters.b.current.rage
    },
    finalSoulArmor: {
      a: battleState.fighters.a.current.soulArmor,
      b: battleState.fighters.b.current.soulArmor
    }
  });

  return {
    winner: battleState.winner,
    durationSec: battleState.time,
    fighters: battleState.fighters,
    log: battleState.log
  };
}

module.exports = {
  runBattle,
  buildBattleFighter,
  checkWinner,
  emitBattleStart,
  emitTickEvents,
  advanceTick,
  simulateActionsPlaceholder,
  performBasicAttack,
  updateDurations
};
