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
  // GUIDE HUB category selection via select menu
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

    const options = Object.keys(categoryData).map((guideName) => ({
      label: guideName.slice(0, 100),
      value: guideName
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

module.exports = { handleGuideCategoryButtons };
