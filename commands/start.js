const {
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

async function handleStart(message) {
  const banner = new AttachmentBuilder("./images/help.PNG", { name: "help.png" });
  const logo = new AttachmentBuilder("./images/logo.PNG", { name: "logo.png" });

  const embed = new EmbedBuilder()
    .setColor(0xFF2D95)
    .setTitle("📘 Command List")
    .setDescription("Here are the available user commands:")
    .addFields(
      { name: "guide", value: "Open the Guide Hub and browse guides by category." },
      { name: "tierlist", value: "Open the Tier List menu." },
      { name: "heroes", value: "Show the list of available heroes." },
      {
        name: "select hero",
        value: "Use a hero name as a command to open a specific hero guide.\nExample: `rimuru`"
      }
    )
    .setThumbnail("attachment://logo.png")
    .setImage("attachment://help.png")
    .setFooter({ text: "Hero-Dex Start Menu" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("start_guide")
      .setLabel("Guide")
      .setEmoji("📚")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("start_tierlist")
      .setLabel("Tierlist")
      .setEmoji("🧾")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("start_heroes")
      .setLabel("Heroes")
      .setEmoji("🧍")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("start_select_hero")
      .setLabel("Select Hero")
      .setEmoji("🎯")
      .setStyle(ButtonStyle.Danger)
  );

  return message.reply({
    embeds: [embed],
    components: [row],
    files: [banner, logo]
  });
}

module.exports = { handleStart };
