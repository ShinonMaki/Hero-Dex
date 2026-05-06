require("dotenv").config();

const cron = require("node-cron");

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

// COMMANDS
const { handleHeroes } = require("./commands/heroes");
const { handleTierlist } = require("./commands/tierlist");
const { handleManageHero } = require("./commands/managehero");
const { handleManageGuide } = require("./commands/manageguide");
const { handleGuide } = require("./commands/guide");
const { handleSyncGuides } = require("./commands/syncguides");
const { handleRegister } = require("./commands/register");
const { handleUnregister } = require("./commands/unregister");
const { handleCompare } = require("./commands/compare");
const { handleStart } = require("./commands/start");

// HERO FLOW
const { startAddHero, handleAddHeroFlow } = require("./commands/addhero");
const { startDeleteHero, handleDeleteHeroFlow } = require("./commands/deletehero");
const { startEditHero, handleEditHeroFlow } = require("./commands/edithero");

// GUIDE FLOW
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

// INTERACTIONS
const { handleGuideButton } = require("./interactions/guideButton");
const { handleGuideBack } = require("./interactions/guideBack");
const { handleAndroidGuideButton } = require("./interactions/androidGuideButton");
const { handleManageHeroButtons } = require("./interactions/manageHeroButtons");
const { handleStartButtons } = require("./interactions/startButtons");

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

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

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
  if (command === "register") return handleRegister(message);
  if (command === "unregister") return handleUnregister(message);
  if (command === "compare") return handleCompare(message);
  if (command === "start") return handleStart(message);

  // HERO COMMAND (.rimuru ecc)
  const hero = command;
  const data = heroesData[hero];

  const pdf = findPdf(hero);
  if (!pdf) return;

  const imageFile = findImage(hero);

  const type = data?.type?.toLowerCase() || "default";
  const color = typeColors[type] || typeColors.default;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setThumbnail("attachment://logo.png")
    .setImage(imageFile ? `attachment://${hero}.png` : null)
    .setFooter({ text: "Hero-Dex • YoRHa Guild" })
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
    .setLabel("PREMIUM")
    .setEmoji("💎")
    .setStyle(ButtonStyle.Success),

  new ButtonBuilder()
    .setCustomId(`android_${hero}`)
    .setLabel("GUIDE")
    .setEmoji("📖")
    .setStyle(ButtonStyle.Primary)
);

  const files = [
    new AttachmentBuilder("./images/logo.PNG", { name: "logo.png" })
  ];

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

  // ===== BUTTONS =====
  if (interaction.isButton()) {

    if (interaction.customId.startsWith("start_")) {
      return handleStartButtons(interaction);
    }

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

    if (interaction.customId === "guide_back") {
      return handleGuideBack(interaction);
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

  // ===== SELECT MENUS =====
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "tierlist_menu") {
      return handleTierlistMenu(interaction);
    }

    if (interaction.customId === "guide_add_select_category") {
      return handleAddGuideCategorySelect(interaction);
    }

    if (interaction.customId === "guide_category_select") {
      return handleGuideCategoryButtons(interaction);
    }

    if (interaction.customId === "guide_edit_category_select") {
      return handleEditGuideCategorySelection(interaction);
    }

    if (interaction.customId.startsWith("guide_menu_")) {
      return handleGuideMenu(interaction);
    }

    if (interaction.customId === "guide_edit_select_guide") {
      return handleEditGuideSelection(interaction);
    }

    if (interaction.customId === "guide_rename_category_select") {
      return handleRenameCategorySelect(interaction);
    }
  }
});

// ===== DEBUG LOGIN =====
client.once("clientReady", () => {
  console.log(`Hero-Dex is online as ${client.user.tag}`);

  // Arena Tournament - every 2 days at 22:00
  cron.schedule(
    "0 22 */2 * *",
    async () => {
      const channel = await client.channels.fetch("1434858215245484103");

      if (!channel) return;

      await channel.send({
        content: "<@&1470141312308216080> Arena tournament start"
      });
    },
    {
      timezone: "Europe/Rome"
    }
  );

  // Guild War - Monday, Wednesday, Friday at 13:00
  cron.schedule(
    "0 13 * * 1,3,5",
    async () => {
      const channel = await client.channels.fetch("1434858215245484103");

      if (!channel) return;

      await channel.send({
        content: "<@&1470141312308216080> Guild War start"
      });
    },
    {
      timezone: "Europe/Rome"
    }
  );
});

client.on("error", console.error);
client.on("shardError", console.error);

client.login(process.env.TOKEN);
