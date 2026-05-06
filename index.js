require("dotenv").config();

const cron = require("node-cron");

const express = require("express");
const app = express();

app.use(express.json());

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

const UPDATE_CHANNEL_ID = "1501589076019511476";
const EVENT_CHANNEL_ID = "1434858215245484103";
const EVENT_ROLE_ID = "1470141312308216080";

const RESTRICTED_GUILD_ID = "1434845553815982104";
const ALLOWED_COMMAND_CHANNEL_ID = "1501588339776815144";

// ===== BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== SERVER =====
app.get("/", (req, res) => {
  res.send("Bot is alive");
});

// ===== GITHUB WEBHOOK =====
app.post("/github-webhook", async (req, res) => {
  try {
    const commits = req.body.commits ?? [];

    if (commits.length === 0) {
      return res.sendStatus(200);
    }

    const channel = await client.channels.fetch(UPDATE_CHANNEL_ID).catch(() => null);

    if (!channel) {
      return res.sendStatus(200);
    }

    const description = commits
      .map(commit => `• ${commit.message}`)
      .slice(0, 10)
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0xFF2D95)
      .setTitle("📢 Hero-Dex Update")
      .setThumbnail("attachment://logo.png")
      .setDescription(description)
      .setFooter({ text: "Hero-Dex • YoRHa Guild" })
      .setTimestamp();

    await channel.send({
      embeds: [embed],
      files: [
        new AttachmentBuilder("./images/logo.PNG", {
          name: "logo.png"
        })
      ]
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("GitHub webhook error:", err);
    return res.sendStatus(500);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server attivo sulla porta ${PORT}`);
});

function isWrongCommandChannel(context) {
  return (
    context.guild?.id === RESTRICTED_GUILD_ID &&
    context.channel?.id !== ALLOWED_COMMAND_CHANNEL_ID
  );
}

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (isWrongCommandChannel(message)) return;

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

  // HERO COMMAND
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
      {
        name: "Name",
        value: hero.charAt(0).toUpperCase() + hero.slice(1)
      },
      {
        name: "Role",
        value: data?.roles?.join(", ") || "Unknown"
      },
      {
        name: "Type",
        value: data?.type || "Unknown"
      },
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
    new AttachmentBuilder("./images/logo.PNG", {
      name: "logo.png"
    })
  ];

  if (imageFile) {
    files.push(
      new AttachmentBuilder(`./images/${imageFile}`, {
        name: `${hero}.png`
      })
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
  if (isWrongCommandChannel(interaction)) {
    if (interaction.isRepliable()) {
      return interaction.reply({
        content: `<#${ALLOWED_COMMAND_CHANNEL_ID}> Use the bot commands in this channel.`,
        ephemeral: true
      }).catch(() => {});
    }

    return;
  }

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

function isInitialRealmWeek() {
  const now = new Date();

  const romeDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Rome" })
  );

  const year = romeDate.getFullYear();
  const month = romeDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();

  const daysUntilTuesday = (2 - firstDayOfWeek + 7) % 7;
  const firstTuesday = new Date(year, month, 1 + daysUntilTuesday);

  const day = romeDate.getDate();
  const firstTuesdayDate = firstTuesday.getDate();

  return day >= firstTuesdayDate && day <= firstTuesdayDate + 2;
}

// ===== DEBUG LOGIN =====
client.once("clientReady", () => {
  console.log(`Hero-Dex is online as ${client.user.tag}`);

  // Arena Tournament
  cron.schedule(
    "0 22 */2 * *",
    async () => {
      const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
      if (!channel) return;

      await channel.send({
        content: `<@&${EVENT_ROLE_ID}> Arena tournament start`
      });
    },
    { timezone: "Europe/Rome" }
  );

  // Guild War
  cron.schedule(
    "0 13 * * 1,3,5",
    async () => {
      const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
      if (!channel) return;

      await channel.send({
        content: `<@&${EVENT_ROLE_ID}> Guild War start`
      });
    },
    { timezone: "Europe/Rome" }
  );

  // Holy Domain Duel
  cron.schedule(
    "0 13 * * 0",
    async () => {
      const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
      if (!channel) return;

      await channel.send({
        content: `<@&${EVENT_ROLE_ID}> Holy Domain Duel`
      });
    },
    { timezone: "Europe/Rome" }
  );

  // Hall of Heroes
  cron.schedule(
    "0 13 * * 1",
    async () => {
      const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
      if (!channel) return;

      await channel.send({
        content: `<@&${EVENT_ROLE_ID}> Hall of Heroes`
      });
    },
    { timezone: "Europe/Rome" }
  );

  // Initial Realm
  cron.schedule(
    "0 11 * * 2,3,4",
    async () => {
      if (!isInitialRealmWeek()) return;

      const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
      if (!channel) return;

      await channel.send({
        content: `<@&${EVENT_ROLE_ID}> Initial Realm start`
      });
    },
    { timezone: "Europe/Rome" }
  );

  // Ancient Battlefield
  cron.schedule(
    "0 20 * * 2,3,4",
    async () => {
      if (!isInitialRealmWeek()) return;

      const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
      if (!channel) return;

      await channel.send({
        content: `<@&${EVENT_ROLE_ID}> Ancient Battlefield start`
      });
    },
    { timezone: "Europe/Rome" }
  );
});

client.on("error", console.error);
client.on("shardError", console.error);

client.login(process.env.TOKEN);
