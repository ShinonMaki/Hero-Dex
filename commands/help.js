const { EmbedBuilder, AttachmentBuilder } = require("discord.js");

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
  .setThumbnail("attachment://logo.png") // 👈 LOGO QUI
  .setImage("attachment://help.png") // 👈 BANNER QUI
  .setFooter({ text: "Hero-Dex Help Menu" });

return message.reply({
  embeds: [embed],
  files: [banner, logo]
});
