const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function handleManageGuide(message) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📚 Guide Management")
    .setDescription("Choose an action below.");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("manage_addguide")
      .setLabel("Add Guide")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("manage_editguide")
      .setLabel("Edit Guide")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("manage_deleteguide")
      .setLabel("Delete Guide")
      .setStyle(ButtonStyle.Danger)
  );

  return message.reply({
    embeds: [embed],
    components: [row]
  });
}

module.exports = { handleManageGuide };
