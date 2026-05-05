const {
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

async function handleHelp(message) {
  const banner = new AttachmentBuilder("./images/help.PNG", { name: "help.png" });
  const logo = new AttachmentBuilder("./images/logo.PNG", { name: "logo.png" });

  const embed = new EmbedBuilder()
    .setColor(0xFF2D95)
    .setTitle("📘 Command List")
    .setDescription("Here are the available user commands:")
    .addFields(
      { name: ".guide", value: "Open the Guide Hub and browse guides by category." },
      { name: ".tierlist", value: "Open the Tier List menu." },
      { name: ".heroes", value: "Show the list of available heroes." },
      {
        name: ".name",
        value: "Use a hero name as a command to open a specific hero guide.\nExample: `.rimuru`"
      }
    )
    .setThumbnail("attachment://logo.png")
    .setImage("attachment://help.png")
    .setFooter({ text: "Hero-Dex Help Menu" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("help_guide")
      .setLabel("Guide")
      .setEmoji("📚")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("help_tierlist")
      .setLabel("Tierlist")
      .setEmoji("🧾")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("help_heroes")
      .setLabel("Heroes")
      .setEmoji("🧍")
      .setStyle(ButtonStyle.Success)
  );

  return message.reply({
    embeds: [embed],
    components: [row],
    files: [banner, logo]
  });
}

module.exports = { handleHelp };
