const path = require("path");
const {
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const { startAddGuide } = require("../commands/addguide");
const { startEditGuide } = require("../commands/editguide");
const {
  guideRenameCategorySessions
} = require("../sessions/guideSessions");
const {
  getGuides,
  renameCategory,
  createGuidePdf,
  guidesFolderPath
} = require("../utils/guideUtils");
const {
  formatFileLabel
} = require("../utils/formatUtils");
const { gitCommitAndPush } = require("../utils/gitUtils");

async function handleManageGuideButtons(interaction) {
  if (interaction.customId === "manage_addguide") {
    return startAddGuide(interaction);
  }

  if (interaction.customId === "manage_editguide") {
    return startEditGuide(interaction);
  }

  if (interaction.customId === "manage_deleteguide") {
    return interaction.reply({
      content: "Delete Guide is not connected yet.",
      ephemeral: true
    });
  }

  if (interaction.customId === "manage_renamecategory") {
    const guides = getGuides();
    const categories = Object.keys(guides);

    if (categories.length === 0) {
      return interaction.reply({
        content: "No categories found.",
        ephemeral: true
      });
    }

    guideRenameCategorySessions.set(interaction.user.id, {
      step: 1,
      oldCategory: null
    });

    const options = categories.map(category => ({
      label: formatFileLabel(category).slice(0, 100),
      value: category
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("guide_rename_category_select")
        .setPlaceholder("Choose a category")
        .addOptions(options.slice(0, 25))
    );

    return interaction.reply({
      content: "Choose the category you want to rename.",
      components: [row],
      ephemeral: true
    });
  }

  if (interaction.customId === "manage_regenpdf") {
    const guides = getGuides();
    const categories = Object.keys(guides);

    if (categories.length === 0) {
      return interaction.reply({
        content: "No guides found.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "Regenerating all PDFs...",
      ephemeral: true
    });

    let success = 0;
    let failed = 0;

    for (const category of categories) {
      const categoryGuides = guides[category];

      if (!categoryGuides || typeof categoryGuides !== "object") {
        continue;
      }

      for (const title of Object.keys(categoryGuides)) {
        const guide = categoryGuides[title];

        try {
          const text = guide.text || "";
          const images = Array.isArray(guide.images) ? guide.images : [];
          const pdfFile = guide.file || `${title}.pdf`;

          const imagePaths = images.map(img =>
            path.join(guidesFolderPath, img)
          );

          const outputPath = path.join(guidesFolderPath, pdfFile);

          await createGuidePdf(outputPath, title, text, imagePaths);
          success++;
        } catch (err) {
          console.error(`Regenerate PDF error for ${title}:`, err);
          failed++;
        }
      }
    }

    gitCommitAndPush("Regenerate all guide PDFs");

    return interaction.followUp({
      content: `Done.\nSuccess: ${success}\nFailed: ${failed}`,
      ephemeral: true
    });
  }
}

async function handleRenameCategorySelect(interaction) {
  const session = guideRenameCategorySessions.get(interaction.user.id);

  if (!session) {
    return interaction.reply({
      content: "No active rename session found.",
      ephemeral: true
    });
  }

  const oldCategory = interaction.values[0];
  session.oldCategory = oldCategory;
  session.step = 2;

  return interaction.reply({
    content: `Selected category: ${formatFileLabel(oldCategory)}\nNow send the new category name.`,
    ephemeral: true
  });
}

async function handleRenameCategoryFlow(message) {
  const session = guideRenameCategorySessions.get(message.author.id);
  if (!session) return false;

  const content = message.content.trim();

  if (content.toLowerCase() === ".cancelrenamecategory") {
    guideRenameCategorySessions.delete(message.author.id);
    await message.reply("Category rename cancelled.");
    return true;
  }

  if (session.step === 2) {
    const newCategory = content.toLowerCase().trim();

    if (!newCategory) {
      await message.reply("Send the new category name.");
      return true;
    }

    const result = renameCategory(session.oldCategory, newCategory);

    if (!result.ok) {
      guideRenameCategorySessions.delete(message.author.id);
      await message.reply(`Rename failed: ${result.reason}`);
      return true;
    }

    guideRenameCategorySessions.delete(message.author.id);
    await message.reply(`Category renamed: ${formatFileLabel(session.oldCategory)} → ${formatFileLabel(newCategory)}`);
    return true;
  }

  return false;
}

module.exports = {
  handleManageGuideButtons,
  handleRenameCategorySelect,
  handleRenameCategoryFlow
};
