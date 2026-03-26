const {
  guideAddSessions
} = require("../sessions/guideSessions");

const {
  addCategory,
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
  const userId = interaction.user.id;

  // ADD GUIDE FLOW category selection
  if (interaction.customId.startsWith("guide_add_category_")) {
    if (!guideAddSessions.has(userId)) {
      return interaction.reply({
        content: "No active guide creation session found.",
        ephemeral: true
      });
    }

    const session = guideAddSessions.get(userId);
    const selected = interaction.customId.replace("guide_add_category_", "");

    if (selected === "new") {
      session.step = 2;
      return interaction.reply({
        content: "Write the new category name.",
        ephemeral: true
      });
    }

    session.data.category = selected;
    session.step = 3;

    return interaction.reply({
      content: `Category selected: ${formatFileLabel(selected)}\nNow send the guide title.`,
      ephemeral: true
    });
  }

  // GUIDE HUB category selection
  if (interaction.customId.startsWith("guide_category_")) {
    const category = interaction.customId.replace("guide_category_", "");
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
