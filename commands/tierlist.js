const path = require("path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const { getTierlistFiles } = require("../utils/fileUtils");
const { formatFileLabel } = require("../utils/formatUtils");

async function handleTierlist(message) {
  const tierlistFiles = getTierlistFiles();

  if (tierlistFiles.length === 0) {
    return message.reply("No tierlists found.");
  }

  const tierlistNames = tierlistFiles.map(file =>
    formatFileLabel(path.parse(file).name)
  );

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📊 Tierlist Hub")
    .setDescription("Choose a tierlist from the menu below.")
    .addFields({
      name: "Available Tierlists",
      value: tierlistNames.map(name => `• ${name}`).join("\n")
    })
    .setFooter({ text: "Hero-Dex System" });

  const options = tierlistFiles.slice(0, 25).map(file => {
    const name = path.parse(file).name;
    return {
      label: formatFileLabel(name).slice(0, 100),
      value: name
    };
  });

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("tierlist_menu")
      .setPlaceholder("Choose a tierlist")
      .addOptions(options)
  );

  return message.reply({
    embeds: [embed],
    components: [row]
  });
}

module.exports = {
  handleTierlist
};
