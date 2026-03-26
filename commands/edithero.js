const fs = require("fs");
const path = require("path");
const {
  heroEditSessions
} = require("../sessions/heroSessions");
const {
  heroesData,
  findImage,
  findPdf,
  saveHeroesJson,
  downloadAttachment
} = require("../utils/fileUtils");
const { formatFileLabel } = require("../utils/formatUtils");
const { gitCommitAndPush } = require("../utils/gitUtils");

async function startEditHero(message) {
  if (heroEditSessions.has(message.author.id)) {
    return message.reply("You are already editing a hero.");
  }

  heroEditSessions.set(message.author.id, {
    step: 1,
    hero: null,
    field: null
  });

  return message.reply("Hero name?");
}

async function handleEditHeroFlow(message) {
  if (!heroEditSessions.has(message.author.id)) return false;

  const session = heroEditSessions.get(message.author.id);
  const content = message.content.trim();

  if (content.toLowerCase() === ".canceledit") {
    heroEditSessions.delete(message.author.id);
    await message.reply("Hero edit cancelled.");
    return true;
  }

  try {
    if (session.step === 1) {
      const hero = content.toLowerCase();

      if (!heroesData[hero]) {
        await message.reply("Hero not found. Try again.");
        return true;
      }

      session.hero = hero;
      session.step = 2;
      await message.reply("What do you want to edit? (role/type/category/image/pdf)");
      return true;
    }

    if (session.step === 2) {
      const field = content.toLowerCase();

      if (!["role", "type", "category", "image", "pdf"].includes(field)) {
        await message.reply("Choose: role/type/category/image/pdf");
        return true;
      }

      session.field = field;
      session.step = 3;

      if (field === "image") {
        await message.reply("Send new image file.");
        return true;
      }

      if (field === "pdf") {
        await message.reply("Send new PDF file.");
        return true;
      }

      await message.reply(`New ${field}?`);
      return true;
    }

    if (session.step === 3) {
      const hero = session.hero;
      const field = session.field;

      if (field === "role") {
        const roles = content
          .split(",")
          .map(r => r.trim())
          .filter(Boolean);

        heroesData[hero].roles = roles;
      }

      if (field === "type") {
        heroesData[hero].type = content;
      }

      if (field === "category") {
        const categories = content
          .split(";")
          .map(c => c.trim())
          .filter(Boolean);

        heroesData[hero].category =
          categories.length === 1 ? categories[0] : categories;
      }

      if (field === "image") {
        if (message.attachments.size === 0) {
          await message.reply("Send image file.");
          return true;
        }

        const attachment = message.attachments.first();
        const ext = path.extname(attachment.name || "").toLowerCase();

        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
          await message.reply("Invalid image.");
          return true;
        }

        const old = findImage(hero);
        if (old) {
          fs.unlinkSync(`./images/${old}`);
        }

        const imagePath = `./images/${hero}${ext}`;
        await downloadAttachment(attachment.url, imagePath);
      }

      if (field === "pdf") {
        if (message.attachments.size === 0) {
          await message.reply("Send PDF file.");
          return true;
        }

        const attachment = message.attachments.first();
        const ext = path.extname(attachment.name || "").toLowerCase();

        if (ext !== ".pdf") {
          await message.reply("Invalid PDF.");
          return true;
        }

        const old = findPdf(hero);
        if (old) {
          fs.unlinkSync(`./pdf/${old}`);
        }

        const pdfPath = `./pdf/${hero}.pdf`;
        await downloadAttachment(attachment.url, pdfPath);
      }

      saveHeroesJson();
      heroEditSessions.delete(message.author.id);

      gitCommitAndPush(`Edit hero: ${hero}`);

      await message.reply(`Hero updated: ${formatFileLabel(hero)}`);
      return true;
    }
  } catch (err) {
    console.error("Edit hero error:", err);
    heroEditSessions.delete(message.author.id);
    await message.reply("Error editing hero.");
    return true;
  }

  return false;
}

module.exports = {
  startEditHero,
  handleEditHeroFlow
};
