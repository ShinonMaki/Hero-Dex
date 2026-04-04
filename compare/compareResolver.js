// compare/compareResolver.js

const { getFighter, getOpponent, pushLog } = require("./compareState");
const { applyEffect } = require("./compareEffects");

/**
 * Normalizza i trigger "umani" dei JSON
 * verso i trigger runtime del motore.
 */
function normalizeTrigger(trigger) {
  const map = {
    // battle start
    battleStart: "onBattleStart",
    onBattleStart: "onBattleStart",

    // attacks
    onAttack: "onNormalAttack",
    onActiveAttack: "onNormalAttack",
    onBasicAttack: "onNormalAttack",
    onNormalAttack: "onNormalAttack",
    onAttackHit: "onNormalAttackHit",
    onNormalAttackHit: "onNormalAttackHit",
    onCritAttack: "onNormalAttackCrit",
    onNormalAttackCrit: "onNormalAttackCrit",

    // skill / technique
    onSkill: "onTechnique",
    onTechnique: "onTechnique",
    onSkillHit: "onTechniqueHit",
    onTechniqueHit: "onTechniqueHit",

    // ultimate
    onUlt: "onUltimate",
    onUltimate: "onUltimate",
    onUltimateHit: "onUltimateHit",
    onUltimateCrit: "onUltimateCrit",

    // heal / shield
    onHeal: "onHeal",
    onActiveHeal: "onActiveHeal",
    onShieldApply: "onShieldApply",

    // misc
    onBlock: "onBlock",
    onHit: "onHit",
    onCondition: "onCondition",
    onAttackSequence: "onAttackSequence",
    onApplyDebuff: "onApplyDebuff",
    onDebuffApplied: "onApplyDebuff",
    onDebuffExpire: "onDebuffExpire",
    onEnemyDeath: "onEnemyDeath",
    onTargetDeath: "onTargetDeath",
    onDeath: "onDeath",
    onFatalDamage: "onFatalDamage",
    onHpBelowThreshold: "onHpBelowThreshold",
    onRageReduced: "onRageReduced",

    // passive style
    passive: "passive",
    always: "always"
  };

  return map[trigger] ?? trigger;
}

/**
 * Traduce le category delle skill eroe nel trigger runtime corretto.
 */
function normalizeSkillCategory(category) {
  const map = {
    ultimate: "onUltimate",
    technique: "onTechnique",
    passive: "passive"
  };

  return map[category] ?? category;
}

/**
 * Alcuni effect type del JSON eroe sono in realtà wrapper evento.
 * Qui li traduciamo in trigger runtime.
 */
function inferTriggerFromEffectType(effectType) {
  const map = {
    combatStartResourceGain: "onBattleStart",
    combatStartSoulArmorGain: "onBattleStart",
    onRageReduced: "onRageReduced",
    onUltimateCast: "onUltimate",
    onFatalDamage: "onFatalDamage",
    onEnemyDeath: "onEnemyDeath",
    onDebuffApplied: "onApplyDebuff",
    onUltimateCrit: "onUltimateCrit"
  };

  return map[effectType] ?? null;
}

/**
 * Se un effect è annidato dentro { effect: {...} }
 * restituisce quello interno, altrimenti restituisce l'oggetto stesso.
 */
function unwrapEffect(effect) {
  if (!effect) return effect;
  return effect.effect ?? effect;
}

function createConditionSnapshot(source, target) {
  return {
    source: {
      current: {
        hp: source.current?.hp ?? 0,
        rage: source.current?.rage ?? 0,
        soulArmor: source.current?.soulArmor ?? 0
      },
      computedStats: {
        ...source.computedStats
      },
      debuffs: Array.isArray(source.debuffs) ? source.debuffs.map(d => ({ ...d })) : [],
      buffs: Array.isArray(source.buffs) ? source.buffs.map(b => ({ ...b })) : [],
      snapshots: {
        ...(source.snapshots ?? {})
      },
      flags: {
        ...(source.flags ?? {})
      }
    },
    target: {
      current: {
        hp: target.current?.hp ?? 0,
        rage: target.current?.rage ?? 0,
        soulArmor: target.current?.soulArmor ?? 0
      },
      computedStats: {
        ...target.computedStats
      },
      debuffs: Array.isArray(target.debuffs) ? target.debuffs.map(d => ({ ...d })) : [],
      buffs: Array.isArray(target.buffs) ? target.buffs.map(b => ({ ...b })) : [],
      snapshots: {
        ...(target.snapshots ?? {})
      },
      flags: {
        ...(target.flags ?? {})
      }
    }
  };
}

function hasDebuff(entity, debuffId) {
  return (entity.debuffs ?? []).some(
    d => d.id === debuffId || d.status === debuffId || d.type === debuffId
  );
}

/**
 * Inizializza il contenitore cooldown runtime.
 */
function ensureResolverState(fighter) {
  if (!fighter.runtimeResolver) {
    fighter.runtimeResolver = {
      cooldowns: {}
    };
  }

  if (!fighter.runtimeResolver.cooldowns) {
    fighter.runtimeResolver.cooldowns = {};
  }
}

function getCooldownKey(entry) {
  const ownerType = entry.ownerType ?? "unknown_owner";
  const ownerId = entry.ownerId ?? "unknown_owner_id";
  const effectName = entry.effect?.name ?? "effect";

  return `${ownerType}:${ownerId}:${effectName}`;
}

function getPerTargetCooldownKey(entry, event, target) {
  const baseKey = getCooldownKey(entry);
  const targetKey = target?.id ?? event?.target ?? "unknown_target";
  return `${baseKey}:target:${targetKey}`;
}

function getCooldownDuration(entry) {
  if (entry.effect?.cooldownPerTargetSec != null) return entry.effect.cooldownPerTargetSec;
  if (entry.effect?.cooldownSec != null) return entry.effect.cooldownSec;
  if (entry.effect?.cooldown != null) return entry.effect.cooldown;
  return 0;
}

function isPerTargetCooldown(entry) {
  return entry.effect?.cooldownPerTargetSec != null;
}

function isOnCooldown(source, entry, event, target, battleState) {
  ensureResolverState(source);

  const key = isPerTargetCooldown(entry)
    ? getPerTargetCooldownKey(entry, event, target)
    : getCooldownKey(entry);

  const readyAt = source.runtimeResolver.cooldowns[key];
  if (readyAt == null) return false;

  return battleState.time < readyAt;
}

function setCooldown(source, entry, event, target, battleState) {
  ensureResolverState(source);

  const duration = getCooldownDuration(entry);
  if (!duration || duration <= 0) return;

  const key = isPerTargetCooldown(entry)
    ? getPerTargetCooldownKey(entry, event, target)
    : getCooldownKey(entry);

  source.runtimeResolver.cooldowns[key] = battleState.time + duration;
}

function passesChance(entry, source, target, battleState) {
  const chance = entry.effect?.chance;
  if (chance == null) return true;

  const roll = Math.random();

  pushLog(battleState, {
    kind: "effect_chance_roll",
    ownerType: entry.ownerType,
    ownerId: entry.ownerId,
    effectName: entry.effect?.name ?? null,
    chance,
    roll,
    passed: roll <= chance,
    source: source?.id ?? null,
    target: target?.id ?? null
  });

  return roll <= chance;
}

/**
 * Gestisce condizioni stringa.
 * Usa SEMPRE lo snapshot pre-evento, non lo stato modificato durante lo stesso evento.
 */
function evaluateStringCondition(condition, ctx) {
  const sourceForCondition = ctx.conditionSource ?? ctx.source;
  const targetForCondition = ctx.conditionTarget ?? ctx.target;
  const opponentForCondition = ctx.conditionOpponent ?? ctx.opponent;

  switch (condition) {
    case "targetHasSilence":
      return hasDebuff(targetForCondition, "silence");

    case "critRateCompetitionWin":
      return (sourceForCondition.computedStats?.critRate ?? 0) > (opponentForCondition.computedStats?.critRate ?? 0);

    case "manaPerceptionStacksGte3":
      return (sourceForCondition.flags?.manaPerceptionStacks ?? 0) >= 3;

    case "manaPerceptionStacksGte3AndTargetHasShield":
      return (
        (sourceForCondition.flags?.manaPerceptionStacks ?? 0) >= 3 &&
        (targetForCondition.current?.soulArmor ?? 0) > 0
      );

    default:
      return true;
  }
}

/**
 * Evaluator minimo.
 * Le condition leggono lo snapshot pre-evento.
 */
function evaluateCondition(condition, ctx) {
  if (!condition) return true;

  const sourceForCondition = ctx.conditionSource ?? ctx.source;
  const targetForCondition = ctx.conditionTarget ?? ctx.target;
  const opponentForCondition = ctx.conditionOpponent ?? ctx.opponent;
  const event = ctx.event;

  if (typeof condition === "string") {
    return evaluateStringCondition(condition, ctx);
  }

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

  if (condition.hitCount !== undefined) {
    const hitCount = event.payload?.hitCount ?? 1;
    if (hitCount !== condition.hitCount) return false;
  }

  if (condition.hpBelow !== undefined) {
    const hpRatio = (sourceForCondition.current?.hp ?? 0) / Math.max(sourceForCondition.computedStats?.hp ?? 1, 1);
    if (hpRatio >= condition.hpBelow) return false;
  }

  if (condition.targetHasDebuff) {
    if (!hasDebuff(targetForCondition, condition.targetHasDebuff)) return false;
  }

  if (condition.debuff) {
    if (!hasDebuff(targetForCondition, condition.debuff)) return false;
  }

  if (condition.targetDebuff) {
    if (!hasDebuff(targetForCondition, condition.targetDebuff)) return false;
  }

  if (condition.highestInitialAtk === true) {
    if ((sourceForCondition.snapshots?.initialAtk ?? 0) < (opponentForCondition.snapshots?.initialAtk ?? 0)) {
      return false;
    }
  }

  if (condition.stacks !== undefined && condition.targetDebuff) {
    const debuff = (targetForCondition.debuffs ?? []).find(
      d => d.id === condition.targetDebuff || d.status === condition.targetDebuff
    );

    if (!debuff || (debuff.stacks ?? 1) < condition.stacks) {
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
      const unwrappedEffect = unwrapEffect(effect);
      const inferredTrigger =
        normalizeTrigger(effect.trigger) ||
        inferTriggerFromEffectType(unwrappedEffect?.type) ||
        normalizeSkillCategory(skillData.category);

      collected.push({
        ownerType: "skill",
        ownerId: skillKey,
        trigger: inferredTrigger,
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
    const unwrappedEffect = unwrapEffect(effect);
    const inferredTrigger =
      normalizeTrigger(effect.trigger) ||
      inferTriggerFromEffectType(unwrappedEffect?.type) ||
      "passive";

    collected.push({
      ownerType: "exclusiveWeapon",
      ownerId: source.heroData.exclusiveWeapon?.id ?? "exclusive_weapon",
      trigger: inferredTrigger,
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
      const unwrappedEffect = unwrapEffect(effect);
      const inferredTrigger =
        normalizeTrigger(effect.trigger) ||
        inferTriggerFromEffectType(unwrappedEffect?.type) ||
        "passive";

      collected.push({
        ownerType: "talent",
        ownerId: talentKey,
        trigger: inferredTrigger,
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
    const unwrappedEffect = unwrapEffect(effect);
    const inferredTrigger =
      normalizeTrigger(effect.trigger) ||
      inferTriggerFromEffectType(unwrappedEffect?.type) ||
      "passive";

      collected.push({
        ownerType: "noblePhantasm",
        ownerId: source.noblePhantasm?.id ?? "noble_phantasm",
        trigger: inferredTrigger,
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
      const unwrappedEffect = unwrapEffect(effect);
      const inferredTrigger =
        normalizeTrigger(effect.trigger) ||
        inferTriggerFromEffectType(unwrappedEffect?.type) ||
        "passive";

      collected.push({
        ownerType: "buff",
        ownerId: buff.id ?? "runtime_buff",
        trigger: inferredTrigger,
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
      const unwrappedEffect = unwrapEffect(effect);
      const inferredTrigger =
        normalizeTrigger(effect.trigger) ||
        inferTriggerFromEffectType(unwrappedEffect?.type) ||
        "passive";

      collected.push({
        ownerType: "debuff",
        ownerId: debuff.id ?? "runtime_debuff",
        trigger: inferredTrigger,
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

  const snapshot = createConditionSnapshot(source, target);

  const ctx = {
    battleState,
    event,
    source,
    target,
    opponent: target,

    // snapshot pre-evento usato SOLO per condition
    conditionSource: snapshot.source,
    conditionTarget: snapshot.target,
    conditionOpponent: snapshot.target
  };

  const activeEffects = collectActiveEffects(source);

  for (const entry of activeEffects) {
    if (entry.trigger === "passive" || entry.trigger === "always") continue;
    if (entry.trigger !== event.type) continue;

    if (!evaluateCondition(entry.condition, ctx)) {
      pushLog(battleState, {
        kind: "effect_skipped_condition",
        ownerType: entry.ownerType,
        ownerId: entry.ownerId,
        effectName: entry.effect?.name ?? null,
        source: event.source ?? null,
        target: event.target ?? null
      });
      continue;
    }

    if (isOnCooldown(source, entry, event, target, battleState)) {
      pushLog(battleState, {
        kind: "effect_skipped_cooldown",
        ownerType: entry.ownerType,
        ownerId: entry.ownerId,
        effectName: entry.effect?.name ?? null,
        source: event.source ?? null,
        target: event.target ?? null
      });
      continue;
    }

    if (!passesChance(entry, source, target, battleState)) {
      pushLog(battleState, {
        kind: "effect_skipped_chance",
        ownerType: entry.ownerType,
        ownerId: entry.ownerId,
        effectName: entry.effect?.name ?? null,
        source: event.source ?? null,
        target: event.target ?? null
      });
      continue;
    }

    const resolvedEffect = unwrapEffect(entry.effect);

    pushLog(battleState, {
      kind: "effect_triggered",
      ownerType: entry.ownerType,
      ownerId: entry.ownerId,
      effectType: resolvedEffect?.type ?? "unknown",
      effectName: entry.effect?.name ?? null,
      source: event.source ?? null,
      target: event.target ?? null
    });

    applyEffect(resolvedEffect, {
      battleState,
      event,
      source,
      target,
      opponent: target,
      entry
    });

    setCooldown(source, entry, event, target, battleState);
  }
}

module.exports = {
  resolveEvent,
  collectActiveEffects,
  evaluateCondition,
  normalizeTrigger,
  normalizeSkillCategory,
  inferTriggerFromEffectType,
  unwrapEffect
};