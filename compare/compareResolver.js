// compare/compareResolver.js

const { getFighter, getOpponent, pushLog } = require("./compareState");
const { applyEffect } = require("./compareEffects");

/**
 * Evaluator minimo.
 * Più avanti potrai spostarlo in compareConditions.js
 */
function evaluateCondition(condition, ctx) {
  if (!condition) return true;

  const { source, target, event, opponent } = ctx;

  if (typeof condition !== "object") return true;

  if (condition.targetCount !== undefined) {
    const count = event.payload?.targetCount ?? 1;
    if (count !== condition.targetCount) return false;
  }

  if (condition.targetCountMin !== undefined) {
    const count = event.payload?.targetCount ?? 1;
    if (count < condition.targetCountMin) return false;
  }

  if (condition.targetCountExact !== undefined) {
    const count = event.payload?.targetCount ?? 1;
    if (count !== condition.targetCountExact) return false;
  }

  if (condition.hpBelow !== undefined) {
    const hpRatio = source.current.hp / Math.max(source.computedStats.hp, 1);
    if (hpRatio >= condition.hpBelow) return false;
  }

  if (condition.targetHasDebuff) {
    const hasDebuff = target.debuffs.some(d => d.id === condition.targetHasDebuff);
    if (!hasDebuff) return false;
  }

  if (condition.debuff) {
    const hasDebuff = target.debuffs.some(d => d.id === condition.debuff);
    if (!hasDebuff) return false;
  }

  if (condition.highestInitialAtk === true) {
    if ((source.snapshots.initialAtk ?? 0) < (opponent.snapshots.initialAtk ?? 0)) {
      return false;
    }
  }

  return true;
}

/**
 * Raccoglie tutti gli effetti attivi lato source.
 */
function collectActiveEffects(source) {
  const collected = [];

  /**
   * =========================
   * HERO SKILLS
   * =========================
   */
  const skills = source.heroData.skills ?? {};
  for (const [skillKey, skillData] of Object.entries(skills)) {
    for (const effect of skillData.effects ?? []) {
      collected.push({
        ownerType: "skill",
        ownerId: skillKey,
        trigger: effect.trigger ?? skillData.category,
        condition: effect.condition,
        effect
      });
    }
  }

  /**
   * =========================
   * EXCLUSIVE WEAPON
   * =========================
   */
  const weaponEffects = source.heroData.exclusiveWeapon?.effects ?? [];
  for (const effect of weaponEffects) {
    collected.push({
      ownerType: "exclusiveWeapon",
      ownerId: source.heroData.exclusiveWeapon?.id ?? "exclusive_weapon",
      trigger: effect.trigger ?? "passive",
      condition: effect.condition,
      effect
    });
  }

  /**
   * =========================
   * TALENTS
   * =========================
   */
  const talents = source.heroData.talents ?? {};
  for (const [talentKey, talentData] of Object.entries(talents)) {
    for (const effect of talentData.effects ?? []) {
      collected.push({
        ownerType: "talent",
        ownerId: talentKey,
        trigger: effect.trigger ?? "passive",
        condition: effect.condition,
        effect
      });
    }
  }

  /**
   * =========================
   * NOBLE PHANTASM
   * =========================
   */
  const noblePhantasmEffects = source.noblePhantasm?.effects ?? [];
  for (const effect of noblePhantasmEffects) {
    collected.push({
      ownerType: "noblePhantasm",
      ownerId: source.noblePhantasm?.id ?? "noble_phantasm",
      trigger: effect.trigger ?? "passive",
      condition: effect.condition,
      effect
    });
  }

  /**
   * =========================
   * ACTIVE BUFFS (runtime)
   * =========================
   */
  for (const buff of source.buffs ?? []) {
    if (!Array.isArray(buff.effects)) continue;

    for (const effect of buff.effects) {
      collected.push({
        ownerType: "buff",
        ownerId: buff.id ?? "runtime_buff",
        trigger: effect.trigger ?? "passive",
        condition: effect.condition,
        effect
      });
    }
  }

  /**
   * =========================
   * ACTIVE DEBUFFS (runtime)
   * =========================
   */
  for (const debuff of source.debuffs ?? []) {
    if (!Array.isArray(debuff.effects)) continue;

    for (const effect of debuff.effects) {
      collected.push({
        ownerType: "debuff",
        ownerId: debuff.id ?? "runtime_debuff",
        trigger: effect.trigger ?? "passive",
        condition: effect.condition,
        effect
      });
    }
  }

  return collected;
}

function resolveEvent(battleState, event) {
  const source = getFighter(battleState, event.source);
  const target = getOpponent(battleState, event.source);

  if (!source || !target) {
    pushLog(battleState, {
      kind: "resolver_warning",
      message: "Missing source or target for event",
      eventType: event.type
    });
    return;
  }

  const ctx = {
    battleState,
    event,
    source,
    target,
    opponent: target
  };

  const activeEffects = collectActiveEffects(source);

  for (const entry of activeEffects) {
    if (entry.trigger !== event.type) continue;
    if (!evaluateCondition(entry.condition, ctx)) continue;

    pushLog(battleState, {
      kind: "effect_triggered",
      ownerType: entry.ownerType,
      ownerId: entry.ownerId,
      effectType: entry.effect.type ?? "unknown",
      source: event.source ?? null,
      target: event.target ?? null
    });

    applyEffect(entry.effect, {
      battleState,
      event,
      source,
      target,
      opponent: target,
      entry
    });
  }
}

module.exports = {
  resolveEvent,
  collectActiveEffects,
  evaluateCondition
};
