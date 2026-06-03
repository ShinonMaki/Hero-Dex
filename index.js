require("dotenv").config();

const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

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
  ButtonStyle,
  StringSelectMenuBuilder
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
const { startAddNotify, handleAddNotifyFlow } = require("./commands/addnotify");
const { startNotificationRunner } = require("./utils/notificationRunner");
const { handleCalendar } = require("./commands/calendar");
const { handleRules } = require("./commands/rules");

const { bonusSessions } = require("./sessions/bonusSessions");
const heroBonusScores = require("./data/heroBonusScores.json");

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
  handleSuggestionButton,
  handleSuggestionMessage,
  handleSuggestionDone
} = require("./interactions/suggestionButton");

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

// ===== BONUS HELPERS =====
const bonusNames = {
  atk: "ATK",
  hp: "HP",
  hpRegen: "HP Regen per Second",
  hitRate: "Hit Rate",
  dodge: "Dodge",
  hpBonus: "HP Bonus %",
  atkBonus: "ATK Bonus %",
  critReduction: "CRIT Reduction",
  critDmg: "CRIT DMG",
  dmgReduction: "DMG Reduction",
  dmgBonus: "DMG Bonus"
};

const clothesEmojis = {
  aries: "♈",
  taurus: "♉",
  gemini: "♊",
  cancer: "♋",
  leo: "♌",
  virgo: "♍",
  libra: "♎",
  scorpio: "♏",
  sagittarius: "♐",
  capricorn: "♑",
  aquarius: "♒",
  aqua: "♒",
  pisces: "♓"
};

function formatHeroName(hero) {
  return hero.charAt(0).toUpperCase() + hero.slice(1);
}

function formatBuildName(build) {
  return build.charAt(0).toUpperCase() + build.slice(1);
}

function formatBonusList(pieceData) {
  return Object.entries(pieceData)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => `• **${bonusNames[key] || key}**: ${value}/10`)
    .join("\n");
}

function buildBonusEmbed(hero, build) {
  const heroData = heroBonusScores[hero];
  const buildData = heroData?.[build];

  if (!buildData) return null;

  const emoji = clothesEmojis[build] || "⚙️";

  return new EmbedBuilder()
    .setColor(0xFF2D95)
    .setTitle(`${emoji} ${formatHeroName(hero)} • ${formatBuildName(build)}`)
    .setDescription(`**Build Type:** ${buildData.label}`)
    .addFields(
      {
        name: "⚔ Weapon",
        value: formatBonusList(buildData.weapon),
        inline: false
      },
      {
        name: "🛡 Armor",
        value: formatBonusList(buildData.armor),
        inline: false
      },
      {
        name: "👑 Helm",
        value: formatBonusList(buildData.helm),
        inline: false
      },
      {
        name: "📿 Accessory",
        value: formatBonusList(buildData.accessory),
        inline: false
      },
      {
        name: "Legend",
        value:
          "10 = Must Have\n8-9 = Very Strong\n6-7 = Good\n4-5 = Situational\n1-3 = Low Value",
        inline: false
      }
    )
    .setFooter({ text: "Hero-Dex • Bonus Build System" })
    .setTimestamp();
}

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

    const visibleCommits = commits.filter(commit => {
      const message = commit.message?.toLowerCase() || "";

      return (
        !message.includes("update notifications") &&
        !message.includes("[skip notify]")
      );
    });

    if (visibleCommits.length === 0) {
      return res.sendStatus(200);
    }

    const channel = await client.channels.fetch(UPDATE_CHANNEL_ID).catch(() => null);

    if (!channel) {
      return res.sendStatus(200);
    }

    const description = visibleCommits
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

  // ===== BONUS BUILD FLOW =====
  const bonusSession = bonusSessions.get(message.author.id);

  if (bonusSession?.step === "hero") {
    const hero = message.content.trim().toLowerCase();

    if (!heroBonusScores[hero]) {
      return message.reply("Hero not found. Please try again.\nExample: `lux`");
    }

    const heroData = heroBonusScores[hero];

    const options = Object.entries(heroData).map(([build, data]) => {
      const emoji = clothesEmojis[build];

      return {
        label: `${formatBuildName(build)} • ${data.label}`,
        value: `${hero}__${build}`,
        emoji: emoji || undefined
      };
    });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`bonus_build_select_${message.author.id}`)
        .setPlaceholder("Select a build")
        .addOptions(options)
    );

    bonusSessions.delete(message.author.id);

    return message.reply({
      content: `Available builds for **${formatHeroName(hero)}**:`,
      components: [row]
    });
  }

  if (await handleSuggestionMessage(message)) return;

  if (await handleAddHeroFlow(message)) return;
  if (await handleDeleteHeroFlow(message)) return;
  if (await handleEditHeroFlow(message)) return;
  if (await handleAddGuideFlow(message)) return;
  if (await handleEditGuideFlow(message)) return;
  if (await handleRenameCategoryFlow(message)) return;
  if (await handleAddNotifyFlow(message)) return;

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
  if (command === "addnotify") return startAddNotify(message);
  if (command === "calendar") return handleCalendar(message);
  if (command === "rules") return handleRules(message);

  // HERO COMMAND
  const hero = command;
  const data = heroesData[hero];

  const pdf = findPdf(hero);
  if (!pdf) return;

  const imageFile = findImage(hero);

  // ===== HERO LOGO SYSTEM =====
  const logoExtensions = [".png", ".jpg", ".jpeg", ".webp"];

  let heroLogoPath = null;

  for (const ext of logoExtensions) {
    const possiblePath = `./logos/${hero}_logo${ext}`;

    if (fs.existsSync(possiblePath)) {
      heroLogoPath = possiblePath;
      break;
    }
  }

  const fallbackLogoPath = "./images/logo.PNG";
  const hasHeroLogo = !!heroLogoPath;

  const logoAttachmentName = hasHeroLogo
    ? path.basename(heroLogoPath)
    : "logo.png";

  const logoAttachmentPath = hasHeroLogo
    ? heroLogoPath
    : fallbackLogoPath;

  // ===== HERO VOICE SYSTEM =====
  const voicePath = `./voices/${hero}.mp3`;
  const hasVoice = fs.existsSync(voicePath);

  const type = data?.type?.toLowerCase() || "default";
  const color = typeColors[type] || typeColors.default;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setThumbnail(`attachment://${logoAttachmentName}`)
    .setImage(imageFile ? `attachment://${hero}.png` : null)
    .setFooter({ text: "Hero-Dex • YoRHa Guild" })
    .addFields(
      {
        name: "Name",
        value: hero.charAt(0).toUpperCase() + hero.slice(1)
      },
      {
        name: "From",
        value: data?.from || "Unknown"
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
    new AttachmentBuilder(logoAttachmentPath, {
      name: logoAttachmentName
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

  if (hasVoice) {
    await message.channel.send({
      files: [
        new AttachmentBuilder(voicePath, {
          name: `${hero}.mp3`
        })
      ]
    });
  }
});

// ===== INTERACTIONS =====
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === "rules_accept") {
  const member = interaction.guild.members.cache.get(interaction.user.id);

  if (!member) {
    return interaction.reply({
      content: "Member not found.",
      ephemeral: true
    });
  }

  if (member.roles.cache.has("1511657776139604138")) {
    return interaction.reply({
      content: "You already have access to the server.",
      ephemeral: true
    });
  }

  await member.roles.add("1511657776139604138");

  return interaction.reply({
    content: "Welcome to the server!",
    ephemeral: true
  });
}
    if (interaction.customId.startsWith("suggestion_done_")) {
      return handleSuggestionDone(interaction);
    }
  }

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
    if (interaction.customId === "start_bonus") {
      bonusSessions.set(interaction.user.id, {
        step: "hero"
      });

      await interaction.reply({
        content:
          "Which hero do you want to check bonuses for?\nExample: `lux`",
        ephemeral: true
      });

      return;
    }

    if (interaction.customId === "start_suggestion") {
      return handleSuggestionButton(interaction);
    }

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
    if (interaction.customId.startsWith("bonus_build_select_")) {
      const allowedUserId = interaction.customId.replace("bonus_build_select_", "");

      if (interaction.user.id !== allowedUserId) {
        return interaction.reply({
          content: "This bonus menu is not for you.",
          ephemeral: true
        });
      }

      const [hero, build] = interaction.values[0].split("__");
      const embed = buildBonusEmbed(hero, build);

      if (!embed) {
        return interaction.reply({
          content: "Bonus build not found.",
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [embed],
        ephemeral: false
      });
    }

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
    
});

function isInitialRealmPeriod() {
  const startDate = new Date("2026-05-05T00:00:00");

  const now = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Europe/Rome"
    })
  );

  const diffDays = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return false;

  const cycleDay = diffDays % 28;

  return cycleDay >= 0 && cycleDay <= 2;
}

// ===== DEBUG LOGIN =====
client.once("clientReady", () => {
  console.log(`Hero-Dex is online as ${client.user.tag}`);

  startNotificationRunner(client);

  // Arena Tournament - every 3 days starting from 2026-05-06
  cron.schedule("0 22 * * *", async () => {
    const startDate = new Date("2026-05-06T00:00:00");

    const now = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Europe/Rome"
      })
    );

    const diffDays = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays % 3 !== 0) return;

    const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
    if (!channel) return;

    await channel.send({
      content: `<@&${EVENT_ROLE_ID}> Arena tournament start`
    });
  }, { timezone: "Europe/Rome" });

  // Guild War
  cron.schedule("0 13 * * 1,3,5", async () => {
    const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
    if (!channel) return;

    await channel.send({
      content: `<@&${EVENT_ROLE_ID}> Guild War start`
    });
  }, { timezone: "Europe/Rome" });

  // Holy Domain Duel
  cron.schedule("0 13 * * 0", async () => {
    const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
    if (!channel) return;

    await channel.send({
      content: `<@&${EVENT_ROLE_ID}> Holy Domain Duel`
    });
  }, { timezone: "Europe/Rome" });

  // Hall of Heroes
  cron.schedule("0 13 * * 1", async () => {
    const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
    if (!channel) return;

    await channel.send({
      content: `<@&${EVENT_ROLE_ID}> Hall of Heroes`
    });
  }, { timezone: "Europe/Rome" });

  // Initial Realm - every 28 days, active for 3 days at 11:00
  cron.schedule("0 11 * * 2,3,4", async () => {
    if (!isInitialRealmPeriod()) return;

    const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
    if (!channel) return;

    await channel.send({
      content: `<@&${EVENT_ROLE_ID}> Initial Realm start`
    });
  }, { timezone: "Europe/Rome" });

  // Ancient Battlefield - every 28 days, active for 3 days at 20:00
  cron.schedule("0 20 * * 2,3,4", async () => {
    if (!isInitialRealmPeriod()) return;

    const channel = await client.channels.fetch(EVENT_CHANNEL_ID);
    if (!channel) return;

    await channel.send({
      content: `<@&${EVENT_ROLE_ID}> Ancient Battlefield start`
    });
  }, { timezone: "Europe/Rome" });
});

client.on("error", console.error);
client.on("shardError", console.error);

client.login(process.env.TOKEN);
