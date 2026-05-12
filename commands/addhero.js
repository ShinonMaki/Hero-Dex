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
      from: null,
      roles: [],
      type: null,
      category: null
    }
  });

  return message.reply("Hero name?");
}

async function handleAddHeroFlow(message) {
  if (!heroCreationSessions.has(message.author.id)) return false;

  const session = heroCreationSessions.get(message.author.id);
  const rawContent = message.content.trim();
  const content = rawContent.toLowerCase();

  if (content === ".cancelhero") {
    heroCreationSessions.delete(message.author.id);
    await message.reply("Hero creation cancelled.");
    return true;
  }

  try {
    // STEP 1 - NAME
    if (session.step === 1) {
      const heroName = content;

      if (!heroName) {
        await message.reply("Hero name?");
        return true;
      }

      if (heroesData[heroName]) {
        await message.reply("Hero already exists.");
        return true;
      }

      session.data.name = heroName;
      session.step = 2;

      return message.reply("From? Example: `Frieren: Beyond Journey's End`");
    }

    // STEP 2 - FROM
    if (session.step === 2) {
      if (!rawContent) {
        return message.reply("From?");
      }

      session.data.from = rawContent;
      session.step = 3;

      return message.reply("Hero role?");
    }

    // STEP 3 - ROLE
    if (session.step === 3) {
      const roles = rawContent
        .split(",")
        .map(r => r.trim())
        .filter(Boolean);

      if (roles.length === 0) {
        return message.reply("Hero role?");
      }

      session.data.roles = roles;
      session.step = 4;

      return message.reply("Hero type?");
    }

    // STEP 4 - TYPE
    if (session.step === 4) {
      if (!rawContent) {
        return message.reply("Hero type?");
      }

      session.data.type = rawContent;
      session.step = 5;

      return message.reply("Hero category?");
    }

    // STEP 5 - CATEGORY
    if (session.step === 5) {
      if (!rawContent) {
        return message.reply("Hero category?");
      }

      const categories = rawContent
        .split(";")
        .map(c => c.trim())
        .filter(Boolean);

      session.data.category = categories.length === 1 ? categories[0] : categories;
      session.step = 6;

      return message.reply("Hero image? Send the file.");
    }

    // STEP 6 - HERO IMAGE
    if (session.step === 6) {
      if (message.attachments.size === 0) {
        return message.reply("Send the hero image.");
      }

      const attachment = message.attachments.first();
      const ext = path.extname(attachment.name || "").toLowerCase();

      if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
        return message.reply("Invalid image format.");
      }

      ensureDir("./images");
      await downloadAttachment(attachment.url, `./images/${session.data.name}${ext}`);

      session.step = 7;
      return message.reply("Hero PDF?");
    }

    // STEP 7 - PDF
    if (session.step === 7) {
      if (message.attachments.size === 0) {
        return message.reply("Send the PDF.");
      }

      const attachment = message.attachments.first();
      const ext = path.extname(attachment.name || "").toLowerCase();

      if (ext !== ".pdf") {
        return message.reply("Invalid PDF.");
      }

      ensureDir("./pdf");
      await downloadAttachment(attachment.url, `./pdf/${session.data.name}.pdf`);

      session.step = 8;
      return message.reply("Add Android images? (yes/no)");
    }

    // STEP 8 - ANDROID YES/NO
    if (session.step === 8) {
      if (content !== "yes" && content !== "no") {
        return message.reply("Reply with yes or no.");
      }

      if (content === "no") {
        session.step = 10;
        return message.reply("Hero logo? Send the file or write `no`.");
      }

      const folder = path.join("./hero-guide-images", session.data.name);

      if (fs.existsSync(folder)) {
        fs.rmSync(folder, { recursive: true, force: true });
      }

      ensureDir(folder);

      session.step = 9;
      return message.reply("Send Android images. Write `done` when finished.");
    }

    // STEP 9 - ANDROID IMAGES
    if (session.step === 9) {
      if (content === "done") {
        session.step = 10;
        return message.reply("Hero logo? Send the file or write `no`.");
      }

      if (message.attachments.size === 0) {
        return message.reply("Send images or `done`.");
      }

      const folder = path.join("./hero-guide-images", session.data.name);
      const files = fs.existsSync(folder) ? fs.readdirSync(folder) : [];

      let index = files.length + 1;

      for (const attachment of message.attachments.values()) {
        const ext = path.extname(attachment.name || "").toLowerCase();

        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;

        const filePath = path.join(folder, `${index}${ext}`);
        await downloadAttachment(attachment.url, filePath);
        index++;
      }

      return message.reply("Images added. Continue or write `done`.");
    }

    // STEP 10 - LOGO
    if (session.step === 10) {
      if (content === "no") {
        session.step = 11;
        return message.reply("Hero voice? Send an MP3 file or write `no`.");
      }

      if (message.attachments.size === 0) {
        return message.reply("Send the hero logo or write `no`.");
      }

      const attachment = message.attachments.first();
      const ext = path.extname(attachment.name || "").toLowerCase();

      if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
        return message.reply("Invalid logo format. Send PNG/JPG/WEBP or write `no`.");
      }

      ensureDir("./logos");
      await downloadAttachment(
        attachment.url,
        `./logos/${session.data.name}_logo${ext}`
      );

      session.step = 11;
      return message.reply("Hero voice? Send an MP3 file or write `no`.");
    }

    // STEP 11 - VOICE
    if (session.step === 11) {
      if (content === "no") {
        finalizeHero(session.data);
        heroCreationSessions.delete(message.author.id);

        return message.reply(`Hero added: ${formatFileLabel(session.data.name)}`);
      }

      if (message.attachments.size === 0) {
        return message.reply("Send the hero voice MP3 or write `no`.");
      }

      const attachment = message.attachments.first();
      const ext = path.extname(attachment.name || "").toLowerCase();

      if (ext !== ".mp3") {
        return message.reply("Invalid voice format. Send MP3 or write `no`.");
      }

      ensureDir("./voices");
      await downloadAttachment(
        attachment.url,
        `./voices/${session.data.name}.mp3`
      );

      finalizeHero(session.data);
      heroCreationSessions.delete(message.author.id);

      return message.reply(`Hero added: ${formatFileLabel(session.data.name)}`);
    }

  } catch (err) {
    console.error("Add hero error:", err);
    heroCreationSessions.delete(message.author.id);
    await message.reply("Something went wrong.");
    return true;
  }

  return false;
}

function finalizeHero(data) {
  heroesData[data.name] = {
    from: data.from,
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
