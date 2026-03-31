// compare/compareResolver.js

const { getFighter, getOpponent, pushLog } = require("./compareState");

/**
 * Qui mettiamo un evaluator minimo.
 * Più avanti lo sposteremo in compareConditions.js
 */
function evaluateCondition(condition, ctx) {
  if (!condition) return true;

  const { source, target, event } = ctx;

  if (typeof condition !== "object") return true;

  if (condition.targetCount !== undefined) {
    const count = event.payload?.targetCount ?? 1;
    if (count !== condition.targetCount) return false;
  }

  if (condition.targetCountMin !== undefined) {
    const count = event.payload?.targetCount ?? 1;
    if (count < condition.targetCountMin) return false;
  }

  if (condition.hpBelow !== undefined) {
    const hpRatio = source.current.hp / Math.max(source.computedStats.hp, 1);
    if (hpRatio >= condition.hpBelow) return false;
  }

  if (condition.targetHasDebuff) {
    const hasDebuff = target.debuffs.some(d => d.id === condition.targetHasDebuff);
    if (!hasDebuff) return false;
  }

  if (condition.highestInitialAtk === true) {
    const opponent = ctx.opponent;
    if ((source.snapshots.initialAtk ?? 0) < (opponent.snapshots.initialAtk ?? 0)) {
      return false;
    }
  }

  return true;
}

/**
 * Per ora raccogliamo effetti solo da:
 * - skill dell'eroe
 * - arma exclusive
 * - talenti
 *
 * Più avanti aggiungerai:
 * - noble phantasm
 * - runes
 * - clothes
 * - soul jades
 * - buff/debuff runtime
 */
function collectActiveEffects(source) {
  const collected = [];

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

  return collected;
}

/**
 * Qui per ora non applichiamo davvero gli effetti.
 * Li logghiamo soltanto, così il telaio è già funzionante.
 * Nel prossimo giro collegheremo compareEffects.js.
 */
function applyEffectPlaceholder(battleState, effectEntry, ctx) {
  pushLog(battleState, {
    kind: "effect_triggered",
    ownerType: effectEntry.ownerType,
    ownerId: effectEntry.ownerId,
    effectType: effectEntry.effect.type ?? "unknown",
    source: ctx.event.source ?? null,
    target: ctx.event.target ?? null
  });
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

    applyEffectPlaceholder(battleState, entry, ctx);
  }
}

module.exports = {
  resolveEvent,
  collectActiveEffects,
  evaluateCondition
};
