// compare/compareEffects.js

const { pushLog } = require("./compareState");

/**
 * =========================
 * HELPERS
 * =========================
 */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveEffectTarget(effect, ctx) {
  if (!effect?.target) return ctx.target;

  switch (effect.target) {
    case "self":
      return ctx.source;
    case "enemy":
      return ctx.target;
    case "lowestHpAlly":
      return ctx.source; // in 1v1 per ora coincide
    case "highestAtkAlly":
      return ctx.source; // in 1v1 per ora coincide
    case "shieldedAlly":
      return ctx.source; // placeholder 1v1
    case "allAllies":
      return ctx.source; // placeholder 1v1
    default:
      return ctx.target;
  }
}

function hasDamageImmunity(target) {
  return Boolean(target.flags?.damageImmunity);
}

function canTriggerFatalRecovery(target) {
  return !target.flags?.fatalRecoveryUsed;
}

function triggerFatalRecovery(target, battleState) {
  const selfRegeneration = target.heroData?.mechanics?.selfRegeneration;
  if (!selfRegeneration) return false;
  if (!canTriggerFatalRecovery(target)) return false;

  target.flags = target.flags ?? {};
  target.states = target.states ?? {};

  target.flags.fatalRecoveryUsed = true;
  target.current.hp = 1;

  target.states.selfRegeneration = {
    active: true,
    remainingSec: selfRegeneration.durationSec ?? 5
  };

  if (selfRegeneration.damageImmunity) {
    target.flags.damageImmunity = true;
  }

  pushLog(battleState, {
    kind: "fatal_recovery_triggered",
    target: target.id,
    hpAfter: target.current.hp,
    state: "selfRegeneration",
    durationSec: selfRegeneration.durationSec ?? 5
  });

  return true;
}

/**
 * =========================
 * HP / SOUL ARMOR HANDLING
 * =========================
 */

function applyHpLoss(target, damage, battleState) {
  if (hasDamageImmunity(target)) {
    pushLog(battleState, {
      kind: "damage_immune",
      target: target.id,
      preventedDamage: damage
    });
    return;
  }

  let remaining = damage;

  if (target.current.soulArmor > 0) {
    const absorbed = Math.min(target.current.soulArmor, remaining);
    target.current.soulArmor -= absorbed;
    remaining -= absorbed;

    pushLog(battleState, {
      kind: "soul_armor_absorb",
      target: target.id,
      absorbed
    });
  }

  if (remaining > 0) {
    const hpBefore = target.current.hp;
    const hpAfter = Math.max(0, hpBefore - remaining);
    const wouldDie = hpAfter <= 0;

    target.current.hp = hpAfter;

    pushLog(battleState, {
      kind: "hp_loss",
      target: target.id,
      damage: remaining,
      hpLeft: target.current.hp
    });

    if (wouldDie) {
      const recovered = triggerFatalRecovery(target, battleState);

      if (!recovered) {
        target.alive = false;

        pushLog(battleState, {
          kind: "death",
          target: target.id
        });
      }
    }
  }
}

/**
 * =========================
 * DAMAGE
 * =========================
 */

function computeDamageBase(effect, ctx) {
  const { source, target } = ctx;

  if (effect.scaling && typeof effect.scaling === "object") {
    let damage = 0;

    if (effect.scaling.atkMultiplier) {
      damage += source.computedStats.atk * effect.scaling.atkMultiplier;
    }

    if (effect.scaling.targetMaxHpPercent) {
      damage += target.computedStats.hp * effect.scaling.targetMaxHpPercent;
    }

    if (effect.scaling.capAtkMultiplier) {
      const cap = source.computedStats.atk * effect.scaling.capAtkMultiplier;
      damage = Math.min(damage, cap);
    }

    return damage;
  }

  if (effect.value) {
    if (effect.scaling === "hp") {
      return source.computedStats.hp * effect.value;
    }

    return source.computedStats.atk * effect.value;
  }

  return 0;
}

function dealDamage(effect, ctx) {
  const { source, target, battleState } = ctx;

  let damage = computeDamageBase(effect, ctx);

  if (effect.damageType === "true") {
    damage *= 1 + (source.computedStats.fixedDmgBonus ?? 0);
    damage *= 1 - (target.computedStats.fixedDmgRes ?? 0);
  } else {
    damage *= 1 + (source.computedStats.dmgBonus ?? 0) + (source.computedStats.finalDamageBonus ?? 0);
    damage *= 1 - (target.computedStats.dmgReduction ?? 0);
  }

  damage = Math.max(0, damage);

  pushLog(battleState, {
    kind: "damage",
    source: source.id,
    target: target.id,
    amount: damage,
    type: effect.damageType ?? "normal"
  });

  applyHpLoss(target, damage, battleState);
}

function dealBasicAttackDamage(ctx) {
  const { source, target, battleState } = ctx;

  let damage = source.computedStats.atk;
  damage *= 1 + (source.computedStats.normalAttackDamage ?? 0);
  damage *= 1 + (source.computedStats.dmgBonus ?? 0) + (source.computedStats.finalDamageBonus ?? 0);
  damage *= 1 - (target.computedStats.dmgReduction ?? 0);

  damage = Math.max(0, damage);

  pushLog(battleState, {
    kind: "damage",
    source: source.id,
    target: target.id,
    amount: damage,
    type: "basic_attack"
  });

  applyHpLoss(target, damage, battleState);
}

/**
 * =========================
 * HEAL
 * =========================
 */

function applyHeal(effect, ctx) {
  const { source, battleState } = ctx;
  const target = resolveEffectTarget(effect, ctx);

  let heal = 0;

  if (effect.scaling === "atk" || effect.valueType === "selfAtkPercent") {
    heal = source.computedStats.atk * (effect.value ?? 0);
  } else if (effect.valueType === "selfMaxHpPercent") {
    heal = source.computedStats.hp * (effect.value ?? 0);
  } else if (effect.value) {
    heal = source.computedStats.atk * effect.value;
  }

  heal *= 1 + (source.computedStats.healEffect ?? 0);
  heal = Math.max(0, heal);

  target.current.hp = Math.min(target.computedStats.hp, target.current.hp + heal);

  pushLog(battleState, {
    kind: "heal",
    source: source.id,
    target: target.id,
    amount: heal,
    hpAfter: target.current.hp
  });
}

/**
 * =========================
 * BUFF / DEBUFF / STATUS
 * =========================
 */

function applyBuff(effect, ctx) {
  const { battleState } = ctx;
  const target = resolveEffectTarget(effect, ctx);

  const buffId = effect.name ?? effect.id ?? effect.stat ?? "buff";

  const buff = {
    id: buffId,
    type: effect.type,
    stats: effect.stats ?? null,
    stat: effect.stat ?? null,
    value: effect.value ?? null,
    durationSec: effect.durationSec ?? effect.duration ?? null,
    remainingSec: effect.durationSec ?? effect.duration ?? null,
    dispellable: effect.dispellable ?? true,
    effects: effect.effects ?? null
  };

  target.buffs.push(buff);

  pushLog(battleState, {
    kind: "buff_applied",
    target: target.id,
    buffId: buff.id
  });
}

function applyDebuff(effect, ctx) {
  const { battleState } = ctx;
  const target = resolveEffectTarget(effect, ctx);

  const debuffId =
    effect.debuffId ??
    effect.name ??
    effect.status ??
    effect.stat ??
    "debuff";

  const debuff = {
    id: debuffId,
    type: effect.type,
    stat: effect.stat ?? null,
    status: effect.status ?? null,
    value: effect.value ?? null,
    durationSec: effect.durationSec ?? effect.duration ?? null,
    remainingSec: effect.durationSec ?? effect.duration ?? null,
    dispellable: effect.dispellable ?? true,
    effects: effect.effects ?? null,
    stacks: effect.stacks ?? 1,
    maxStacks: effect.maxStacks ?? 1
  };

  target.debuffs.push(debuff);

  pushLog(battleState, {
    kind: "debuff_applied",
    target: target.id,
    debuffId: debuff.id
  });
}

function applyStatus(effect, ctx) {
  return applyDebuff(effect, ctx);
}

function applyEnemyDebuff(effect, ctx) {
  return applyDebuff(effect, ctx);
}

/**
 * =========================
 * RAGE
 * =========================
 */

function restoreRage(effect, ctx) {
  const { battleState } = ctx;
  const target = resolveEffectTarget(effect, ctx);

  target.current.rage = clamp(
    target.current.rage + (effect.value ?? 0),
    0,
    target.computedStats.rageLimit
  );

  pushLog(battleState, {
    kind: "rage_gain",
    target: target.id,
    amount: effect.value,
    rage: target.current.rage
  });
}

function reduceRage(effect, ctx) {
  const { battleState } = ctx;
  const target = resolveEffectTarget(effect, ctx);

  target.current.rage = Math.max(0, target.current.rage - (effect.value ?? 0));

  pushLog(battleState, {
    kind: "rage_loss",
    target: target.id,
    amount: effect.value,
    rage: target.current.rage
  });
}

/**
 * =========================
 * SOUL ARMOR / SHIELD
 * =========================
 */

function grantSoulArmor(effect, ctx) {
  const { source, battleState } = ctx;
  const target = resolveEffectTarget(effect, ctx);

  let amount = effect.value ?? 0;

  if (effect.scaling?.casterMaxHpPercent) {
    amount = source.computedStats.hp * effect.scaling.casterMaxHpPercent;
  } else if (effect.valueType === "selfMaxHpPercent") {
    amount = source.computedStats.hp * (effect.value ?? 0);
  } else if (effect.valueType === "selfAtkPercent") {
    amount = source.computedStats.atk * (effect.value ?? 0);
  }

  amount = Math.max(0, amount);

  if (!target.current.maxSoulArmor || target.current.maxSoulArmor <= 0) {
    target.current.maxSoulArmor = amount;
  }

  target.current.soulArmor = Math.min(
    target.current.maxSoulArmor,
    target.current.soulArmor + amount
  );

  pushLog(battleState, {
    kind: "soul_armor_gain",
    target: target.id,
    amount,
    soulArmor: target.current.soulArmor
  });
}

function applyShield(effect, ctx) {
  const { source, battleState } = ctx;
  const target = resolveEffectTarget(effect, ctx);

  let amount = 0;

  if (effect.valueType === "selfAtkPercent") {
    amount = source.computedStats.atk * (effect.value ?? 0);
  } else if (effect.valueType === "selfMaxHpPercent") {
    amount = source.computedStats.hp * (effect.value ?? 0);
  } else {
    amount = effect.value ?? 0;
  }

  amount = Math.max(0, amount);

  target.current.soulArmor += amount;
  target.current.maxSoulArmor += amount;

  pushLog(battleState, {
    kind: "shield_applied",
    source: source.id,
    target: target.id,
    amount,
    soulArmor: target.current.soulArmor,
    maxSoulArmor: target.current.maxSoulArmor
  });
}

/**
 * =========================
 * STATE / SPECIAL MECHANICS
 * =========================
 */

function applyFixedDamageBonusFromCritRate(effect, ctx) {
  const { source, battleState } = ctx;

  pushLog(battleState, {
    kind: "effect_placeholder",
    effectType: "fixedDamageBonusFromCritRate",
    source: source.id,
    detail: effect
  });
}

function applyUltimateFixedDamageBonus(effect, ctx) {
  const { source, battleState } = ctx;

  pushLog(battleState, {
    kind: "effect_placeholder",
    effectType: "ultimateFixedDamageBonus",
    source: source.id,
    detail: effect
  });
}

function applySetHp(effect, ctx) {
  const { battleState } = ctx;
  const target = resolveEffectTarget(effect, ctx);

  target.current.hp = clamp(effect.value ?? 1, 0, target.computedStats.hp);

  pushLog(battleState, {
    kind: "set_hp",
    target: target.id,
    hpAfter: target.current.hp
  });
}

function enterState(effect, ctx) {
  const { battleState } = ctx;
  const target = resolveEffectTarget(effect, ctx);
  const stateId = effect.stateId;

  if (!stateId) return;

  const mechanicState = target.heroData?.mechanics?.[stateId];

  target.states = target.states ?? {};
  target.flags = target.flags ?? {};

  target.states[stateId] = {
    active: true,
    remainingSec: mechanicState?.durationSec ?? null
  };

  if (mechanicState?.damageImmunity) {
    target.flags.damageImmunity = true;
  }

  pushLog(battleState, {
    kind: "state_entered",
    target: target.id,
    stateId,
    durationSec: mechanicState?.durationSec ?? null
  });
}

/**
 * =========================
 * RESOURCE / SPECIAL WRAPPERS
 * =========================
 */

function applyCombatStartResourceGain(effect, ctx) {
  if (effect.resource === "rage") {
    return restoreRage(effect, ctx);
  }

  const { source, battleState } = ctx;

  pushLog(battleState, {
    kind: "resource_gain_placeholder",
    source: source.id,
    resource: effect.resource,
    value: effect.value ?? 0
  });
}

function applyCombatStartSoulArmorGain(effect, ctx) {
  const wrapped = {
    type: "grantSoulArmor",
    target: "self",
    value: effect.value,
    valueType: effect.valueType
  };

  return grantSoulArmor(wrapped, ctx);
}

/**
 * =========================
 * MAIN APPLY
 * =========================
 */

function applyEffect(effect, ctx) {
  if (!effect?.type) return;

  switch (effect.type) {
    case "damage":
      return dealDamage(effect, ctx);

    case "trueDamage":
      return dealDamage({ ...effect, damageType: "true" }, ctx);

    case "heal":
      return applyHeal(effect, ctx);

    case "buff":
      return applyBuff(effect, ctx);

    case "debuff":
      return applyDebuff(effect, ctx);

    case "status":
      return applyStatus(effect, ctx);

    case "enemyDebuff":
      return applyEnemyDebuff(effect, ctx);

    case "applyDebuff":
      return applyDebuff(effect.debuff ?? effect, ctx);

    case "restoreRage":
      return restoreRage(effect, ctx);

    case "reduceRage":
      return reduceRage(effect, ctx);

    case "grantSoulArmor":
      return grantSoulArmor(effect, ctx);

    case "shield":
      return applyShield(effect, ctx);

    case "combatStartResourceGain":
      return applyCombatStartResourceGain(effect, ctx);

    case "combatStartSoulArmorGain":
      return applyCombatStartSoulArmorGain(effect, ctx);

    case "fixedDamageBonusFromCritRate":
      return applyFixedDamageBonusFromCritRate(effect, ctx);

    case "ultimateFixedDamageBonus":
      return applyUltimateFixedDamageBonus(effect, ctx);

    case "setHp":
      return applySetHp(effect, ctx);

    case "enterState":
      return enterState(effect, ctx);

    default:
      pushLog(ctx.battleState, {
        kind: "effect_unhandled",
        effectType: effect.type,
        source: ctx.source?.id ?? null,
        target: ctx.target?.id ?? null
      });
      return;
  }
}

module.exports = {
  applyEffect,
  dealBasicAttackDamage
};
