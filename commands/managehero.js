const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

async function handleManageHero(message) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("Hero Management")
    .setDescription("Choose an action below.");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("manage_addhero")
      .setLabel("Add Hero")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("manage_edithero")
      .setLabel("Edit Hero")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("manage_deletehero")
      .setLabel("Delete Hero")
      .setStyle(ButtonStyle.Danger)
  );

  return message.reply({
    embeds: [embed],
    components: [row]
  });
}

module.exports = {
  handleManageHero
};
