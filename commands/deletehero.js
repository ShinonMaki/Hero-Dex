const fs = require("fs");
const {
  heroDeleteSessions
} = require("../sessions/heroSessions");
const {
  heroesData,
  findImage,
  findPdf,
  saveHeroesJson
} = require("../utils/fileUtils");
const { formatFileLabel } = require("../utils/formatUtils");
const { gitCommitAndPush } = require("../utils/gitUtils");

async function startDeleteHero(message) {
  if (heroDeleteSessions.has(message.author.id)) {
    return message.reply("You are already deleting a hero.");
  }

  heroDeleteSessions.set(message.author.id, {
    step: 1,
    hero: null
  });

  return message.reply("Hero name?");
}

async function handleDeleteHeroFlow(message) {
  if (!heroDeleteSessions.has(message.author.id)) return false;

  const session = heroDeleteSessions.get(message.author.id);
  const content = message.content.trim().toLowerCase();

  if (content === ".canceldelete") {
    heroDeleteSessions.delete(message.author.id);
    await message.reply("Hero deletion cancelled.");
    return true;
  }

  try {
    if (session.step === 1) {
      const hero = content;

      if (!heroesData[hero]) {
        await message.reply("Hero not found. Try again.");
        return true;
      }

      session.hero = hero;
      session.step = 2;

      await message.reply(`Are you sure you want to delete **${formatFileLabel(hero)}**? (yes/no)`);
      return true;
    }

    if (session.step === 2) {
      if (content !== "yes") {
        heroDeleteSessions.delete(message.author.id);
        await message.reply("Deletion cancelled.");
        return true;
      }

      const hero = session.hero;

      delete heroesData[hero];
      saveHeroesJson();

      const imageFile = findImage(hero);
      if (imageFile) {
        fs.unlinkSync(`./images/${imageFile}`);
      }

      const pdfFile = findPdf(hero);
      if (pdfFile) {
        fs.unlinkSync(`./pdf/${pdfFile}`);
      }

      heroDeleteSessions.delete(message.author.id);

      gitCommitAndPush(`Delete hero: ${hero}`);

      await message.reply(`Hero deleted successfully: ${formatFileLabel(hero)}`);
      return true;
    }
  } catch (err) {
    console.error("Delete hero error:", err);
    heroDeleteSessions.delete(message.author.id);
    await message.reply("Something went wrong while deleting the hero.");
    return true;
  }

  return false;
}

module.exports = {
  startDeleteHero,
  handleDeleteHeroFlow
};
