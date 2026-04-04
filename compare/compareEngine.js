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

/**
 * Per ora profilo base per classi note.
 * Mage e Support: 1 attack cycle ogni 1 secondo.
 * Fallback prudente: 1 secondo.
 */
function getBaseAttackCycleIntervalSec(fighter) {
  const role = fighter.heroData?.role?.toLowerCase?.() ?? "";

  switch (role) {
    case "mage":
      return 1.0;

    case "support":
      return 1.0;

    default:
      return 1.0;
  }
}

/**
 * Per ora teniamo l'interval semplice.
 * Più avanti potremo fare:
 * base * (100 / attackSpeed)
 * oppure integrare haste reale.
 */
function getEffectiveAttackCycleIntervalSec(fighter) {
  return getBaseAttackCycleIntervalSec(fighter);
}

function initializeCombatTimers(fighter) {
  fighter.attackProfile = {
    cycleIntervalSec: getEffectiveAttackCycleIntervalSec(fighter)
  };

  fighter.timers = {
    nextAttackAt: fighter.attackProfile.cycleIntervalSec
  };
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
    },
    attackProfile: {
      cycleIntervalSec: fighter.attackProfile?.cycleIntervalSec ?? null
    },
    timers: {
      nextAttackAt: fighter.timers?.nextAttackAt ?? null
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

  pushLog(battleState, {
    kind: "basic_attack_started",
    source: sourceSide,
    target: targetSide,
    time: battleState.time
  });

  emitEvent(battleState, {
    type: "onNormalAttack",
    source: sourceSide,
    target: targetSide,
    payload: { targetCount: 1 }
  });

  processQueue(battleState);

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

function canAttackNow(fighter, battleState) {
  if (!fighter?.alive) return false;
  if (!fighter.timers) return false;
  if (fighter.timers.nextAttackAt == null) return false;

  return battleState.time >= fighter.timers.nextAttackAt;
}

function scheduleNextAttack(fighter) {
  if (!fighter?.timers || !fighter?.attackProfile) return;

  fighter.timers.nextAttackAt = Number(
    (fighter.timers.nextAttackAt + fighter.attackProfile.cycleIntervalSec).toFixed(2)
  );
}

function tryPerformScheduledAttack(battleState, sourceSide) {
  const source = getFighter(battleState, sourceSide);
  if (!source?.alive) return;

  if (!canAttackNow(source, battleState)) return;

  pushLog(battleState, {
    kind: "attack_timer_ready",
    source: sourceSide,
    time: battleState.time,
    nextAttackAt: source.timers.nextAttackAt
  });

  performBasicAttack(battleState, sourceSide);
  scheduleNextAttack(source);

  pushLog(battleState, {
    kind: "attack_timer_rescheduled",
    source: sourceSide,
    time: battleState.time,
    nextAttackAt: source.timers.nextAttackAt
  });
}

/**
 * Per ora:
 * - ogni fighter ha un timer
 * - se il timer è pronto, fa un attack cycle
 *
 * Nota:
 * il motore resta sequenziale dentro lo stesso tick.
 * Più avanti potremo fare finestre simultanee.
 */
function simulateActionsPlaceholder(battleState) {
  const a = getFighter(battleState, "a");
  const b = getFighter(battleState, "b");

  if (!a.alive || !b.alive) return;

  tryPerformScheduledAttack(battleState, "a");
  if (battleState.winner) return;

  tryPerformScheduledAttack(battleState, "b");
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

    if (fighter.states) {
      for (const [stateId, stateData] of Object.entries(fighter.states)) {
        if (!stateData?.active) continue;
        if (stateData.remainingSec == null) continue;

        stateData.remainingSec = Number((stateData.remainingSec - battleState.tickSize).toFixed(2));

        if (stateData.remainingSec <= 0) {
          stateData.active = false;

          if (stateId === "selfRegeneration" && fighter.flags?.damageImmunity) {
            fighter.flags.damageImmunity = false;
          }

          pushLog(battleState, {
            kind: "state_expired",
            fighter: fighter.id,
            stateId
          });
        }
      }
    }
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

  initializeCombatTimers(fighterA);
  initializeCombatTimers(fighterB);

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
  updateDurations,
  initializeCombatTimers,
  getBaseAttackCycleIntervalSec,
  getEffectiveAttackCycleIntervalSec,
  tryPerformScheduledAttack
};