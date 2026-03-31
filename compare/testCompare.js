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
    maxTime: 15,
    tickSize: 0.5
  }
);

// output base
console.log("\n=== RESULT ===");
console.log("WINNER:", result.winner);
console.log("DURATION:", result.durationSec);
console.log("HP A:", result.fighters.a.current.hp);
console.log("HP B:", result.fighters.b.current.hp);

// debug fighter build
console.log("\n=== FIGHTER DEBUG ===");
console.log("Fighter A Noble:", result.fighters.a.noblePhantasm?.id ?? null);
console.log("Fighter B Noble:", result.fighters.b.noblePhantasm?.id ?? null);

console.log("\nFighter A Computed Stats:");
console.log(result.fighters.a.computedStats);

console.log("\nFighter B Computed Stats:");
console.log(result.fighters.b.computedStats);

console.log("\nFighter A Stat Modifiers:");
console.log(result.fighters.a.statModifiers);

console.log("\nFighter B Stat Modifiers:");
console.log(result.fighters.b.statModifiers);

// stampa log breve
console.log("\n=== LOG SAMPLE ===");
result.log.slice(0, 30).forEach((entry, i) => {
  console.log(i, entry);
});

// filtra effect triggered
const triggeredEffects = result.log.filter(entry => entry.kind === "effect_triggered");

console.log("\n=== EFFECT TRIGGERED SAMPLE ===");
if (triggeredEffects.length === 0) {
  console.log("Nessun effect_triggered trovato.");
} else {
  triggeredEffects.slice(0, 20).forEach((entry, i) => {
    console.log(i, entry);
  });
}
