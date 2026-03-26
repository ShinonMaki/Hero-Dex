const {
  heroCreationSessions,
  heroDeleteSessions,
  heroEditSessions
} = require("../sessions/heroSessions");

async function handleManageHeroButtons(interaction) {
  if (interaction.customId === "manage_addhero") {
    if (heroCreationSessions.has(interaction.user.id)) {
      return interaction.reply({
        content: "You are already creating a hero.",
        ephemeral: true
      });
    }

    heroCreationSessions.set(interaction.user.id, {
      step: 1,
      data: {}
    });

    return interaction.reply({
      content: "Hero name?",
      ephemeral: true
    });
  }

  if (interaction.customId === "manage_edithero") {
    if (heroEditSessions.has(interaction.user.id)) {
      return interaction.reply({
        content: "You are already editing a hero.",
        ephemeral: true
      });
    }

    heroEditSessions.set(interaction.user.id, {
      step: 1,
      hero: null,
      field: null
    });

    return interaction.reply({
      content: "Hero name?",
      ephemeral: true
    });
  }

  if (interaction.customId === "manage_deletehero") {
    if (heroDeleteSessions.has(interaction.user.id)) {
      return interaction.reply({
        content: "You are already deleting a hero.",
        ephemeral: true
      });
    }

    heroDeleteSessions.set(interaction.user.id, {
      step: 1,
      hero: null
    });

    return interaction.reply({
      content: "Hero name?",
      ephemeral: true
    });
  }
}

module.exports = {
  handleManageHeroButtons
};
