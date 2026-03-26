const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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

  const buttons = categories.slice(0, 5).map(category =>
    new ButtonBuilder()
      .setCustomId(`guide_category_${category}`)
      .setLabel(formatFileLabel(category))
      .setStyle(ButtonStyle.Primary)
  );

  const row = new ActionRowBuilder().addComponents(buttons);

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
