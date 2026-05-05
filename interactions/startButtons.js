const { handleGuide } = require("../commands/guide");
const { handleTierlist } = require("../commands/tierlist");
const { handleHeroes } = require("../commands/heroes");
const { heroesData } = require("../utils/fileUtils");

async function handleStartButtons(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("start_")) return false;

  // GUIDE
  if (interaction.customId === "start_guide") {
    await interaction.deferUpdate();
    return handleGuide(interaction.message);
  }

  // TIERLIST
  if (interaction.customId === "start_tierlist") {
    await interaction.deferUpdate();
    return handleTierlist(interaction.message);
  }

  // HEROES
  if (interaction.customId === "start_heroes") {
    await interaction.deferUpdate();
    return handleHeroes(interaction.message);
  }

  // 🎯 SELECT HERO (input manuale)
  if (interaction.customId === "start_select_hero") {
    await interaction.reply({
      content: "Type the hero name (example: `Madara`)",
      ephemeral: true
    });

    const filter = (msg) =>
      msg.author.id === interaction.user.id &&
      msg.channel.id === interaction.channel.id &&
      !msg.author.bot;

    const collector = interaction.channel.createMessageCollector({
      filter,
      max: 1,
      time: 30000
    });

    collector.on("collect", async (msg) => {
      const hero = msg.content.trim().toLowerCase();

      if (!heroesData[hero]) {
        return msg.reply("Hero not found. Use `.heroes` to see available ones.");
      }

      // 💥 Trigger comando automatico
      msg.content = `.${hero}`;

      // (opzionale) pulizia
      // msg.delete().catch(() => {});
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.followUp({
          content: "Time expired. Click Select Hero again.",
          ephemeral: true
        });
      }
    });

    return true;
  }

  return false;
}

module.exports = { handleStartButtons };
