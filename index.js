require("dotenv").config();

const express = require("express");
const app = express();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { PREFIX, typeColors } = require("./config/constants");
const { heroesData, findPdf, findImage } = require("./utils/fileUtils");

const { handleHeroes } = require("./commands/heroes");
const { handleTierlist } = require("./commands/tierlist");
const { handleManageHero } = require("./commands/managehero");
const { handleManageGuide } = require("./commands/manageguide");
const { handleGuide } = require("./commands/guide");
const { handleSyncGuides } = require("./commands/syncguides");

const { startAddHero, handleAddHeroFlow } = require("./commands/addhero");
const { startDeleteHero, handleDeleteHeroFlow } = require("./commands/deletehero");
const { startEditHero, handleEditHeroFlow } = require("./commands/edithero");

const {
  handleAddGuideFlow,
  handleAddGuideCategorySelect,
  handleAddGuideNewCategory
} = require("./commands/addguide");

const {
  handleEditGuideFlow,
  handleEditGuideCategorySelection,
  handleEditGuideSelection,
  handleEditGuideModeSelection
} = require("./commands/editguide");

const { handleGuideButton } = require("./interactions/guideButton");
const { handleAndroidGuideButton } = require("./interactions/androidGuideButton");
const { handleManageHeroButtons } = require("./interactions/manageHeroButtons");

const {
  handleManageGuideButtons,
  handleRenameCategorySelect,
  handleRenameCategoryFlow
} = require("./interactions/manageGuideButtons");

const { handleTierlistMenu } = require("./interactions/tierlistMenu");
const { handleGuideCategoryButtons } = require("./interactions/guideCategoryButtons");
const { handleGuideMenu } = require("./interactions/guideMenu");
const { handleGuideDeliveryButtons } = require("./interactions/guideDeliveryButtons");

const PORT = process.env.PORT || 3000;

// ===== SERVER =====
app.get("/", (req, res) => {
  res.send("Bot is alive");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server attivo sulla porta ${PORT}`);
});

// ===== BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (await handleAddHeroFlow(message)) return;
  if (await handleDeleteHeroFlow(message)) return;
  if (await handleEditHeroFlow(message)) return;
  if (await handleAddGuideFlow(message)) return;
  if (await handleEditGuideFlow(message)) return;
  if (await handleRenameCategoryFlow(message)) return;

  if (!message.content.startsWith(PREFIX)) return;

  const command = message.content.slice(1).trim().toLowerCase();
  if (!command) return;

  if (command === "addhero") return startAddHero(message);
  if (command === "edithero") return startEditHero(message);
  if (command === "deletehero") return startDeleteHero(message);
  if (command === "managehero") return handleManageHero(message);
  if (command === "manageguide") return handleManageGuide(message);
  if (command === "heroes") return handleHeroes(message);
  if (command === "tierlist") return handleTierlist(message);
  if (command === "guide") return handleGuide(message);
  if (command === "syncguides") return handleSyncGuides(message);

  const hero = command;
  const data = heroesData[hero];

  const pdf = findPdf(hero);
  if (!pdf) return;

  const imageFile = findImage(hero);

  const type = data?.type?.toLowerCase() || "default";
  const color = typeColors[type] || typeColors.default;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setImage(imageFile ? `attachment://${hero}.png` : null)
    .addFields(
      { name: "Name", value: hero.charAt(0).toUpperCase() + hero.slice(1) },
      { name: "Role", value: data?.roles?.join(", ") || "Unknown" },
      { name: "Type", value: data?.type || "Unknown" },
      {
        name: "Category",
        value: Array.isArray(data?.category)
          ? data.category.join(", ")
          : data?.category || "Unknown"
      }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`guide_${hero}`)
      .setLabel("GUIDE")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`android_${hero}`)
      .setLabel("ANDROID/PC")
      .setStyle(ButtonStyle.Success)
  );

  const files = [];
  if (imageFile) {
    files.push(
      new AttachmentBuilder(`./images/${imageFile}`, { name: `${hero}.png` })
    );
  }

  await message.reply({
    embeds: [embed],
    components: [row],
    files
  });
});

// ===== INTERACTIONS =====
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    if (
      interaction.customId === "guide_delivery_ios" ||
      interaction.customId === "guide_delivery_chat"
    ) {
      return handleGuideDeliveryButtons(interaction);
    }

    if (interaction.customId.startsWith("android_")) {
      return handleAndroidGuideButton(interaction);
    }

    if (interaction.customId === "guide_add_category_new") {
      return handleAddGuideNewCategory(interaction);
    }

    if (interaction.customId.startsWith("guide_edit_mode_")) {
      return handleEditGuideModeSelection(interaction);
    }

    if (interaction.customId.startsWith("guide_")) {
      return handleGuideButton(interaction);
    }

    if (
      interaction.customId === "manage_addhero" ||
      interaction.customId === "manage_edithero" ||
      interaction.customId === "manage_deletehero"
    ) {
      return handleManageHeroButtons(interaction);
    }

    if (
      interaction.customId === "manage_addguide" ||
      interaction.customId === "manage_editguide" ||
      interaction.customId === "manage_deleteguide" ||
      interaction.customId === "manage_renamecategory" ||
      interaction.customId === "manage_regenpdf"
    ) {
      return handleManageGuideButtons(interaction);
    }
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "tierlist_menu"
  ) {
    return handleTierlistMenu(interaction);
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "guide_add_select_category"
  ) {
    return handleAddGuideCategorySelect(interaction);
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "guide_category_select"
  ) {
    return handleGuideCategoryButtons(interaction);
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "guide_edit_category_select"
  ) {
    return handleEditGuideCategorySelection(interaction);
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId.startsWith("guide_menu_")
  ) {
    return handleGuideMenu(interaction);
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "guide_edit_select_guide"
  ) {
    return handleEditGuideSelection(interaction);
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "guide_rename_category_select"
  ) {
    return handleRenameCategorySelect(interaction);
  }
});

// ===== DEBUG LOGIN =====
client.once("clientReady", () => {
  console.log(`Hero-Dex is online as ${client.user.tag}`);
});

client.on("error", (err) => {
  console.error("Client error:", err);
});

client.on("shardError", (err) => {
  console.error("Shard error:", err);
});

console.log("TOKEN exists:", !!process.env.TOKEN);

client.login(process.env.TOKEN)
  .then(() => {
    console.log("Login request sent");
  })
  .catch((err) => {
    console.error("Login error:", err);
  });
