module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  if (!interaction.customId.startsWith("guide_category_")) return;

  const category = interaction.customId.replace("guide_category_", "");

  const guides = require("../guides.json");

  const list = guides[category];

  if (!list) {
    return interaction.reply({ content: "No guides found.", ephemeral: true });
  }

  const options = list.map(g => ({
    label: g.name,
    value: g.file
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`guide_select_${category}`)
      .setPlaceholder("Choose a guide")
      .addOptions(options)
  );

  return interaction.reply({
    content: `Category: ${category}`,
    components: [row],
    ephemeral: true
  });
};
