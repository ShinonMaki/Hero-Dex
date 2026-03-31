// compare/compareEffects.js

const { pushLog } = require("./compareState");

/**
 * =========================
 * HP / SOUL ARMOR HANDLING
 * =========================
 */

function applyHpLoss(target, damage, battleState) {
  let remaining = damage;

  // 1. Consuma Soul Armor
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

  // 2. Danno su HP
  if (remaining > 0) {
    target.current.hp = Math.max(0, target.current.hp - remaining);

    pushLog(battleState, {
      kind: "hp_loss",
      target: target.id,
      damage: remaining,
      hpLeft: target.current.hp
    });

    if (target.current.hp <= 0) {
      target.alive = false;

      pushLog(battleState, {
        kind: "death",
        target: target.id
      });
    }
  }
}

/**
 * =========================
 * DAMAGE
 * =========================
 */

function dealDamage(effect, ctx) {
  const { source, target, battleState } = ctx;

  let damage = 0;

  // base formula
  if (effect.value) {
    damage = source.computedStats.atk * effect.value;
  }

  // scaling override (se vuoi usarlo in futuro)
  if (effect.scaling === "hp") {
    damage = source.computedStats.hp * effect.value;
  }

  // TYPE
  if (effect.damageType === "true") {
    damage *= (1 + source.computedStats.fixedDmgBonus);
    damage *= (1 - target.computedStats.fixedDmgRes);
  } else {
    damage *= (1 + source.computedStats.dmgBonus + source.computedStats.finalDamageBonus);
    damage *= (1 - target.computedStats.dmgReduction);
  }

  pushLog(battleState, {
    kind: "damage",
    source: source.id,
    target: target.id,
    amount: damage,
    type: effect.damageType ?? "normal"
  });

  applyHpLoss(target, damage, battleState);
}

/**
 * =========================
 * HEAL
 * =========================
 */

function applyHeal(effect, ctx) {
  const { source, target, battleState } = ctx;

  let heal = 0;

  if (effect.value) {
    heal = source.computedStats.atk * effect.value;
  }

  heal *= (1 + source.computedStats.healEffect);

  target.current.hp = Math.min(
    target.computedStats.hp,
    target.current.hp + heal
  );

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
 * BUFF / DEBUFF
 * =========================
 */

function applyBuff(effect, ctx) {
  const { target, battleState } = ctx;

  const buff = {
    id: effect.id,
    type: effect.type,
    value: effect.value,
    duration: effect.duration ?? null,
    remaining: effect.duration ?? null,
    dispellable: effect.dispellable ?? true
  };

  target.buffs.push(buff);

  pushLog(battleState, {
    kind: "buff_applied",
    target: target.id,
    buffId: buff.id
  });
}

function applyDebuff(effect, ctx) {
  const { target, battleState } = ctx;

  const debuff = {
    id: effect.id,
    type: effect.type,
    value: effect.value,
    duration: effect.duration ?? null,
    remaining: effect.duration ?? null,
    dispellable: effect.dispellable ?? true
  };

  target.debuffs.push(debuff);

  pushLog(battleState, {
    kind: "debuff_applied",
    target: target.id,
    debuffId: debuff.id
  });
}

/**
 * =========================
 * RAGE
 * =========================
 */

function restoreRage(effect, ctx) {
  const { target, battleState } = ctx;

  target.current.rage = Math.min(
    target.computedStats.rageLimit,
    target.current.rage + effect.value
  );

  pushLog(battleState, {
    kind: "rage_gain",
    target: target.id,
    amount: effect.value,
    rage: target.current.rage
  });
}

function reduceRage(effect, ctx) {
  const { target, battleState } = ctx;

  target.current.rage = Math.max(0, target.current.rage - effect.value);

  pushLog(battleState, {
    kind: "rage_loss",
    target: target.id,
    amount: effect.value,
    rage: target.current.rage
  });
}

/**
 * =========================
 * SOUL ARMOR
 * =========================
 */

function grantSoulArmor(effect, ctx) {
  const { target, battleState } = ctx;

  target.current.soulArmor = Math.min(
    target.current.maxSoulArmor,
    target.current.soulArmor + effect.value
  );

  pushLog(battleState, {
    kind: "soul_armor_gain",
    target: target.id,
    amount: effect.value,
    soulArmor: target.current.soulArmor
  });
}

/**
 * =========================
 * MAIN APPLY
 * =========================
 */

function applyEffect(effect, ctx) {
  switch (effect.type) {
    case "damage":
      return dealDamage(effect, ctx);

    case "trueDamage":
      return dealDamage({ ...effect, damageType: "true" }, ctx);

    case "heal":
      return applyHeal(effect, ctx);

    case "buff":
      return applyBuff(effect, ctx);

    case "applyDebuff":
      return applyDebuff(effect, ctx);

    case "restoreRage":
      return restoreRage(effect, ctx);

    case "reduceRage":
      return reduceRage(effect, ctx);

    case "grantSoulArmor":
      return grantSoulArmor(effect, ctx);

    default:
      return;
  }
}

module.exports = {
  applyEffect
};
