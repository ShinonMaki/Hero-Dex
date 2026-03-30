const compareData = require("../data/compareData.json");

function getHeroKey(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "");
}

function getHeroData(input) {
  const normalized = getHeroKey(input);

  const direct = compareData[normalized];
  if (direct) return { key: normalized, data: direct };

  const entries = Object.entries(compareData);
  const partial = entries.find(([key, value]) => {
    const compactName = value.name.toLowerCase().replace(/\s+/g, "");
    return key.includes(normalized) || compactName.includes(normalized);
  });

  if (!partial) return null;

  return {
    key: partial[0],
    data: partial[1]
  };
}

function compareNumericBlock(blockA, blockB) {
  let scoreA = 0;
  let scoreB = 0;

  for (const key of Object.keys(blockA)) {
    if (blockA[key] > blockB[key]) scoreA++;
    else if (blockB[key] > blockA[key]) scoreB++;
  }

  return { scoreA, scoreB };
}

function matchupBonus(heroA, heroB) {
  let bonusA = 0;
  let bonusB = 0;

  const aFavored = heroA.matchupNotes?.favoredAgainst || [];
  const aStruggles = heroA.matchupNotes?.strugglesAgainst || [];
  const bFavored = heroB.matchupNotes?.favoredAgainst || [];
  const bStruggles = heroB.matchupNotes?.strugglesAgainst || [];

  const heroBText = [
    heroB.heroType,
    ...(heroB.roles || []),
    ...(heroB.tags || []),
    heroB.summary
  ].join(" ").toLowerCase();

  const heroAText = [
    heroA.heroType,
    ...(heroA.roles || []),
    ...(heroA.tags || []),
    heroA.summary
  ].join(" ").toLowerCase();

  for (const term of aFavored) {
    if (heroBText.includes(term.toLowerCase())) bonusA += 2;
  }

  for (const term of aStruggles) {
    if (heroBText.includes(term.toLowerCase())) bonusB += 2;
  }

  for (const term of bFavored) {
    if (heroAText.includes(term.toLowerCase())) bonusB += 2;
  }

  for (const term of bStruggles) {
    if (heroAText.includes(term.toLowerCase())) bonusA += 2;
  }

  return { bonusA, bonusB };
}

function phaseWinner(heroA, heroB, phase) {
  const a = heroA.fightPhases?.[phase] ?? 0;
  const b = heroB.fightPhases?.[phase] ?? 0;

  if (a > b) return heroA.name;
  if (b > a) return heroB.name;
  return "Even";
}

function overallWinner(heroA, heroB) {
  const mainA = compareNumericBlock(heroA.profile, heroB.profile);
  const phaseA = compareNumericBlock(heroA.fightPhases, heroB.fightPhases);
  const matchup = matchupBonus(heroA, heroB);

  const totalA = mainA.scoreA + phaseA.scoreA + matchup.bonusA;
  const totalB = mainA.scoreB + phaseA.scoreB + matchup.bonusB;

  if (totalA > totalB) return heroA.name;
  if (totalB > totalA) return heroB.name;
  return "Even";
}

function compareHeroes(inputA, inputB) {
  const heroAResult = getHeroData(inputA);
  const heroBResult = getHeroData(inputB);

  if (!heroAResult || !heroBResult) {
    return {
      ok: false,
      reason: "One or both heroes were not found in compareData.json."
    };
  }

  const heroA = heroAResult.data;
  const heroB = heroBResult.data;

  const profileCompare = compareNumericBlock(heroA.profile, heroB.profile);
  const matchup = matchupBonus(heroA, heroB);

  const result = {
    ok: true,
    heroA,
    heroB,
    sections: {
      damage: compareOne(heroA.name, heroB.name, heroA.profile.damage, heroB.profile.damage),
      survivability: compareOne(heroA.name, heroB.name, heroA.profile.survivability, heroB.profile.survivability),
      utility: compareOne(heroA.name, heroB.name, heroA.profile.utility, heroB.profile.utility),
      control: compareOne(heroA.name, heroB.name, heroA.profile.control, heroB.profile.control),
      scaling: compareOne(heroA.name, heroB.name, heroA.profile.scaling, heroB.profile.scaling)
    },
    phases: {
      early: phaseWinner(heroA, heroB, "early"),
      mid: phaseWinner(heroA, heroB, "mid"),
      late: phaseWinner(heroA, heroB, "late")
    },
    matchup,
    winner: overallWinner(heroA, heroB),
    scoreLine: {
      heroA: profileCompare.scoreA + matchup.bonusA,
      heroB: profileCompare.scoreB + matchup.bonusB
    }
  };

  return result;
}

function compareOne(nameA, nameB, a, b) {
  if (a > b) return nameA;
  if (b > a) return nameB;
  return "Even";
}

module.exports = {
  compareHeroes
};
