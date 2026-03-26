const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  getGuides
} = require("../utils/guideUtils");

const {
  guideViewSessions
} = require("../sessions/guideSessions");

async function handleGuideMenu(interaction) {
  const category = interaction.customId.replace("guide_menu_", "");
  const guideName = interaction.values[0];

  const guides = getGuides();
  const guide = guides[category]?.[guideName];

  if (!guide) {
    return interaction.reply({
      content: "Guide not found.",
      ephemeral: true
    });
  }

  guideViewSessions.set(interaction.user.id, {
    category,
    guideName
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("guide_delivery_ios")
      .setLabel("iOS")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("guide_delivery_chat")
      .setLabel("Android/PC")
      .setStyle(ButtonStyle.Success)
  );

  return interaction.reply({
    content: `How do you want to view **${guideName}**?`,
    components: [row],
    ephemeral: true
  });
}

module.exports = { handleGuideMenu };
