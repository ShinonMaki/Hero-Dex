const { EmbedBuilder } = require("discord.js");

async function handleHelp(message) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📘 Command List")
    .setDescription("Here are the available user commands:")
    .addFields(
      {
        name: ".guide",
        value: "Open the Guide Hub and browse guides by category."
      },
      {
        name: ".tierlist",
        value: "Open the Tier List menu."
      },
      {
        name: ".heroes",
        value: "Show the list of available heroes."
      },
      {
        name: ".name",
        value: "Use a hero name as a command to open a specific hero guide.\nExample: `.rimuru`\nOnly works for heroes available in the bot."
      }
    )
    .setFooter({ text: "Hero-Dex Help Menu" });

  return message.reply({ embeds: [embed] });
}

module.exports = { handleHelp };