const path = require("path");
const fs = require("fs");
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { guideEditSessions } = require("../sessions/guideSessions");
const {
  getGuides,
  saveGuides,
  createGuidePdf,
  guidesFolderPath,
  slugify,
  ensureGuidesFolder
} = require("../utils/guideUtils");
const { gitCommitAndPush } = require("../utils/gitUtils");
const { formatFileLabel } = require("../utils/formatUtils");

async function startEditGuide(interactionOrMessage) {
  const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
  const isInteraction = !!interactionOrMessage.isButton;

  if (guideEditSessions.has(userId)) {
    return sendReply(interactionOrMessage, "You are already editing a guide.", isInteraction);
  }

  guideEditSessions.set(userId, {
    step: 1,
    data: {
      category: null,
      title: null,
      mode: null,
      tempImages: []
    }
  });

  const guides = getGuides();
  const categories = Object.keys(guides).filter(
    cat => Object.keys(guides[cat] || {}).length > 0
  );

  if (categories.length === 0) {
    guideEditSessions.delete(userId);
    return sendReply(interactionOrMessage, "No guide categories found.", isInteraction);
  }

  const options = categories.map(category => ({
    label: formatFileLabel(category).slice(0, 100),
    value: category
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("guide_edit_category_select")
      .setPlaceholder("Choose a category")
      .addOptions(options.slice(0, 25))
  );

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

async function handleEditGuideCategorySelection(interaction) {
  const userId = interaction.user.id;

  if (!guideEditSessions.has(userId)) {
    return interaction.reply({
      content: "No active guide edit session found.",
      ephemeral: true
    });
  }

  const session = guideEditSessions.get(userId);
  const category = interaction.values[0];
  const guides = getGuides();
  const categoryGuides = guides[category];

  if (!categoryGuides || Object.keys(categoryGuides).length === 0) {
    return interaction.reply({
      content: "No guides found in this category.",
      ephemeral: true
    });
  }

  session.data.category = category;
  session.step = 2;

  const options = Object.keys(categoryGuides).map(title => ({
    label: title.slice(0, 100),
    value: title
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("guide_edit_select_guide")
      .setPlaceholder("Choose a guide")
      .addOptions(options.slice(0, 25))
  );

  return interaction.reply({
    content: `Category selected: ${formatFileLabel(category)}\nNow choose a guide.`,
    components: [row],
    ephemeral: true
  });
}

async function handleEditGuideSelection(interaction) {
  const userId = interaction.user.id;

  if (!guideEditSessions.has(userId)) {
    return interaction.reply({
      content: "No active guide edit session found.",
      ephemeral: true
    });
  }

  const session = guideEditSessions.get(userId);
  const title = interaction.values[0];

  session.data.title = title;
  session.step = 3;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("guide_edit_mode_change_title")
      .setLabel("Change Title")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("guide_edit_mode_text")
      .setLabel("Text")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("guide_edit_mode_add_images")
      .setLabel("Add Images")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("guide_edit_mode_replace_all_images")
      .setLabel("Replace All Images")
      .setStyle(ButtonStyle.Danger)
  );

  return interaction.reply({
    content: `Guide selected: ${title}\nWhat do you want to edit?`,
    components: [row],
    ephemeral: true
  });
}

async function handleEditGuideModeSelection(interaction) {
  const userId = interaction.user.id;

  if (!guideEditSessions.has(userId)) {
    return interaction.reply({
      content: "No active guide edit session found.",
      ephemeral: true
    });
  }

  const session = guideEditSessions.get(userId);
  const mode = interaction.customId.replace("guide_edit_mode_", "");

  session.data.mode = mode;
  session.step = 4;

  if (mode === "change_title") {
    return interaction.reply({
      content: "Send the new title.",
      ephemeral: true
    });
  }

  if (mode === "text") {
    return interaction.reply({
      content: "Send the new text.",
      ephemeral: true
    });
  }

  if (mode === "add_images") {
    return interaction.reply({
      content: "Send the new image(s). When you are done, write `done`.",
      ephemeral: true
    });
  }

  if (mode === "replace_all_images") {
    return interaction.reply({
      content: "Send the replacement image(s). When you are done, write `done`.",
      ephemeral: true
    });
  }

  return interaction.reply({
    content: "Invalid edit mode.",
    ephemeral: true
  });
}

async function handleEditGuideFlow(message) {
  if (!guideEditSessions.has(message.author.id)) return false;

  const session = guideEditSessions.get(message.author.id);
  const content = message.content.trim();

  if (content.toLowerCase() === ".canceleditguide") {
    cleanupTempImages(session.data.tempImages);
    guideEditSessions.delete(message.author.id);
    await message.reply("Guide edit cancelled.");
    return true;
  }

  try {
    const guides = getGuides();
    const category = session.data.category;
    const title = session.data.title;
    const mode = session.data.mode;
    const guide = guides[category]?.[title];

    if (!guide && session.step >= 4) {
      cleanupTempImages(session.data.tempImages);
      guideEditSessions.delete(message.author.id);
      await message.reply("Guide not found.");
      return true;
    }

    // CHANGE TITLE
    if (session.step === 4 && mode === "change_title") {
      if (!content) {
        await message.reply("Send the new title.");
        return true;
      }

      const newTitle = content;
      const newFileName = `${slugify(newTitle)}.pdf`;

      const oldPdfPath = path.join(guidesFolderPath, guide.file);
      const newPdfPath = path.join(guidesFolderPath, newFileName);
      const imagePaths = (guide.images || []).map(img => path.join(guidesFolderPath, img));

      await createGuidePdf(newPdfPath, newTitle, guide.text || "", imagePaths);

      if (fs.existsSync(oldPdfPath) && oldPdfPath !== newPdfPath) {
        fs.unlinkSync(oldPdfPath);
      }

      delete guides[category][title];
      guides[category][newTitle] = {
        file: newFileName,
        text: guide.text || "",
        images: guide.images || []
      };

      saveGuides(guides);
      guideEditSessions.delete(message.author.id);
      gitCommitAndPush(`Edit guide title: ${newTitle}`);

      await message.reply(`Guide title updated: ${newTitle}`);
      return true;
    }

    // TEXT
    if (session.step === 4 && mode === "text") {
      if (!content) {
        await message.reply("Send the new text.");
        return true;
      }

      guide.text = content;
      saveGuides(guides);

      const pdfPath = path.join(guidesFolderPath, guide.file);
      const imagePaths = (guide.images || []).map(img => path.join(guidesFolderPath, img));

      await createGuidePdf(pdfPath, title, guide.text, imagePaths);

      guideEditSessions.delete(message.author.id);
      gitCommitAndPush(`Edit guide text: ${title}`);

      await message.reply(`Guide text updated: ${title}`);
      return true;
    }

    // ADD IMAGES
    if (session.step === 4 && mode === "add_images") {
      if (content.toLowerCase() === "done") {
        guide.images = [...(guide.images || []), ...session.data.tempImages.map(p => path.basename(p))];
        saveGuides(guides);

        const pdfPath = path.join(guidesFolderPath, guide.file);
        const imagePaths = (guide.images || []).map(img => path.join(guidesFolderPath, img));

        await createGuidePdf(pdfPath, title, guide.text || "", imagePaths);

        guideEditSessions.delete(message.author.id);
        gitCommitAndPush(`Add guide images: ${title}`);

        await message.reply(`Images added to guide: ${title}`);
        return true;
      }

      if (message.attachments.size === 0) {
        await message.reply("Send image files, or write `done` when finished.");
        return true;
      }

      ensureGuidesFolder();

      for (const attachment of message.attachments.values()) {
        const ext = path.extname(attachment.name || "").toLowerCase();
        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;

        const safeTitle = slugify(title || "guide");
        const imageName = `${safeTitle}-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
        const imagePath = path.join(guidesFolderPath, imageName);

        const res = await fetch(attachment.url);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(imagePath, buffer);

        session.data.tempImages.push(imagePath);
      }

      await message.reply("Image(s) added. Send more images or write `done`.");
      return true;
    }

    // REPLACE ALL IMAGES
    if (session.step === 4 && mode === "replace_all_images") {
      if (content.toLowerCase() === "done") {
        for (const oldImage of guide.images || []) {
          const oldPath = path.join(guidesFolderPath, oldImage);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        guide.images = session.data.tempImages.map(p => path.basename(p));
        saveGuides(guides);

        const pdfPath = path.join(guidesFolderPath, guide.file);
        const imagePaths = (guide.images || []).map(img => path.join(guidesFolderPath, img));

        await createGuidePdf(pdfPath, title, guide.text || "", imagePaths);

        guideEditSessions.delete(message.author.id);
        gitCommitAndPush(`Replace guide images: ${title}`);

        await message.reply(`All images replaced for guide: ${title}`);
        return true;
      }

      if (message.attachments.size === 0) {
        await message.reply("Send image files, or write `done` when finished.");
        return true;
      }

      ensureGuidesFolder();

      for (const attachment of message.attachments.values()) {
        const ext = path.extname(attachment.name || "").toLowerCase();
        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;

        const safeTitle = slugify(title || "guide");
        const imageName = `${safeTitle}-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
        const imagePath = path.join(guidesFolderPath, imageName);

        const res = await fetch(attachment.url);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(imagePath, buffer);

        session.data.tempImages.push(imagePath);
      }

      await message.reply("Replacement image(s) added. Send more images or write `done`.");
      return true;
    }
  } catch (err) {
    console.error("Edit guide error:", err);
    cleanupTempImages(session.data.tempImages);
    guideEditSessions.delete(message.author.id);
    await message.reply("Something went wrong while editing the guide.");
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

async function sendReply(target, content, isInteraction = false) {
  if (isInteraction) {
    return target.reply({
      content,
      ephemeral: true
    });
  }

  return target.reply(content);
}

module.exports = {
  startEditGuide,
  handleEditGuideFlow,
  handleEditGuideCategorySelection,
  handleEditGuideSelection,
  handleEditGuideModeSelection
};
