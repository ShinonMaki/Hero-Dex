const { StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const fs = require("fs");

const guides = require("../guides.json");

async function handleGuideCategoryButtons(interaction) {
  const category = interaction.customId.replace("guide_category_", "");

  const categoryData = guides[category];
  if (!categoryData) {
    return interaction.reply({
      content: "Category not found.",
      ephemeral: true
    });
  }

  const options = Object.keys(categoryData).map((guideName) => ({
    label: guideName,
    value: guideName
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`guide_menu_${category}`)
    .setPlaceholder("Select a guide")
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);

  await interaction.reply({
    content: `Category: ${category}`,
    components: [row],
    ephemeral: true
  });
}

module.exports = { handleGuideCategoryButtons };
