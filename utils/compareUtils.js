const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const PDF_FOLDER = path.join(__dirname, "..", "pdf");

const pdfTextCache = new Map();
const profileCache = new Map();

function getHeroNameFromFile(fileName) {
  const baseName = fileName.replace(/\.pdf$/i, "").toLowerCase();

  if (baseName.includes("_")) {
    return baseName.split("_").slice(1).join("_");
  }

  return baseName;
}

function findHeroPdfFile(heroName) {
  if (!fs.existsSync(PDF_FOLDER)) return null;

  const files = fs
    .readdirSync(PDF_FOLDER)
    .filter(file => file.toLowerCase().endsWith(".pdf"));

  const normalizedInput = normalizeHeroName(heroName);

  const exactMatch = files.find(file => {
    return getHeroNameFromFile(file) === normalizedInput;
  });

  if (exactMatch) return exactMatch;

  const partialMatches = files.filter(file => {
    const heroFromFile = getHeroNameFromFile(file);
    return heroFromFile.includes(normalizedInput) || normalizedInput.includes(heroFromFile);
  });

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  return null;
}

function normalizeHeroName(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

async function readPdfTextByFile(fileName) {
  const fullPath = path.join(PDF_FOLDER, fileName);

  if (pdfTextCache.has(fullPath)) {
    return pdfTextCache.get(fullPath);
  }

  const buffer = fs.readFileSync(fullPath);
  const data = await pdf(buffer);
  const text = (data.text || "").replace(/\r/g, "");

  pdfTextCache.set(fullPath, text);
  return text;
}

async function getHeroProfile(heroName) {
  const fileName = findHeroPdfFile(heroName);

  if (!fileName) {
    return null;
  }

  if (profileCache.has(fileName)) {
    return profileCache.get(fileName);
  }

  const text = await readPdfTextByFile(fileName);
  const profile = buildHeroProfile(text, fileName);

  profileCache.set(fileName, profile);
  return profile;
}

function buildHeroProfile(text, fileName) {
  const lowered = text.toLowerCase();

  const name = extractName(text) || prettifyHeroName(getHeroNameFromFile(fileName));
  const heroType = extractHeroType(text) || "Unknown";
  const elemental = extractElement(text) || "Unknown";

  const scores = {
    damage: 0,
    burst: 0,
    sustain: 0,
    survivability: 0,
    utility: 0,
    cc: 0,
    healing: 0,
    support: 0,
    tankiness: 0
  };

  // Core keywords
  addScoreIf(lowered, scores, "damage", [
    ["damage", 2],
    ["bonus dmg", 2],
    ["output dmg", 3],
    ["main dmg", 2],
    ["execute", 2],
    ["fixed dmg", 3],
    ["ultimate dmg", 2],
    ["technique", 1]
  ]);

  addScoreIf(lowered, scores, "burst", [
    ["burst", 4],
    ["nuke", 4],
    ["hyper carry", 3],
    ["execute", 3],
    ["lowest hp", 2],
    ["fast", 1],
    ["full crit", 2]
  ]);

  addScoreIf(lowered, scores, "sustain", [
    ["sustain", 4],
    ["healing", 3],
    ["heal", 3],
    ["max hp", 2],
    ["damage reduction", 3],
    ["survivalbility", 3],
    ["survivability", 3],
    ["full tank", 2],
    ["out heal", 3],
    ["out sustain", 3]
  ]);

  addScoreIf(lowered, scores, "survivability", [
    ["shield", 2],
    ["heal", 2],
    ["invincible", 4],
    ["revive", 4],
    ["damage reduction", 3],
    ["block rate", 3],
    ["dodge", 2],
    ["max hp", 2],
    ["tank", 2]
  ]);

  addScoreIf(lowered, scores, "utility", [
    ["cleanse", 4],
    ["crowd control", 3],
    ["support", 3],
    ["buff", 2],
    ["debuff", 2],
    ["rage reduction", 3],
    ["damage share", 3],
    ["immunity", 2],
    ["soul armor", 2],
    ["fixed dmg res", 2]
  ]);

  addScoreIf(lowered, scores, "cc", [
    ["stun", 5],
    ["knock-up", 3],
    ["knock up", 3],
    ["slow", 3],
    ["silence", 3],
    ["crowd control", 3],
    ["interrupt", 2]
  ]);

  addScoreIf(lowered, scores, "healing", [
    ["heal", 5],
    ["healing", 5],
    ["out heal", 4],
    ["recovery", 2],
    ["hp restoration", 3]
  ]);

  addScoreIf(lowered, scores, "support", [
    ["support", 4],
    ["allies", 2],
    ["buff", 2],
    ["cleanse", 2],
    ["team", 2],
    ["highest atk ally", 2]
  ]);

  addScoreIf(lowered, scores, "tankiness", [
    ["full tank", 5],
    ["tank", 3],
    ["block rate", 4],
    ["damage reduction", 4],
    ["max hp", 3],
    ["invincible", 3],
    ["shield", 2],
    ["soul armor", 2]
  ]);

  // Normalize a bit
  for (const key of Object.keys(scores)) {
    scores[key] = Math.min(scores[key], 10);
  }

  const tags = inferTags(lowered, heroType, scores);
  const buildFocus = inferBuildFocus(lowered);
  const bestFightType = inferFightType(scores, tags);
  const notes = inferNotes(lowered);

  return {
    fileName,
    name,
    heroType,
    elemental,
    tags,
    buildFocus,
    bestFightType,
    notes,
    scores
  };
}

function addScoreIf(text, scores, stat, rules) {
  for (const [keyword, value] of rules) {
    if (text.includes(keyword)) {
      scores[stat] += value;
    }
  }
}

function extractName(text) {
  const match = text.match(/name:\s*([^\n]+)/i);
  return match ? cleanLine(match[1]) : null;
}

function extractHeroType(text) {
  const match = text.match(/hero type:\s*([^\n]+)/i) || text.match(/himo type:\s*([^\n]+)/i);
  return match ? cleanLine(match[1]) : null;
}

function extractElement(text) {
  const match = text.match(/elemental:\s*([^\n]+)/i);
  return match ? cleanLine(match[1]) : null;
}

function cleanLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function prettifyHeroName(name) {
  return String(name || "")
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferTags(text, heroType, scores) {
  const tags = [];

  if (/fixed dmg|fixed damage/i.test(text)) tags.push("fixed-damage");
  if (/hyper carry|carry/i.test(heroType) || scores.burst >= 7) tags.push("carry");
  if (/mage/i.test(heroType)) tags.push("mage");
  if (/tank/i.test(heroType) || scores.tankiness >= 7) tags.push("tank");
  if (/support/i.test(heroType) || scores.support >= 7) tags.push("support");
  if (scores.healing >= 6) tags.push("healer");
  if (scores.cc >= 6) tags.push("cc");
  if (scores.burst >= 7) tags.push("burst");
  if (scores.sustain >= 7) tags.push("sustain");
  if (/multi-hit|multi hit/i.test(text)) tags.push("multi-hit");
  if (/aoe|all enemies|full-screened|fullscreen/i.test(text)) tags.push("aoe");
  if (/cleanse/i.test(text)) tags.push("cleanse");
  if (/rage reduction/i.test(text)) tags.push("rage-control");
  if (/shield/i.test(text)) tags.push("shield");
  if (/invincible|revive/i.test(text)) tags.push("anti-burst");

  return [...new Set(tags)];
}

function inferBuildFocus(text) {
  const builds = [];

  if (/full crit|nuke|burst/i.test(text)) builds.push("burst");
  if (/full tank|tank build/i.test(text)) builds.push("tank");
  if (/pure healer|healer build/i.test(text)) builds.push("healer");
  if (/hybrid support|support/i.test(text)) builds.push("support");
  if (/off-tank|off tank/i.test(text)) builds.push("off-tank");

  return [...new Set(builds)];
}

function inferFightType(scores, tags) {
  if (scores.burst >= 7 && scores.sustain <= 5) return "short";
  if (scores.sustain >= 7 || tags.includes("tank") || tags.includes("healer")) return "long";
  return "mixed";
}

function inferNotes(text) {
  const notes = [];

  if (/cannot be interrupt|uninterruptable|cannot be cancelled/i.test(text)) {
    notes.push("Reliable skill execution");
  }

  if (/guarantee stunned|100% chance to apply \[stun\]/i.test(text)) {
    notes.push("Reliable hard crowd control");
  }

  if (/cleanse/i.test(text)) {
    notes.push("Can cleanse debuffs or control effects");
  }

  if (/revive|fatal dmg/i.test(text)) {
    notes.push("Has anti-death or comeback mechanic");
  }

  if (/damage share/i.test(text)) {
    notes.push("Can protect allies through damage sharing");
  }

  if (/fixed dmg/i.test(text)) {
    notes.push("Uses fixed damage as part of main threat profile");
  }

  return notes;
}

function compareProfiles(profile1, profile2) {
  const s1 = profile1.scores;
  const s2 = profile2.scores;

  const sections = {
    damage: compareStat(profile1.name, profile2.name, s1.damage + s1.burst, s2.damage + s2.burst),
    survivability: compareStat(profile1.name, profile2.name, s1.survivability + s1.tankiness, s2.survivability + s2.tankiness),
    utility: compareStat(profile1.name, profile2.name, s1.utility + s1.support, s2.utility + s2.support),
    crowdControl: compareStat(profile1.name, profile2.name, s1.cc, s2.cc),
    healing: compareStat(profile1.name, profile2.name, s1.healing, s2.healing)
  };

  const verdict = buildVerdict(profile1, profile2);

  return { sections, verdict };
}

function compareStat(name1, name2, value1, value2) {
  if (value1 > value2) return name1;
  if (value2 > value1) return name2;
  return "Even";
}

function buildVerdict(p1, p2) {
  const lines = [];

  if (p1.bestFightType === "short" && p2.bestFightType === "long") {
    lines.push(`${p1.name} has the edge in fast, aggressive fights.`);
    lines.push(`${p2.name} has the edge in longer, sustained battles.`);
  } else if (p2.bestFightType === "short" && p1.bestFightType === "long") {
    lines.push(`${p2.name} has the edge in fast, aggressive fights.`);
    lines.push(`${p1.name} has the edge in longer, sustained battles.`);
  }

  if (p1.scores.utility + p1.scores.support > p2.scores.utility + p2.scores.support + 2) {
    lines.push(`${p1.name} brings more team value through utility and support tools.`);
  } else if (p2.scores.utility + p2.scores.support > p1.scores.utility + p1.scores.support + 2) {
    lines.push(`${p2.name} brings more team value through utility and support tools.`);
  }

  if (p1.scores.damage + p1.scores.burst > p2.scores.damage + p2.scores.burst + 2) {
    lines.push(`${p1.name} is the more explosive damage threat.`);
  } else if (p2.scores.damage + p2.scores.burst > p1.scores.damage + p1.scores.burst + 2) {
    lines.push(`${p2.name} is the more explosive damage threat.`);
  }

  if (lines.length === 0) {
    lines.push("This matchup looks relatively balanced on paper.");
  }

  return lines;
}

function formatCompareResponse(profile1, profile2) {
  const comparison = compareProfiles(profile1, profile2);

  const lines = [];

  lines.push(`⚔️ __${profile1.name} vs ${profile2.name}__`);
  lines.push("");
  lines.push("**Role Comparison:**");
  lines.push(`- **${profile1.name}** → ${profile1.heroType}`);
  lines.push(`- **${profile2.name}** → ${profile2.heroType}`);
  lines.push("");
  lines.push("**Damage Output:**");
  lines.push(`- ${profile1.name}: ${describeDamage(profile1)}`);
  lines.push(`- ${profile2.name}: ${describeDamage(profile2)}`);
  lines.push(`→ **Advantage:** ${comparison.sections.damage}`);
  lines.push("");
  lines.push("**Survivability:**");
  lines.push(`- ${profile1.name}: ${describeSurvivability(profile1)}`);
  lines.push(`- ${profile2.name}: ${describeSurvivability(profile2)}`);
  lines.push(`→ **Advantage:** ${comparison.sections.survivability}`);
  lines.push("");
  lines.push("**Utility & Control:**");
  lines.push(`- ${profile1.name}: ${describeUtility(profile1)}`);
  lines.push(`- ${profile2.name}: ${describeUtility(profile2)}`);
  lines.push(`→ **Advantage:** ${comparison.sections.utility}`);
  lines.push("");
  lines.push("**Crowd Control:**");
  lines.push(`→ **Advantage:** ${comparison.sections.crowdControl}`);
  lines.push("");
  lines.push("**Healing / Sustain:**");
  lines.push(`→ **Advantage:** ${comparison.sections.healing}`);
  lines.push("");
  lines.push("**Final Verdict:**");
  for (const line of comparison.verdict) {
    lines.push(`- ${line}`);
  }
  lines.push("");
  lines.push("**Tags:**");
  lines.push(`- ${profile1.name}: ${profile1.tags.join(", ") || "None"}`);
  lines.push(`- ${profile2.name}: ${profile2.tags.join(", ") || "None"}`);

  return lines.join("\n");
}

function describeDamage(profile) {
  const parts = [];

  if (profile.tags.includes("burst")) parts.push("high burst potential");
  if (profile.tags.includes("fixed-damage")) parts.push("fixed damage threat");
  if (profile.tags.includes("aoe")) parts.push("AoE pressure");
  if (profile.tags.includes("multi-hit")) parts.push("multi-hit scaling");

  if (parts.length === 0) {
    parts.push("moderate damage profile");
  }

  return parts.join(", ");
}

function describeSurvivability(profile) {
  const parts = [];

  if (profile.tags.includes("tank")) parts.push("tank-oriented durability");
  if (profile.tags.includes("healer")) parts.push("self/team sustain");
  if (profile.tags.includes("shield")) parts.push("shield access");
  if (profile.tags.includes("anti-burst")) parts.push("anti-burst safety");

  if (parts.length === 0) {
    parts.push("limited defensive tools");
  }

  return parts.join(", ");
}

function describeUtility(profile) {
  const parts = [];

  if (profile.tags.includes("support")) parts.push("supportive utility");
  if (profile.tags.includes("cc")) parts.push("crowd control");
  if (profile.tags.includes("cleanse")) parts.push("cleanse");
  if (profile.tags.includes("rage-control")) parts.push("rage control");

  if (parts.length === 0) {
    parts.push("mostly damage-focused");
  }

  return parts.join(", ");
}

module.exports = {
  getHeroNameFromFile,
  findHeroPdfFile,
  getHeroProfile,
  formatCompareResponse
};
