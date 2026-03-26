module.exports = async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (!interaction.customId.startsWith("guide_select_")) return;

  const file = interaction.values[0];

  return interaction.reply({
    files: [`./guides/${file}`],
    ephemeral: true
  });
};
