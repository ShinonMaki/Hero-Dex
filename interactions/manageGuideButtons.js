const { startAddGuide } = require("../commands/addguide");

async function handleManageGuideButtons(interaction) {
  if (interaction.customId === "manage_addguide") {
    return startAddGuide(interaction);
  }

  if (interaction.customId === "manage_editguide") {
    return interaction.reply({
      content: "Edit Guide is not connected yet.",
      ephemeral: true
    });
  }

  if (interaction.customId === "manage_deleteguide") {
    return interaction.reply({
      content: "Delete Guide is not connected yet.",
      ephemeral: true
    });
  }
}

module.exports = { handleManageGuideButtons };
