const { startAddGuide } = require("../commands/addguide");
const { startEditGuide } = require("../commands/editguide");

async function handleManageGuideButtons(interaction) {
  if (interaction.customId === "manage_addguide") {
    return startAddGuide(interaction);
  }

  if (interaction.customId === "manage_editguide") {
    return startEditGuide(interaction);
  }

  if (interaction.customId === "manage_deleteguide") {
    return interaction.reply({
      content: "Delete Guide is not connected yet.",
      ephemeral: true
    });
  }
}

module.exports = { handleManageGuideButtons };
