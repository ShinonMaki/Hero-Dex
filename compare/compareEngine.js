// compare/compareEngine.js

const {
  createFighterRuntime,
  createBattleState,
  getFighter,
  getOpponent,
  pushLog
} = require("./compareState");

const { emitEvent, processQueue } = require("./compareTriggers");

/**
 * MVP professionale:
 * - crea fighter runtime
 * - imposta hp/rage iniziali
 * - fa partire onBattleStart
 * - avanza a tick
 * - per ora non esegue ancora danni reali
 */

function initializeFighter(fighter) {
  fighter.current.hp = fighter.computedStats.hp;
  fighter.current.rage = 0;
  fighter.current.soulArmor = fighter.computedStats.soulArmor ?? 0;
  fighter.current.maxSoulArmor = fighter.computedStats.soulArmor ?? 0;

  fighter.snapshots.initialAtk = fighter.computedStats.atk;
  fighter.snapshots.maxRecordedAtk = fighter.computedStats.atk;
}

function buildSimpleFighter(heroKey, heroData, loadout = {}) {
  const fighter = createFighterRuntime(heroKey, heroData, loadout);
  initializeFighter(fighter);
  return fighter;
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

function simulateActionsPlaceholder(battleState) {
  // Qui per ora non facciamo ancora auto/technique/ultimate reali.
  // Serve solo a far girare il telaio.
  const a = getFighter(battleState, "a");
  const b = getOpponent(battleState, "a");

  if (a.alive && b.alive) {
    emitEvent(battleState, {
      type: "onNormalAttack",
      source: "a",
      target: "b",
      payload: { targetCount: 1 }
    });

    emitEvent(battleState, {
      type: "onNormalAttack",
      source: "b",
      target: "a",
      payload: { targetCount: 1 }
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
  simulateActionsPlaceholder(battleState);

  processQueue(battleState);
  checkWinner(battleState);
}

function runBattle(heroAKey, heroAData, heroBKey, heroBData, options = {}) {
  const fighterA = buildSimpleFighter(heroAKey, heroAData, options.loadoutA ?? {});
  const fighterB = buildSimpleFighter(heroBKey, heroBData, options.loadoutB ?? {});

  const battleState = createBattleState(fighterA, fighterB, {
    tickSize: options.tickSize ?? 0.5,
    maxTime: options.maxTime ?? 30,
    verboseLog: options.verboseLog ?? true
  });

  pushLog(battleState, {
    kind: "battle_starting",
    fighters: [fighterA.name, fighterB.name]
  });

  emitBattleStart(battleState);
  processQueue(battleState);

  while (!battleState.winner && battleState.time < battleState.maxTime) {
    advanceTick(battleState);
  }

  if (!battleState.winner) {
    battleState.winner = "timeout";
  }

  pushLog(battleState, {
    kind: "battle_finished",
    winner: battleState.winner
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
  buildSimpleFighter,
  initializeFighter,
  checkWinner,
  advanceTick
};
