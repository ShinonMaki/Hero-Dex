const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { guideAddSessions } = require("../sessions/guideSessions");
const {
  getGuides,
  addCategory,
  addGuide,
  createGuidePdf,
  guidesFolderPath,
  slugify,
  ensureGuidesFolder
} = require("../utils/guideUtils");

const path = require("path");
const fs = require("fs");

async function startAddGuide(interactionOrMessage) {
  const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
  const isInteraction = !!interactionOrMessage.isButton;

  if (guideAddSessions.has(userId)) {
    return sendReply(interactionOrMessage, "You are already creating a guide.", isInteraction);
  }

  guideAddSessions.set(userId, {
    step: 1,
    data: {
      category: null,
      title: null,
      text: "",
      images: []
    }
  });

  const guides = getGuides();
  const categories = Object.keys(guides);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("guide_add_select_category")
    .setPlaceholder("Choose a category")
    .addOptions(
      categories.slice(0, 25).map(category => ({
        label: category.slice(0, 100),
        value: category
      }))
    );

  const row1 = new ActionRowBuilder().addComponents(selectMenu);

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("guide_add_category_new")
      .setLabel("Add Category")
      .setStyle(ButtonStyle.Success)
  );

  if (isInteraction) {
    return interactionOrMessage.reply({
      content: "Choose a category or create a new one.",
      components: [row1, row2],
      ephemeral: true
    });
  }

  return interactionOrMessage.reply({
    content: "Choose a category or create a new one.",
    components: [row1, row2]
  });
}

async function handleAddGuideCategorySelect(interaction) {
  const session = guideAddSessions.get(interaction.user.id);

  if (!session) {
    return interaction.reply({
      content: "No active session.",
      ephemeral: true
    });
  }

  const category = interaction.values[0];

  session.data.category = category;
  session.step = 2;

  return interaction.reply({
    content: `Category selected: ${category}\nNow send the guide title.`,
    ephemeral: true
  });
}

async function handleAddGuideNewCategory(interaction) {
  const session = guideAddSessions.get(interaction.user.id);

  if (!session) {
    return interaction.reply({
      content: "No active session.",
      ephemeral: true
    });
  }

  session.step = 99;

  return interaction.reply({
    content: "Send the new category name.",
    ephemeral: true
  });
}

async function handleAddGuideFlow(message) {
  if (!guideAddSessions.has(message.author.id)) return false;

  const session = guideAddSessions.get(message.author.id);
  const content = message.content.trim();

  if (content.toLowerCase() === ".canceladdguide") {
    guideAddSessions.delete(message.author.id);
    await message.reply("Guide creation cancelled.");
    return true;
  }

  try {
    // ===== NEW CATEGORY =====
    if (session.step === 99) {
      const newCategory = content.toLowerCase();

      addCategory(newCategory);

      session.data.category = newCategory;
      session.step = 2;

      await message.reply(`Category created: ${newCategory}\nNow send the guide title.`);
      return true;
    }

    // ===== TITLE =====
    if (session.step === 2) {
      session.data.title = content;
      session.step = 3;

      await message.reply("Send the guide text.");
      return true;
    }

    // ===== TEXT =====
    if (session.step === 3) {
      session.data.text = content;
      session.step = 4;

      await message.reply("Send images (or type `skip`).");
      return true;
    }

    // ===== IMAGES =====
    if (session.step === 4) {
      if (content.toLowerCase() === "skip") {
        return finalizeGuide(message, session);
      }

      if (message.attachments.size === 0) {
        await message.reply("Send images or type `skip`.");
        return true;
      }

      ensureGuidesFolder();

      for (const attachment of message.attachments.values()) {
        const ext = path.extname(attachment.name || "").toLowerCase();
        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;

        const fileName = `${slugify(session.data.title)}-${Date.now()}${ext}`;
        const filePath = path.join(guidesFolderPath, fileName);

        const res = await fetch(attachment.url);
        const buffer = Buffer.from(await res.arrayBuffer());

        fs.writeFileSync(filePath, buffer);

        session.data.images.push(fileName);
      }

      await message.reply("Image(s) added. Send more or type `done`.");

      session.step = 5;
      return true;
    }

    // ===== DONE IMAGES =====
    if (session.step === 5) {
      if (content.toLowerCase() !== "done") {
        await message.reply("Type `done` when finished.");
        return true;
      }

      return finalizeGuide(message, session);
    }

  } catch (err) {
    console.error("Add guide error:", err);
    guideAddSessions.delete(message.author.id);
    await message.reply("Something went wrong.");
    return true;
  }

  return false;
}

async function finalizeGuide(message, session) {
  const { category, title, text, images } = session.data;

  const fileName = `${slugify(title)}.pdf`;
  const pdfPath = path.join(guidesFolderPath, fileName);

  const imagePaths = images.map(img => path.join(guidesFolderPath, img));

  await createGuidePdf(pdfPath, title, text, imagePaths);

  addGuide(category, title, fileName, text, images);

  guideAddSessions.delete(message.author.id);

  await message.reply(`Guide created: ${title}`);
}

async function sendReply(target, content, isInteraction = false) {
  if (isInteraction) {
    return target.reply({ content, ephemeral: true });
  }

  return target.reply(content);
}

module.exports = {
  startAddGuide,
  handleAddGuideFlow,
  handleAddGuideCategorySelect,
  handleAddGuideNewCategory
};
