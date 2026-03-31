const compareHeroes = require("./compareHeroes.json");
const compareRunes = require("./compareRunes.json");
const compareNoblePhantasms = require("./compareNoblePhantasms.json");

const { runBattle } = require("./compareEngine");

// scegli due eroi (usa quelli che esistono nei tuoi json)
const heroAKey = "rimuru";
const heroBKey = "rimuru";

const heroA = compareHeroes[heroAKey];
const heroB = compareHeroes[heroBKey];

// controllo sicurezza
if (!heroA || !heroB) {
  console.error("❌ Hero non trovato nei JSON");
  process.exit(1);
}

// setup battle
const result = runBattle(
  heroAKey,
  heroA,
  heroBKey,
  heroB,
  {
    sideA: {
      runeSetData: compareRunes?.mage_divineatk ?? null,
      noblePhantasmData: compareNoblePhantasms?.crimson_lotus_saintress ?? null
    },
    sideB: {
      runeSetData: compareRunes?.mage_divinehp ?? null,
      noblePhantasmData: compareNoblePhantasms?.primeval_flame ?? null
    },
    verboseLog: true,
    maxTime: 5,
    tickSize: 0.5
  }
);

// output base
console.log("\n=== RESULT ===");
console.log("WINNER:", result.winner);
console.log("DURATION:", result.durationSec);
console.log("HP A:", result.fighters.a.current.hp);
console.log("HP B:", result.fighters.b.current.hp);

// stampa log breve
console.log("\n=== LOG SAMPLE ===");
result.log.slice(0, 20).forEach((entry, i) => {
  console.log(i, entry);
});
