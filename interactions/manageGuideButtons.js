const { guideAddSessions, guideEditSessions, guideDeleteSessions } = require("../sessions/guideSessions");

async function handleManageGuideButtons(interaction) {
  if (interaction.customId === "manage_addguide") {
    if (guideAddSessions.has(interaction.user.id)) {
      return interaction.reply({
        content: "You are already adding a guide.",
        ephemeral: true
      });
    }

    guideAddSessions.set(interaction.user.id, {
      step: 1,
      data: {}
    });

    return interaction.reply({
      content: "Choose a category.",
      ephemeral: true
    });
  }

  if (interaction.customId === "manage_editguide") {
    if (guideEditSessions.has(interaction.user.id)) {
      return interaction.reply({
        content: "You are already editing a guide.",
        ephemeral: true
      });
    }

    guideEditSessions.set(interaction.user.id, {
      step: 1,
      data: {}
    });

    return interaction.reply({
      content: "Guide editing is not connected yet.",
      ephemeral: true
    });
  }

  if (interaction.customId === "manage_deleteguide") {
    if (guideDeleteSessions.has(interaction.user.id)) {
      return interaction.reply({
        content: "You are already deleting a guide.",
        ephemeral: true
      });
    }

    guideDeleteSessions.set(interaction.user.id, {
      step: 1,
      data: {}
    });

    return interaction.reply({
      content: "Guide deletion is not connected yet.",
      ephemeral: true
    });
  }
}

module.exports = { handleManageGuideButtons };
