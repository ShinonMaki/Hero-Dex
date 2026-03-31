// compare/compareBuild.js

const { createFighterRuntime, deepClone } = require("./compareState");

/**
 * Crea il contenitore modificatori statici.
 * Qui accumuliamo flat e percent prima di calcolare le stats finali.
 */
function createStatModifiers() {
  return {
    atk: { flat: 0, percent: 0 },
    hp: { flat: 0, percent: 0 },
    def: { flat: 0, percent: 0 },

    critRate: 0,
    critDmg: 0,
    dmgBonus: 0,
    dmgReduction: 0,
    pDmgReduction: 0,
    mDmgReduction: 0,
    soulArmor: 0,
    hitRate: 0,
    dodge: 0,
    block: 0,
    blockPiercing: 0,
    haste: 0,
    rageLimit: 0,

    fixedDmgBonus: 0,
    fixedDmgRes: 0,
    directDmgBonus: 0,
    healEffect: 0,
    normalAttackDamage: 0,
    techniqueDamage: 0,
    ultimateDamage: 0,
    finalDamageBonus: 0,
    blockRate: 0,

    // special buckets
    noblePhantasmAtk: 0,
    noblePhantasmHp: 0
  };
}

function ensureStatModifiers(fighter) {
  if (!fighter.statModifiers) {
    fighter.statModifiers = createStatModifiers();
  }
}

/**
 * Helper generico per sommare bonus percentuali "semplici"
 */
function addSimpleStat(modifiers, statKey, value) {
  if (value == null) return;
  if (typeof modifiers[statKey] !== "number") {
    modifiers[statKey] = 0;
  }
  modifiers[statKey] += value;
}

/**
 * Applica i bonus statici dei talenti dell'eroe
 */
function applyTalentStats(fighter) {
  ensureStatModifiers(fighter);
  const modifiers = fighter.statModifiers;
  const talents = fighter.heroData.talents ?? {};

  for (const talentData of Object.values(talents)) {
    const stats = talentData.stats ?? {};

    if (stats.baseAtkBonus) modifiers.atk.percent += stats.baseAtkBonus;
    if (stats.baseHpBonus) modifiers.hp.percent += stats.baseHpBonus;
    if (stats.baseDefBonus) modifiers.def.percent += stats.baseDefBonus;

    if (stats.critRate) modifiers.critRate += stats.critRate;
    if (stats.critDmg) modifiers.critDmg += stats.critDmg;
    if (stats.dmgBonus) modifiers.dmgBonus += stats.dmgBonus;
    if (stats.blockRate) modifiers.blockRate += stats.blockRate;
  }
}

/**
 * Applica Rune statiche
 */
function applyRuneSet(fighter, runeSetData) {
  if (!runeSetData) return;

  ensureStatModifiers(fighter);
  const modifiers = fighter.statModifiers;

  const slots = runeSetData.slots ?? [];
  for (const slot of slots) {
    if (slot.atkFlat) modifiers.atk.flat += slot.atkFlat;
    if (slot.hpFlat) modifiers.hp.flat += slot.hpFlat;
    if (slot.defFlat) modifiers.def.flat += slot.defFlat;

    if (slot.atkBonus) modifiers.atk.percent += slot.atkBonus;
    if (slot.hpBonus) modifiers.hp.percent += slot.hpBonus;
    if (slot.defBonus) modifiers.def.percent += slot.defBonus;

    if (slot.critRate) modifiers.critRate += slot.critRate;
    if (slot.critDmg) modifiers.critDmg += slot.critDmg;
    if (slot.dmgBonus) modifiers.dmgBonus += slot.dmgBonus;
    if (slot.blockRate) modifiers.blockRate += slot.blockRate;
  }

  const setBonus = runeSetData.setBonus ?? {};
  if (setBonus.atkBonus) modifiers.atk.percent += setBonus.atkBonus;
  if (setBonus.hpBonus) modifiers.hp.percent += setBonus.hpBonus;
  if (setBonus.defBonus) modifiers.def.percent += setBonus.defBonus;
}

/**
 * Applica Noble Phantasm statica
 */
function applyNoblePhantasm(fighter, nobleData) {
  if (!nobleData) return;

  ensureStatModifiers(fighter);
  const modifiers = fighter.statModifiers;

  const stats = nobleData.stats ?? {};
  const bonus = nobleData.bonus ?? {};

  if (stats.atkFlat) modifiers.atk.flat += stats.atkFlat;
  if (stats.hpFlat) modifiers.hp.flat += stats.hpFlat;
  if (stats.defFlat) modifiers.def.flat += stats.defFlat;

  if (stats.atkBonus) modifiers.atk.percent += stats.atkBonus;
  if (stats.hpBonus) modifiers.hp.percent += stats.hpBonus;
  if (stats.defBonus) modifiers.def.percent += stats.defBonus;

  if (bonus.atkBonus) modifiers.atk.percent += bonus.atkBonus;
  if (bonus.hpBonus) modifiers.hp.percent += bonus.hpBonus;
  if (bonus.defBonus) modifiers.def.percent += bonus.defBonus;

  if (bonus.noblePhantasmAtk) modifiers.noblePhantasmAtk += bonus.noblePhantasmAtk;
  if (bonus.noblePhantasmHp) modifiers.noblePhantasmHp += bonus.noblePhantasmHp;

  if (bonus.critRate) modifiers.critRate += bonus.critRate;
  if (bonus.critDmg) modifiers.critDmg += bonus.critDmg;
  if (bonus.dmgBonus) modifiers.dmgBonus += bonus.dmgBonus;
  if (bonus.healEffect) modifiers.healEffect += bonus.healEffect;
  if (bonus.fixedDmgBonus) modifiers.fixedDmgBonus += bonus.fixedDmgBonus;
  if (bonus.fixedDmgRes) modifiers.fixedDmgRes += bonus.fixedDmgRes;
  if (bonus.directDmgBonus) modifiers.directDmgBonus += bonus.directDmgBonus;
  if (bonus.normalAttackDamage) modifiers.normalAttackDamage += bonus.normalAttackDamage;
  if (bonus.techniqueDamage) modifiers.techniqueDamage += bonus.techniqueDamage;
  if (bonus.ultimateDamage) modifiers.ultimateDamage += bonus.ultimateDamage;
  if (bonus.blockRate) modifiers.blockRate += bonus.blockRate;
}

/**
 * Applica eventuale equipment set fisso.
 * Per ora opzionale: lo lasciamo pronto.
 */
function applyEquipmentSet(fighter, equipmentSetData) {
  if (!equipmentSetData) return;

  ensureStatModifiers(fighter);
  const modifiers = fighter.statModifiers;

  const stats = equipmentSetData.stats ?? {};
  const bonus = equipmentSetData.bonus ?? {};

  if (stats.atkFlat) modifiers.atk.flat += stats.atkFlat;
  if (stats.hpFlat) modifiers.hp.flat += stats.hpFlat;
  if (stats.defFlat) modifiers.def.flat += stats.defFlat;

  if (stats.atkBonus) modifiers.atk.percent += stats.atkBonus;
  if (stats.hpBonus) modifiers.hp.percent += stats.hpBonus;
  if (stats.defBonus) modifiers.def.percent += stats.defBonus;

  if (bonus.atkBonus) modifiers.atk.percent += bonus.atkBonus;
  if (bonus.hpBonus) modifiers.hp.percent += bonus.hpBonus;
  if (bonus.defBonus) modifiers.def.percent += bonus.defBonus;
}

/**
 * Hook futuri: per ora vuoti ma pronti
 */
function applySoulJades(fighter, soulJadeDataList = []) {
  if (!Array.isArray(soulJadeDataList)) return;
  ensureStatModifiers(fighter);
  const modifiers = fighter.statModifiers;

  for (const jade of soulJadeDataList) {
    if (!jade) continue;

    const stats = jade.stats ?? {};
    if (stats.atkFlat) modifiers.atk.flat += stats.atkFlat;
    if (stats.hpFlat) modifiers.hp.flat += stats.hpFlat;
    if (stats.atkBonus) modifiers.atk.percent += stats.atkBonus;
    if (stats.hpBonus) modifiers.hp.percent += stats.hpBonus;

    if (stats.critRate) modifiers.critRate += stats.critRate;
    if (stats.critDmg) modifiers.critDmg += stats.critDmg;
    if (stats.dmgBonus) modifiers.dmgBonus += stats.dmgBonus;
    if (stats.healEffect) modifiers.healEffect += stats.healEffect;
  }
}

function applyClothesSet(fighter, clothesData) {
  if (!clothesData) return;
  ensureStatModifiers(fighter);
  const modifiers = fighter.statModifiers;

  const stats = clothesData.stats ?? {};
  const bonus = clothesData.bonus ?? {};

  if (stats.atkFlat) modifiers.atk.flat += stats.atkFlat;
  if (stats.hpFlat) modifiers.hp.flat += stats.hpFlat;
  if (stats.atkBonus) modifiers.atk.percent += stats.atkBonus;
  if (stats.hpBonus) modifiers.hp.percent += stats.hpBonus;

  if (bonus.atkBonus) modifiers.atk.percent += bonus.atkBonus;
  if (bonus.hpBonus) modifiers.hp.percent += bonus.hpBonus;
}

/**
 * Calcola le stats finali statiche.
 * Qui applichiamo l'ordine:
 * (base + flat) * (1 + percent)
 *
 * I bonus noblePhantasmAtk / noblePhantasmHp li sommiamo come moltiplicatori extra.
 */
function finalizeStats(fighter) {
  const base = fighter.baseStats;
  const mod = fighter.statModifiers;
  const out = fighter.computedStats;

  out.atk = (base.atk + mod.atk.flat) * (1 + mod.atk.percent + mod.noblePhantasmAtk);
  out.hp = (base.hp + mod.hp.flat) * (1 + mod.hp.percent + mod.noblePhantasmHp);
  out.def = (base.def + mod.def.flat) * (1 + mod.def.percent);

  out.critRate = (base.critRate ?? 0) + mod.critRate;
  out.critDmg = (base.critDmg ?? 0) + mod.critDmg;
  out.dmgBonus = (base.dmgBonus ?? 0) + mod.dmgBonus;
  out.dmgReduction = (base.dmgReduction ?? 0) + mod.dmgReduction;
  out.pDmgReduction = (base.pDmgReduction ?? 0) + mod.pDmgReduction;
  out.mDmgReduction = (base.mDmgReduction ?? 0) + mod.mDmgReduction;
  out.soulArmor = (base.soulArmor ?? 0) + mod.soulArmor;
  out.hitRate = (base.hitRate ?? 0) + mod.hitRate;
  out.dodge = (base.dodge ?? 0) + mod.dodge;
  out.block = (base.block ?? 0) + mod.block;
  out.blockPiercing = (base.blockPiercing ?? 0) + mod.blockPiercing;
  out.haste = (base.haste ?? 0) + mod.haste;
  out.rageLimit = (base.rageLimit ?? 1000) + mod.rageLimit;

  out.fixedDmgBonus = mod.fixedDmgBonus;
  out.fixedDmgRes = mod.fixedDmgRes;
  out.directDmgBonus = mod.directDmgBonus;
  out.healEffect = mod.healEffect;
  out.normalAttackDamage = mod.normalAttackDamage;
  out.techniqueDamage = mod.techniqueDamage;
  out.ultimateDamage = mod.ultimateDamage;
  out.finalDamageBonus = mod.finalDamageBonus;
  out.blockRate = mod.blockRate;
}

/**
 * Inizializza current values in base alle computed stats
 */
function initializeCurrentState(fighter) {
  fighter.current.hp = fighter.computedStats.hp;
  fighter.current.rage = 0;
  fighter.current.soulArmor = fighter.computedStats.soulArmor ?? 0;
  fighter.current.maxSoulArmor = fighter.computedStats.soulArmor ?? 0;

  fighter.snapshots.initialAtk = fighter.computedStats.atk;
  fighter.snapshots.maxRecordedAtk = fighter.computedStats.atk;
}

/**
 * Funzione principale.
 * modules = {
 *   runeSetData,
 *   noblePhantasmData,
 *   equipmentSetData,
 *   soulJadeDataList,
 *   clothesSetData
 * }
 */
function buildFighter(heroKey, heroData, loadout = {}, modules = {}) {
  const fighter = createFighterRuntime(heroKey, heroData, deepClone(loadout));
  fighter.statModifiers = createStatModifiers();

  // Salva i moduli sul fighter runtime
  fighter.equipmentSet = modules.equipmentSetData ?? null;
  fighter.runeSet = modules.runeSetData ?? null;
  fighter.noblePhantasm = modules.noblePhantasmData ?? null;
  fighter.soulJades = modules.soulJadeDataList ?? [];
  fighter.clothesSet = modules.clothesSetData ?? null;

  applyTalentStats(fighter);
  applyEquipmentSet(fighter, modules.equipmentSetData);
  applyRuneSet(fighter, modules.runeSetData);
  applyNoblePhantasm(fighter, modules.noblePhantasmData);
  applySoulJades(fighter, modules.soulJadeDataList ?? []);
  applyClothesSet(fighter, modules.clothesSetData);

  finalizeStats(fighter);
  initializeCurrentState(fighter);

  return fighter;
}

module.exports = {
  createStatModifiers,
  applyTalentStats,
  applyEquipmentSet,
  applyRuneSet,
  applyNoblePhantasm,
  applySoulJades,
  applyClothesSet,
  finalizeStats,
  initializeCurrentState,
  buildFighter
};
