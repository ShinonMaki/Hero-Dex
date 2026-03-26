const {
  heroCreationSessions
} = require("../sessions/heroSessions");
const {
  heroesData,
  ensureDir,
  saveHeroesJson,
  downloadAttachment
} = require("../utils/fileUtils");
const { formatFileLabel } = require("../utils/formatUtils");
const { gitCommitAndPush } = require("../utils/gitUtils");
const path = require("path");

async function startAddHero(message) {
  if (heroCreationSessions.has(message.author.id)) {
    return message.reply("You are already creating a hero.");
  }

  heroCreationSessions.set(message.author.id, {
    step: 1,
    data: {}
  });

  return message.reply("Hero name?");
}

async function handleAddHeroFlow(message) {
  if (!heroCreationSessions.has(message.author.id)) return false;

  const session = heroCreationSessions.get(message.author.id);

  if (message.content.trim().toLowerCase() === ".cancelhero") {
    heroCreationSessions.delete(message.author.id);
    await message.reply("Hero creation cancelled.");
    return true;
  }

  try {
    if (session.step === 1) {
      const heroName = message.content.trim().toLowerCase();

      if (!heroName) {
        await message.reply("Hero name?");
        return true;
      }

      session.data.name = heroName;
      session.step = 2;
      await message.reply("Hero role?");
      return true;
    }

    if (session.step === 2) {
      const roles = message.content
        .split(",")
        .map(r => r.trim())
        .filter(Boolean);

      if (roles.length === 0) {
        await message.reply("Hero role?");
        return true;
      }

      session.data.roles = roles;
      session.step = 3;
      await message.reply("Hero type?");
      return true;
    }

    if (session.step === 3) {
      const type = message.content.trim();

      if (!type) {
        await message.reply("Hero type?");
        return true;
      }

      session.data.type = type;
      session.step = 4;
      await message.reply("Hero category?");
      return true;
    }

    if (session.step === 4) {
      const raw = message.content.trim();

      if (!raw) {
        await message.reply("Hero category?");
        return true;
      }

      const categories = raw
        .split(";")
        .map(c => c.trim())
        .filter(Boolean);

      session.data.category = categories.length === 1 ? categories[0] : categories;
      session.step = 5;
      await message.reply("Hero image? Please send the image file.");
      return true;
    }

    if (session.step === 5) {
      if (message.attachments.size === 0) {
        await message.reply("Hero image? Please send the image file.");
        return true;
      }

      const attachment = message.attachments.first();
      const ext = path.extname(attachment.name || "").toLowerCase();

      if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
        await message.reply("Please send a valid image file (.png, .jpg, .jpeg, .webp).");
        return true;
      }

      ensureDir("./images");
      const imagePath = `./images/${session.data.name}${ext}`;
      await downloadAttachment(attachment.url, imagePath);

      session.step = 6;
      await message.reply("Hero PDF? Please send the PDF file.");
      return true;
    }

    if (session.step === 6) {
      if (message.attachments.size === 0) {
        await message.reply("Hero PDF? Please send the PDF file.");
        return true;
      }

      const attachment = message.attachments.first();
      const ext = path.extname(attachment.name || "").toLowerCase();

      if (ext !== ".pdf") {
        await message.reply("Please send a valid PDF file.");
        return true;
      }

      ensureDir("./pdf");
      const pdfPath = `./pdf/${session.data.name}.pdf`;
      await downloadAttachment(attachment.url, pdfPath);

      heroesData[session.data.name] = {
        roles: session.data.roles,
        type: session.data.type,
        category: session.data.category
      };

      saveHeroesJson();

      const heroName = session.data.name;
      heroCreationSessions.delete(message.author.id);

      gitCommitAndPush(`Add hero: ${heroName}`);

      await message.reply(`Hero added successfully: ${formatFileLabel(heroName)}`);
      return true;
    }
  } catch (err) {
    console.error("Add hero flow error:", err);
    heroCreationSessions.delete(message.author.id);
    await message.reply("Something went wrong while creating the hero.");
    return true;
  }

  return false;
}

module.exports = {
  startAddHero,
  handleAddHeroFlow
};
