const path = require("path");
const fs = require("fs");

const {
  heroEditSessions
} = require("../sessions/heroSessions");

const {
  heroesData,
  saveHeroesJson,
  ensureDir,
  downloadAttachment
} = require("../utils/fileUtils");

const { gitCommitAndPush } = require("../utils/gitUtils");

async function startEditHero(message) {
  if (heroEditSessions.has(message.author.id)) {
    return message.reply("You are already editing a hero.");
  }

  heroEditSessions.set(message.author.id, {
    step: 1,
    data: {
      hero: null,
      mode: null
    }
  });

  return message.reply("Which hero do you want to edit?");
}

async function handleEditHeroFlow(message) {
  if (!heroEditSessions.has(message.author.id)) return false;

  const session = heroEditSessions.get(message.author.id);
  const rawContent = message.content.trim();
  const content = rawContent.toLowerCase();

  if (content === ".canceledithero") {
    heroEditSessions.delete(message.author.id);
    await message.reply("Edit cancelled.");
    return true;
  }

  try {
    // STEP 1 - SELECT HERO
    if (session.step === 1) {
      if (!heroesData[content]) {
        await message.reply("Hero not found.");
        return true;
      }

      session.data.hero = content;
      session.step = 2;

      await message.reply(
`What do you want to edit?

1 - Name
2 - Roles
3 - Type
4 - Category
5 - Hero Image
6 - PDF
7 - Add Android Images
8 - Replace Android Images`
      );
      return true;
    }

    // STEP 2 - SELECT MODE
    if (session.step === 2) {
      session.data.mode = content;

      if (["7", "8"].includes(content)) {
        session.step = 10;
        return message.reply("Send images now. Write `done` when finished.");
      }

      if (["5", "6"].includes(content)) {
        session.step = 3;
        return message.reply("Send the new file.");
      }

      session.step = 3;
      return message.reply("Send new value.");
    }

    // ===== IMAGE / PDF =====
    if (session.step === 3 && ["5", "6"].includes(session.data.mode)) {
      const hero = session.data.hero;

      if (message.attachments.size === 0) {
        await message.reply("Send file.");
        return true;
      }

      const attachment = message.attachments.first();
      const ext = path.extname(attachment.name || "").toLowerCase();

      if (session.data.mode === "5") {
        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
          await message.reply("Please send a valid image file.");
          return true;
        }

        ensureDir("./images");
        await downloadAttachment(attachment.url, `./images/${hero}${ext}`);
      }

      if (session.data.mode === "6") {
        if (ext !== ".pdf") {
          await message.reply("Please send a valid PDF file.");
          return true;
        }

        ensureDir("./pdf");
        await downloadAttachment(attachment.url, `./pdf/${hero}.pdf`);
      }

      gitCommitAndPush(`Update file for ${hero}`);
      heroEditSessions.delete(message.author.id);

      return message.reply("File updated.");
    }

    // ===== NORMAL EDIT =====
    if (session.step === 3) {
      const hero = session.data.hero;
      const mode = session.data.mode;

      if (mode === "1") {
        const newName = content;

        heroesData[newName] = heroesData[hero];
        delete heroesData[hero];

        saveHeroesJson();
        gitCommitAndPush(`Rename hero ${hero} -> ${newName}`);

        heroEditSessions.delete(message.author.id);
        return message.reply("Hero renamed.");
      }

      if (mode === "2") {
        heroesData[hero].roles = rawContent.split(",").map(r => r.trim()).filter(Boolean);
      }

      if (mode === "3") {
        heroesData[hero].type = rawContent;
      }

      if (mode === "4") {
        heroesData[hero].category = rawContent;
      }

      saveHeroesJson();
      gitCommitAndPush(`Edit hero: ${hero}`);

      heroEditSessions.delete(message.author.id);
      return message.reply("Hero updated.");
    }

    // ===== ANDROID IMAGES =====
    if (session.step === 10) {
      const hero = session.data.hero;
      const mode = session.data.mode;

      const folder = path.join("./hero-guide-images", hero);
      ensureDir(folder);

      // REPLACE
      if (mode === "8" && !session.cleared) {
        if (fs.existsSync(folder)) {
          fs.rmSync(folder, { recursive: true, force: true });
        }
        ensureDir(folder);
        session.cleared = true;
      }

      if (content === "done") {
        gitCommitAndPush(`Update Android images for ${hero}`);
        heroEditSessions.delete(message.author.id);
        return message.reply("Android images updated.");
      }

      if (message.attachments.size === 0) {
        await message.reply("Send images or write `done`.");
        return true;
      }

      const files = fs.existsSync(folder) ? fs.readdirSync(folder) : [];
      let index = files.length + 1;

      for (const attachment of message.attachments.values()) {
        const ext = path.extname(attachment.name || "").toLowerCase();

        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;

        const filePath = path.join(folder, `${index}${ext}`);
        await downloadAttachment(attachment.url, filePath);
        index++;
      }

      await message.reply("Image(s) added. Send more or write `done`.");
      return true;
    }

  } catch (err) {
    console.error("Edit hero error:", err);
    heroEditSessions.delete(message.author.id);
    await message.reply("Something went wrong.");
    return true;
  }

  return false;
}

module.exports = {
  startEditHero,
  handleEditHeroFlow
};
