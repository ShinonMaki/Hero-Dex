const path = require("path");
const fs = require("fs");

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

async function startAddHero(message) {
  if (heroCreationSessions.has(message.author.id)) {
    return message.reply("You are already creating a hero.");
  }

  heroCreationSessions.set(message.author.id, {
    step: 1,
    data: {
      name: null,
      roles: [],
      type: null,
      category: null,
      androidImages: []
    }
  });

  return message.reply("Hero name?");
}

async function handleAddHeroFlow(message) {
  if (!heroCreationSessions.has(message.author.id)) return false;

  const session = heroCreationSessions.get(message.author.id);
  const content = message.content.trim();

  if (content.toLowerCase() === ".cancelhero") {
    heroCreationSessions.delete(message.author.id);
    await message.reply("Hero creation cancelled.");
    return true;
  }

  try {
    // STEP 1 - NAME
    if (session.step === 1) {
      const heroName = content.toLowerCase();

      if (!heroName) {
        await message.reply("Hero name?");
        return true;
      }

      session.data.name = heroName;
      session.step = 2;

      await message.reply("Hero role?");
      return true;
    }

    // STEP 2 - ROLE
    if (session.step === 2) {
      const roles = content
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

    // STEP 3 - TYPE
    if (session.step === 3) {
      const type = content;

      if (!type) {
        await message.reply("Hero type?");
        return true;
      }

      session.data.type = type;
      session.step = 4;

      await message.reply("Hero category?");
      return true;
    }

    // STEP 4 - CATEGORY
    if (session.step === 4) {
      const raw = content;

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

    // STEP 5 - HERO IMAGE
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

    // STEP 6 - HERO PDF
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

      session.step = 7;
      await message.reply("Do you want to add Android/PC guide images? (yes/no)");
      return true;
    }

    // STEP 7 - ANDROID/PC IMAGES YES/NO
    if (session.step === 7) {
      const choice = content.toLowerCase();

      if (choice !== "yes" && choice !== "no") {
        await message.reply("Reply with yes or no.");
        return true;
      }

      if (choice === "no") {
        finalizeHero(session.data);
        heroCreationSessions.delete(message.author.id);

        await message.reply(`Hero added successfully: ${formatFileLabel(session.data.name)}`);
        return true;
      }

      session.step = 8;
      await message.reply("Send the Android/PC guide images now. When you are done, write `done`.");
      return true;
    }

    // STEP 8 - ANDROID/PC IMAGES
    if (session.step === 8) {
      if (content.toLowerCase() === "done") {
        finalizeHero(session.data);
        heroCreationSessions.delete(message.author.id);

        await message.reply(`Hero added successfully: ${formatFileLabel(session.data.name)}`);
        return true;
      }

      if (message.attachments.size === 0) {
        await message.reply("Send image files, or write `done` when finished.");
        return true;
      }

      const heroFolder = path.join("./hero-guide-images", session.data.name);
      ensureDir(heroFolder);

      let nextIndex = session.data.androidImages.length + 1;

      for (const attachment of message.attachments.values()) {
        const ext = path.extname(attachment.name || "").toLowerCase();

        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
          continue;
        }

        const fileName = `${nextIndex}${ext}`;
        const filePath = path.join(heroFolder, fileName);

        await downloadAttachment(attachment.url, filePath);

        session.data.androidImages.push(fileName);
        nextIndex++;
      }

      await message.reply("Image(s) added. Send more images or write `done`.");
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

function finalizeHero(data) {
  heroesData[data.name] = {
    roles: data.roles,
    type: data.type,
    category: data.category
  };

  saveHeroesJson();
  gitCommitAndPush(`Add hero: ${data.name}`);
}

module.exports = {
  startAddHero,
  handleAddHeroFlow
};
