const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function handleManageGuide(message) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📚 Guide Management")
    .setDescription("Choose an action below.");

  const row1 = new ActionRowBuilder().addComponents(
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
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("manage_renamecategory")
      .setLabel("Rename Category")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("manage_regenpdf")
      .setLabel("Regenerate PDFs")
      .setStyle(ButtonStyle.Secondary)
  );

  return message.reply({
    embeds: [embed],
    components: [row1, row2]
  });
}

module.exports = { handleManageGuide };
