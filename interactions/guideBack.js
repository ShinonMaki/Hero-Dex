const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const { getGuides } = require("../utils/guideUtils");
const { formatFileLabel } = require("../utils/formatUtils");

async function handleGuideBack(interaction) {
  const guides = getGuides();
  const categories = Object.keys(guides);

  if (categories.length === 0) {
    return interaction.reply({
      content: "No guide categories found.",
      ephemeral: true
    });
  }

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

module.exports = { handleGuideBack };