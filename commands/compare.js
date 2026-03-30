const {
  EmbedBuilder
} = require("discord.js");

const {
  compareHeroes
} = require("../utils/compareEngine");

async function handleCompare(message) {
  const raw = message.content.slice(1).trim();
  const body = raw.replace(/^compare\s+/i, "").trim();

  if (!body) {
    return message.reply("Usage: `.compare hero1 vs hero2`");
  }

  const parts = body.split(/\s+vs\s+/i);

  if (parts.length !== 2) {
    return message.reply("Usage: `.compare hero1 vs hero2`");
  }

  const hero1 = parts[0].trim();
  const hero2 = parts[1].trim();

  if (!hero1 || !hero2) {
    return message.reply("Usage: `.compare hero1 vs hero2`");
  }

  const result = compareHeroes(hero1, hero2);

  if (!result.ok) {
    return message.reply(result.reason);
  }

  const {
    heroA,
    heroB,
    sections,
    phases,
    matchup,
    winner,
    scoreLine
  } = result;

  const verdictText = buildVerdictText(heroA, heroB, sections, phases, matchup, winner);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`⚔️ ${heroA.name} vs ${heroB.name}`)
    .addFields(
      {
        name: "Role Comparison",
        value:
          `**${heroA.name}** → ${heroA.roles.join(", ")}\n` +
          `**${heroB.name}** → ${heroB.roles.join(", ")}`
      },
      {
        name: "Strength Profile",
        value:
          `**Damage:** ${sections.damage}\n` +
          `**Survivability:** ${sections.survivability}\n` +
          `**Utility:** ${sections.utility}\n` +
          `**Control:** ${sections.control}\n` +
          `**Scaling:** ${sections.scaling}`,
        inline: false
      },
      {
        name: "Fight Timing",
        value:
          `**Early:** ${phases.early}\n` +
          `**Mid:** ${phases.mid}\n` +
          `**Late:** ${phases.late}`,
        inline: true
      },
      {
        name: "Matchup Pressure",
        value:
          `**${heroA.name}:** +${matchup.bonusA}\n` +
          `**${heroB.name}:** +${matchup.bonusB}`,
        inline: true
      },
      {
        name: "Score Line",
        value:
          `**${heroA.name}:** ${scoreLine.heroA}\n` +
          `**${heroB.name}:** ${scoreLine.heroB}`,
        inline: true
      },
      {
        name: "Verdict",
        value: verdictText
      }
    );

  return message.reply({ embeds: [embed] });
}

function buildVerdictText(heroA, heroB, sections, phases, matchup, winner) {
  const lines = [];

  if (phases.early !== "Even") {
    lines.push(`${phases.early} has the stronger early-fight profile.`);
  }

  if (phases.late !== "Even") {
    lines.push(`${phases.late} looks stronger in prolonged fights.`);
  }

  if (sections.utility !== "Even") {
    lines.push(`${sections.utility} brings more overall team value through utility.`);
  }

  if (sections.survivability !== "Even") {
    lines.push(`${sections.survivability} is harder to break through defensively.`);
  }

  if (matchup.bonusA > matchup.bonusB) {
    lines.push(`${heroA.name} has a more favorable natural matchup profile here.`);
  } else if (matchup.bonusB > matchup.bonusA) {
    lines.push(`${heroB.name} has a more favorable natural matchup profile here.`);
  }

  if (winner === "Even") {
    lines.push("Overall, this matchup looks relatively even on paper.");
  } else {
    lines.push(`**Final Winner: ${winner}**`);
  }

  return lines.join("\n");
}

module.exports = { handleCompare };
