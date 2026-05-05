const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { getGuides } = require("../utils/guideUtils");
const { formatFileLabel } = require("../utils/formatUtils");

module.exports = async (interaction) => {
  const guides = getGuides();

  // CATEGORY SELECT
  if (interaction.isStringSelectMenu() && interaction.customId === "guide_category_select") {
    const category = interaction.values[0];
    const list = guides[category];

    if (!list || list.length === 0) {
      return interaction.reply({
        content: "No guides found.",
        ephemeral: true
      });
    }

    const options = list.map(g => ({
      label: formatFileLabel(g.name ?? g.file).slice(0, 100),
      value: g.file
    }));

    const guideRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`guide_select_${category}`)
        .setPlaceholder("Select a guide")
        .addOptions(options.slice(0, 25))
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("guide_back")
        .setLabel("Back")
        .setEmoji("🔙")
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("📚 Guide Hub")
      .setDescription(`Category: **${formatFileLabel(category)}**\nSelect a guide.`);

    return interaction.update({
      embeds: [embed],
      components: [guideRow, backRow]
    });
  }

  // BACK BUTTON
  if (interaction.isButton() && interaction.customId === "guide_back") {
    const categories = Object.keys(guides);

    const options = categories.map(category => ({
      label: formatFileLabel(category).slice(0, 100),
      value: category
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("guide_category_select")
        .setPlaceholder("Choose a category")
        .addOptions(options.slice(0, 25))
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("📚 Guide Hub")
      .setDescription("Choose a category.");

    return interaction.update({
      embeds: [embed],
      components: [row]
    });
  }
};