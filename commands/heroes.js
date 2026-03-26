const { heroesData } = require("../utils/fileUtils");
const { formatFileLabel } = require("../utils/formatUtils");

async function handleHeroes(message) {
  const types = {};

  Object.entries(heroesData).forEach(([heroName, data]) => {
    const heroType = data?.type;
    if (!heroType) return;

    if (!types[heroType]) {
      types[heroType] = [];
    }

    if (!types[heroType].includes(heroName)) {
      types[heroType].push(heroName);
    }
  });

  let reply = "**Hero List:**\n";

  Object.keys(types).sort().forEach(type => {
    reply += `\n__${formatFileLabel(type)}__:\n`;
    reply += types[type]
      .sort()
      .map(h => `- ${formatFileLabel(h)}`)
      .join("\n") + "\n";
  });

  return message.reply(reply || "No heroes found.");
}

module.exports = {
  handleHeroes
};
