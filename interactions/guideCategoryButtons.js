const {
  getGuides
} = require("../utils/guideUtils");

const {
  formatFileLabel
} = require("../utils/formatUtils");

const {
  StringSelectMenuBuilder,
  ActionRowBuilder
} = require("discord.js");

async function handleGuideCategoryButtons(interaction) {
  if (interaction.customId === "guide_category_select") {
    const category = interaction.values[0];
    const guides = getGuides();
    const categoryData = guides[category];

    if (!categoryData || Object.keys(categoryData).length === 0) {
      return interaction.reply({
        content: "No guides found in this category.",
        ephemeral: true
      });
    }

    const groupedGuides = groupGuideParts(Object.keys(categoryData));

    const options = Object.keys(groupedGuides).map((baseGuideName) => ({
      label: baseGuideName.slice(0, 100),
      value: baseGuideName
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`guide_menu_${category}`)
      .setPlaceholder("Select a guide")
      .addOptions(options.slice(0, 25));

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: `Category: ${formatFileLabel(category)}`,
      components: [row],
      ephemeral: true
    });
  }
}

function groupGuideParts(guideNames) {
  const grouped = {};

  for (const guideName of guideNames) {
    const baseName = getBaseGuideName(guideName);

    if (!grouped[baseName]) {
      grouped[baseName] = [];
    }

    grouped[baseName].push(guideName);
  }

  return grouped;
}

function getBaseGuideName(guideName) {
  return guideName.replace(/\s+pt\d+$/i, "").trim();
}

module.exports = { handleGuideCategoryButtons };
