const path = require("path");
const fs = require("fs");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  guideAddSessions
} = require("../sessions/guideSessions");

const {
  getGuides,
  addCategory,
  addGuide,
  createGuidePdf,
  ensureGuidesFolder,
  slugify,
  guidesFolderPath
} = require("../utils/guideUtils");

const {
  gitCommitAndPush
} = require("../utils/gitUtils");

const {
  formatFileLabel
} = require("../utils/formatUtils");

async function startAddGuide(interactionOrMessage) {
  const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
  const isInteraction = !!interactionOrMessage.isButton;

  if (guideAddSessions.has(userId)) {
    if (isInteraction) {
      return interactionOrMessage.reply({
        content: "You are already adding a guide.",
        ephemeral: true
      });
    }

    return interactionOrMessage.reply("You are already adding a guide.");
  }

  guideAddSessions.set(userId, {
    step: 1,
    data: {
      category: null,
      title: null,
      text: null,
      wantsImages: null,
      imagePaths: []
    }
  });

  const guides = getGuides();
  const categories = Object.keys(guides);

  const buttons = categories.slice(0, 4).map(category =>
    new ButtonBuilder()
      .setCustomId(`guide_add_category_${category}`)
      .setLabel(formatFileLabel(category))
      .setStyle(ButtonStyle.Primary)
  );

  buttons.push(
    new ButtonBuilder()
      .setCustomId("guide_add_category_new")
      .setLabel("Add Category")
      .setStyle(ButtonStyle.Success)
  );

  const row = new ActionRowBuilder().addComponents(buttons);

  if (isInteraction) {
    return interactionOrMessage.reply({
      content: "Choose a category.",
      components: [row],
      ephemeral: true
    });
  }

  return interactionOrMessage.reply({
    content: "Choose a category.",
    components: [row]
  });
}

async function handleAddGuideFlow(message) {
  if (!guideAddSessions.has(message.author.id)) return false;

  const session = guideAddSessions.get(message.author.id);
  const content = message.content.trim();

  if (content.toLowerCase() === ".cancelguide") {
    cleanupTempImages(session.data.imagePaths);
    guideAddSessions.delete(message.author.id);
    await message.reply("Guide creation cancelled.");
    return true;
  }

  try {
    // STEP 2 - NEW CATEGORY NAME
    if (session.step === 2) {
      const newCategory = content.toLowerCase().trim();

      if (!newCategory) {
        await message.reply("Write the new category name.");
        return true;
      }

      addCategory(newCategory);
      session.data.category = newCategory;
      session.step = 3;

      await message.reply(`Category created: ${formatFileLabel(newCategory)}\nNow send the guide title.`);
      return true;
    }

    // STEP 3 - TITLE
    if (session.step === 3) {
      if (!content) {
        await message.reply("Guide title?");
        return true;
      }

      session.data.title = content;
      session.step = 4;

      await message.reply("Guide text?");
      return true;
    }

    // STEP 4 - TEXT
    if (session.step === 4) {
      if (!content) {
        await message.reply("Guide text?");
        return true;
      }

      session.data.text = content;
      session.step = 5;

      await message.reply("Do you want to add images? (yes/no)");
      return true;
    }

    // STEP 5 - IMAGES YES/NO
    if (session.step === 5) {
      const choice = content.toLowerCase();

      if (choice !== "yes" && choice !== "no") {
        await message.reply("Reply with yes or no.");
        return true;
      }

      session.data.wantsImages = choice === "yes";

      if (choice === "yes") {
        session.step = 6;
        await message.reply("Send the images now. When you are done, write `done`.");
        return true;
      }

      // create PDF immediately
      ensureGuidesFolder();

      const safeFileName = `${slugify(session.data.title)}.pdf`;
      const outputPath = path.join(guidesFolderPath, safeFileName);

      await createGuidePdf(
        outputPath,
        session.data.title,
        session.data.text,
        []
      );

      addGuide(session.data.category, session.data.title, safeFileName);

      guideAddSessions.delete(message.author.id);

      gitCommitAndPush(`Add guide: ${session.data.title}`);

      await message.reply(`Guide added successfully: ${session.data.title}`);
      return true;
    }

    // STEP 6 - RECEIVE IMAGES
    if (session.step === 6) {
      if (content.toLowerCase() === "done") {
        ensureGuidesFolder();

        const safeFileName = `${slugify(session.data.title)}.pdf`;
        const outputPath = path.join(guidesFolderPath, safeFileName);

        await createGuidePdf(
          outputPath,
          session.data.title,
          session.data.text,
          session.data.imagePaths
        );

        addGuide(session.data.category, session.data.title, safeFileName);

        cleanupTempImages(session.data.imagePaths);
        guideAddSessions.delete(message.author.id);

        gitCommitAndPush(`Add guide: ${session.data.title}`);

        await message.reply(`Guide added successfully: ${session.data.title}`);
        return true;
      }

      if (message.attachments.size === 0) {
        await message.reply("Send image files, or write `done` when finished.");
        return true;
      }

      for (const attachment of message.attachments.values()) {
        const ext = path.extname(attachment.name || "").toLowerCase();

        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
          continue;
        }

        const tempName = `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
        const tempPath = path.join(guidesFolderPath, tempName);

        const res = await fetch(attachment.url);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(tempPath, buffer);

        session.data.imagePaths.push(tempPath);
      }

      await message.reply("Image(s) added. Send more images or write `done`.");
      return true;
    }
  } catch (err) {
    console.error("Add guide error:", err);
    cleanupTempImages(session.data.imagePaths);
    guideAddSessions.delete(message.author.id);
    await message.reply("Something went wrong while creating the guide.");
    return true;
  }

  return false;
}

function cleanupTempImages(imagePaths = []) {
  for (const imagePath of imagePaths) {
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (err) {
      console.error("Temp image cleanup error:", err);
    }
  }
}

module.exports = {
  startAddGuide,
  handleAddGuideFlow
};
