const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const {
  getGuides
} = require("../utils/guideUtils");

const {
  formatFileLabel
} = require("../utils/formatUtils");

async function handleGuide(message) {
  const guides = getGuides();
  const categories = Object.keys(guides);

  if (categories.length === 0) {
    return message.reply("No guide categories found.");
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

  return message.reply({
    embeds: [embed],
    components: [row]
  });
}

module.exports = { handleGuide };
