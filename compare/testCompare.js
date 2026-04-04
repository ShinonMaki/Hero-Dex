const compareHeroes = require("./compareHeroes.json");
const compareRunes = require("./compareRunes.json");
const compareNoblePhantasms = require("./compareNoblePhantasms.json");

const { runBattle } = require("./compareEngine");

// scegli due eroi
const heroAKey = "rimuru";
const heroBKey = "rimuru";

const heroA = compareHeroes[heroAKey];
const heroB = compareHeroes[heroBKey];

// controllo sicurezza
if (!heroA || !heroB) {
  console.error("❌ Hero non trovato nei JSON");
  process.exit(1);
}

// setup moduli
const sideA = {
  runeSetData: compareRunes?.mage_divineatk ?? null,
  noblePhantasmData: compareNoblePhantasms?.crimson_lotus_saintress ?? null
};

const sideB = {
  runeSetData: compareRunes?.mage_divinehp ?? null,
  noblePhantasmData: compareNoblePhantasms?.primeval_flame ?? null
};

// debug moduli caricati
console.log("\n=== MODULE DEBUG ===");
console.log("Hero A:", heroAKey);
console.log("Rune A:", sideA.runeSetData?.id ?? null);
console.log("Noble A:", sideA.noblePhantasmData?.id ?? null);

console.log("Hero B:", heroBKey);
console.log("Rune B:", sideB.runeSetData?.id ?? null);
console.log("Noble B:", sideB.noblePhantasmData?.id ?? null);

// setup battle
const result = runBattle(
  heroAKey,
  heroA,
  heroBKey,
  heroB,
  {
    sideA,
    sideB,
    verboseLog: true,
    maxTime: 30,
    tickSize: 0.5
  }
);

// output base
console.log("\n=== RESULT ===");
console.log("WINNER:", result.winner);
console.log("DURATION:", result.durationSec);
console.log("HP A:", result.fighters.a.current.hp);
console.log("HP B:", result.fighters.b.current.hp);
console.log("SOUL ARMOR A:", result.fighters.a.current.soulArmor);
console.log("SOUL ARMOR B:", result.fighters.b.current.soulArmor);
console.log("RAGE A:", result.fighters.a.current.rage);
console.log("RAGE B:", result.fighters.b.current.rage);

// debug fighter essenziale
console.log("\n=== FIGHTER SUMMARY ===");
console.log("Fighter A Noble:", result.fighters.a.noblePhantasm?.id ?? null);
console.log("Fighter B Noble:", result.fighters.b.noblePhantasm?.id ?? null);
console.log("A Technique State:", result.fighters.a.techniqueState ?? null);
console.log("B Technique State:", result.fighters.b.techniqueState ?? null);

// filtri utili
const importantKinds = new Set([
  "basic_attack_started",
  "technique_started",
  "technique_finished",
  "damage",
  "soul_armor_absorb",
  "hp_loss",
  "heal",
  "fatal_recovery_triggered",
  "death",
  "rage_gain",
  "rage_loss",
  "effect_triggered",
  "effect_skipped_condition",
  "effect_skipped_chance",
  "effect_skipped_cooldown",
  "technique_cycle_count"
]);

const importantLog = result.log.filter(entry => importantKinds.has(entry.kind));

console.log("\n=== IMPORTANT COMBAT LOG ===");
importantLog.slice(0, 120).forEach((entry, i) => {
  console.log(i, entry);
});

// sezione damage + soul armor + hp loss
const damageFlow = result.log.filter(entry =>
  entry.kind === "damage" ||
  entry.kind === "soul_armor_absorb" ||
  entry.kind === "hp_loss" ||
  entry.kind === "heal"
);

console.log("\n=== DAMAGE / SOUL ARMOR / HP / HEAL ===");
if (damageFlow.length === 0) {
  console.log("Nessun log di danno trovato.");
} else {
  damageFlow.slice(0, 120).forEach((entry, i) => {
    console.log(i, entry);
  });
}

// solo technique
const techniqueLog = result.log.filter(entry =>
  entry.kind === "technique_started" ||
  entry.kind === "technique_finished" ||
  entry.kind === "technique_cycle_count"
);

console.log("\n=== TECHNIQUE LOG ===");
if (techniqueLog.length === 0) {
  console.log("Nessun log technique trovato.");
} else {
  techniqueLog.slice(0, 80).forEach((entry, i) => {
    console.log(i, entry);
  });
}

// solo noble phantasm triggerate
const nobleTriggered = result.log.filter(entry =>
  entry.kind === "effect_triggered" &&
  entry.ownerType === "noblePhantasm"
);

console.log("\n=== NOBLE PHANTASM TRIGGERS ===");
if (nobleTriggered.length === 0) {
  console.log("Nessun trigger di Noble Phantasm trovato.");
} else {
  nobleTriggered.slice(0, 80).forEach((entry, i) => {
    console.log(i, entry);
  });
}

// conteggio effetti triggerati
const effectCountMap = {};
for (const entry of result.log) {
  if (entry.kind !== "effect_triggered") continue;

  const key = `${entry.ownerType}:${entry.ownerId}:${entry.effectName ?? entry.effectType ?? "unknown"}`;
  effectCountMap[key] = (effectCountMap[key] ?? 0) + 1;
}

console.log("\n=== EFFECT TRIGGER COUNTS ===");
const sortedEffectCounts = Object.entries(effectCountMap)
  .sort((a, b) => b[1] - a[1]);

if (sortedEffectCounts.length === 0) {
  console.log("Nessun effect_triggered trovato.");
} else {
  sortedEffectCounts.forEach(([key, count]) => {
    console.log(`${count}x  ${key}`);
  });
}