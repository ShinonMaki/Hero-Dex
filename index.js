require("dotenv").config();

const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

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

const heroesData = require("./heroes.json");

const PORT = process.env.PORT || 3000;
const PREFIX = ".";

// ===== HERO SESSIONS =====
const heroCreationSessions = new Map();
const heroDeleteSessions = new Map();
const heroEditSessions = new Map();

// ===== SERVER =====
app.get("/", (req, res) => {
  res.send("Bot is alive");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server attivo sulla porta ${PORT}`);
});

// ===== COLORI TYPE =====
const typeColors = {
  truth: 0x2ecc71,
  order: 0x3498db,
  combat: 0xe74c3c,
  light: 0xf1c40f,
  dark: 0x8e44ad,
  chaos: 0x7f8c8d,
  default: 0x95a5a6
};

// ===== BOT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== FUNZIONI FILE =====
function getFiles(folder, exts) {
  try {
    return fs.readdirSync(folder).filter(file =>
      exts.includes(path.extname(file).toLowerCase())
    );
  } catch {
    return [];
  }
}

function ensureDir(folder) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

function findPdf(hero) {
  const files = getFiles("./pdf", [".pdf"]);
  return files.find(f =>
    path.basename(f, ".pdf").toLowerCase().endsWith(`_${hero}`) ||
    path.basename(f, ".pdf").toLowerCase() === hero
  );
}

function findImage(hero) {
  const files = getFiles("./images", [".png", ".jpg", ".jpeg", ".webp"]);
  return files.find(f =>
    path.parse(f).name.toLowerCase() === hero
  );
}

function getTierlistFiles() {
  return getFiles("./tierlist", [".png", ".jpg", ".jpeg", ".webp", ".pdf"]);
}

function formatFileLabel(text) {
  return text
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function saveHeroesJson() {
  fs.writeFileSync("./heroes.json", JSON.stringify(heroesData, null, 2));
}

async function downloadAttachment(url, destinationPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destinationPath, Buffer.from(arrayBuffer));
}

// ===== COMANDI =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ===== HERO CREATION FLOW =====
  if (heroCreationSessions.has(message.author.id)) {
    const session = heroCreationSessions.get(message.author.id);

    if (message.content.trim().toLowerCase() === ".cancelhero") {
      heroCreationSessions.delete(message.author.id);
      return message.reply("Hero creation cancelled.");
    }

    try {
      // STEP 1 - NAME
      if (session.step === 1) {
        const heroName = message.content.trim().toLowerCase();

        if (!heroName) {
          return message.reply("Hero name?");
        }

        session.data.name = heroName;
        session.step = 2;
        return message.reply("Hero role?");
      }

      // STEP 2 - ROLE
      if (session.step === 2) {
        const roles = message.content
          .split(",")
          .map(r => r.trim())
          .filter(Boolean);

        if (roles.length === 0) {
          return message.reply("Hero role?");
        }

        session.data.roles = roles;
        session.step = 3;
        return message.reply("Hero type?");
      }

      // STEP 3 - TYPE
      if (session.step === 3) {
        const type = message.content.trim();

        if (!type) {
          return message.reply("Hero type?");
        }

        session.data.type = type;
        session.step = 4;
        return message.reply("Hero category?");
      }

      // STEP 4 - CATEGORY
      if (session.step === 4) {
        const raw = message.content.trim();

        if (!raw) {
          return message.reply("Hero category?");
        }

        const categories = raw
          .split(";")
          .map(c => c.trim())
          .filter(Boolean);

        session.data.category = categories.length === 1 ? categories[0] : categories;
        session.step = 5;
        return message.reply("Hero image? Please send the image file.");
      }

      // STEP 5 - IMAGE
      if (session.step === 5) {
        if (message.attachments.size === 0) {
          return message.reply("Hero image? Please send the image file.");
        }

        const attachment = message.attachments.first();
        const ext = path.extname(attachment.name || "").toLowerCase();

        if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
          return message.reply("Please send a valid image file (.png, .jpg, .jpeg, .webp).");
        }

        ensureDir("./images");
        const imagePath = `./images/${session.data.name}${ext}`;
        await downloadAttachment(attachment.url, imagePath);

        session.step = 6;
        return message.reply("Hero PDF? Please send the PDF file.");
      }

      // STEP 6 - PDF
      if (session.step === 6) {
        if (message.attachments.size === 0) {
          return message.reply("Hero PDF? Please send the PDF file.");
        }

        const attachment = message.attachments.first();
        const ext = path.extname(attachment.name || "").toLowerCase();

        if (ext !== ".pdf") {
          return message.reply("Please send a valid PDF file.");
        }

        ensureDir("./pdf");
        const pdfPath = `./pdf/${session.data.name}.pdf`;
        await downloadAttachment(attachment.url, pdfPath);

        heroesData[session.data.name] = {
          roles: session.data.roles,
          type: session.data.type,
          category: session.data.category
        };

        saveHeroesJson();

        const heroName = session.data.name;
        heroCreationSessions.delete(message.author.id);

        exec(
          `cd /root/Hero-Dex && git add heroes.json images pdf && git commit -m "Add hero: ${heroName}" && git push`,
          (err, stdout, stderr) => {
            if (err) {
              console.error("Git push error:", err);
              console.error(stderr);
              return;
            }

            console.log("Git push success:");
            console.log(stdout);
          }
        );

        return message.reply(`Hero added successfully: ${formatFileLabel(heroName)}`);
      }
    } catch (err) {
      console.error("Add hero flow error:", err);
      heroCreationSessions.delete(message.author.id);
      return message.reply("Something went wrong while creating the hero.");
    }
  }

  // ===== HERO DELETE FLOW =====
  if (heroDeleteSessions.has(message.author.id)) {
    const session = heroDeleteSessions.get(message.author.id);
    const content = message.content.trim().toLowerCase();

    if (content === ".canceldelete") {
      heroDeleteSessions.delete(message.author.id);
      return message.reply("Hero deletion cancelled.");
    }

    try {
      // STEP 1 - NAME
      if (session.step === 1) {
        const hero = content;

        if (!heroesData[hero]) {
          return message.reply("Hero not found. Try again.");
        }

        session.hero = hero;
        session.step = 2;

        return message.reply(`Are you sure you want to delete **${formatFileLabel(hero)}**? (yes/no)`);
      }

      // STEP 2 - CONFIRM
      if (session.step === 2) {
        if (content !== "yes") {
          heroDeleteSessions.delete(message.author.id);
          return message.reply("Deletion cancelled.");
        }

        const hero = session.hero;

        delete heroesData[hero];
        saveHeroesJson();

        const imageFile = findImage(hero);
        if (imageFile) {
          fs.unlinkSync(`./images/${imageFile}`);
        }

        const pdfFile = findPdf(hero);
        if (pdfFile) {
          fs.unlinkSync(`./pdf/${pdfFile}`);
        }

        heroDeleteSessions.delete(message.author.id);

        exec(
          `cd /root/Hero-Dex && git add heroes.json images pdf && git commit -m "Delete hero: ${hero}" && git push`,
          (err, stdout, stderr) => {
            if (err) {
              console.error("Git delete push error:", err);
              console.error(stderr);
              return;
            }

            console.log("Git delete push success:");
            console.log(stdout);
          }
        );

        return message.reply(`Hero deleted successfully: ${formatFileLabel(hero)}`);
      }
    } catch (err) {
      console.error("Delete hero error:", err);
      heroDeleteSessions.delete(message.author.id);
      return message.reply("Something went wrong while deleting the hero.");
    }
  }

  // ===== HERO EDIT FLOW =====
  if (heroEditSessions.has(message.author.id)) {
    const session = heroEditSessions.get(message.author.id);
    const content = message.content.trim();

    if (content.toLowerCase() === ".canceledit") {
      heroEditSessions.delete(message.author.id);
      return message.reply("Hero edit cancelled.");
    }

    try {
      // STEP 1 - NAME
      if (session.step === 1) {
        const hero = content.toLowerCase();

        if (!heroesData[hero]) {
          return message.reply("Hero not found. Try again.");
        }

        session.hero = hero;
        session.step = 2;

        return message.reply("What do you want to edit? (role/type/category/image/pdf)");
      }

      // STEP 2 - FIELD
      if (session.step === 2) {
        const field = content.toLowerCase();

        if (!["role", "type", "category", "image", "pdf"].includes(field)) {
          return message.reply("Choose: role/type/category/image/pdf");
        }

        session.field = field;
        session.step = 3;

        if (field === "image") {
          return message.reply("Send new image file.");
        }

        if (field === "pdf") {
          return message.reply("Send new PDF file.");
        }

        return message.reply(`New ${field}?`);
      }

      // STEP 3 - APPLY
      if (session.step === 3) {
        const hero = session.hero;
        const field = session.field;

        if (field === "role") {
          const roles = content
            .split(",")
            .map(r => r.trim())
            .filter(Boolean);

          heroesData[hero].roles = roles;
        }

        if (field === "type") {
          heroesData[hero].type = content;
        }

        if (field === "category") {
          const categories = content
            .split(";")
            .map(c => c.trim())
            .filter(Boolean);

          heroesData[hero].category =
            categories.length === 1 ? categories[0] : categories;
        }

        if (field === "image") {
          if (message.attachments.size === 0) {
            return message.reply("Send image file.");
          }

          const attachment = message.attachments.first();
          const ext = path.extname(attachment.name || "").toLowerCase();

          if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
            return message.reply("Invalid image.");
          }

          const old = findImage(hero);
          if (old) {
            fs.unlinkSync(`./images/${old}`);
          }

          const imagePath = `./images/${hero}${ext}`;
          await downloadAttachment(attachment.url, imagePath);
        }

        if (field === "pdf") {
          if (message.attachments.size === 0) {
            return message.reply("Send PDF file.");
          }

          const attachment = message.attachments.first();
          const ext = path.extname(attachment.name || "").toLowerCase();

          if (ext !== ".pdf") {
            return message.reply("Invalid PDF.");
          }

          const old = findPdf(hero);
          if (old) {
            fs.unlinkSync(`./pdf/${old}`);
          }

          const pdfPath = `./pdf/${hero}.pdf`;
          await downloadAttachment(attachment.url, pdfPath);
        }

        saveHeroesJson();
        heroEditSessions.delete(message.author.id);

        exec(
          `cd /root/Hero-Dex && git add heroes.json images pdf && git commit -m "Edit hero: ${hero}" && git push`,
          (err, stdout, stderr) => {
            if (err) {
              console.error("Git edit push error:", err);
              console.error(stderr);
              return;
            }

            console.log("Git edit push success:");
            console.log(stdout);
          }
        );

        return message.reply(`Hero updated: ${formatFileLabel(hero)}`);
      }
    } catch (err) {
      console.error("Edit hero error:", err);
      heroEditSessions.delete(message.author.id);
      return message.reply("Error editing hero.");
    }
  }

  if (!message.content.startsWith(PREFIX)) return;

  const command = message.content.slice(1).trim().toLowerCase();

  if (!command) return;

  // ===== ADD HERO START =====
  if (command === "addhero") {
    if (heroCreationSessions.has(message.author.id)) {
      return message.reply("You are already creating a hero.");
    }

    heroCreationSessions.set(message.author.id, {
      step: 1,
      data: {}
    });

    return message.reply("Hero name?");
  }

  // ===== EDIT HERO START =====
  if (command === "edithero") {
    if (heroEditSessions.has(message.author.id)) {
      return message.reply("You are already editing a hero.");
    }

    heroEditSessions.set(message.author.id, {
      step: 1,
      hero: null,
      field: null
    });

    return message.reply("Hero name?");
  }

  // ===== DELETE HERO START =====
  if (command === "deletehero") {
    if (heroDeleteSessions.has(message.author.id)) {
      return message.reply("You are already deleting a hero.");
    }

    heroDeleteSessions.set(message.author.id, {
      step: 1,
      hero: null
    });

    return message.reply("Hero name?");
  }

  // ===== MANAGE HERO =====
  if (command === "managehero") {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Hero Management")
      .setDescription("Choose an action below.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("manage_addhero")
        .setLabel("Add Hero")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("manage_edithero")
        .setLabel("Edit Hero")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("manage_deletehero")
        .setLabel("Delete Hero")
        .setStyle(ButtonStyle.Danger)
    );

    return message.reply({
      embeds: [embed],
      components: [row]
    });
  }

  // ===== HERO LIST (FROM JSON TYPE) =====
  if (command === "heroes") {
    const types = {};

    Object.entries(heroesData).forEach(([heroName, data]) => {
      const heroType = data?.type;

      if (!heroType) return;

      if (!types[heroType]) {
        types[heroType] = [];
      }

      if (!types[heroType].includes(heroName)) {
        types[heroType].push(heroName);
      }
    });

    let reply = "**Hero List:**\n";

    Object.keys(types).sort().forEach(type => {
      reply += `\n__${formatFileLabel(type)}__:\n`;
      reply += types[type]
        .sort()
        .map(h => `- ${formatFileLabel(h)}`)
        .join("\n") + "\n";
    });

    return message.reply(reply || "No heroes found.");
  }

  // ===== TIERLIST =====
  if (command === "tierlist") {
    const tierlistFiles = getTierlistFiles();

    if (tierlistFiles.length === 0) {
      return message.reply("No tierlists found.");
    }

    const tierlistNames = tierlistFiles.map(file =>
      formatFileLabel(path.parse(file).name)
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("📊 Tierlist Hub")
      .setDescription("Choose a tierlist from the menu below.")
      .addFields({
        name: "Available Tierlists",
        value: tierlistNames.map(name => `• ${name}`).join("\n")
      })
      .setFooter({ text: "Hero-Dex System" });

    const options = tierlistFiles.slice(0, 25).map(file => {
      const name = path.parse(file).name;
      return {
        label: formatFileLabel(name).slice(0, 100),
        value: name
      };
    });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("tierlist_menu")
        .setPlaceholder("Choose a tierlist")
        .addOptions(options)
    );

    return message.reply({
      embeds: [embed],
      components: [row]
    });
  }

  // ===== HERO CARD =====
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
      .setStyle(ButtonStyle.Primary)
  );

  const files = [];
  if (imageFile) {
    files.push(new AttachmentBuilder(`./images/${imageFile}`, { name: `${hero}.png` }));
  }

  await message.reply({
    embeds: [embed],
    components: [row],
    files
  });
});

// ===== INTERAZIONI =====
client.on("interactionCreate", async (interaction) => {
  // ===== MANAGE HERO BUTTONS =====
  if (interaction.isButton()) {
    if (interaction.customId === "manage_addhero") {
      if (heroCreationSessions.has(interaction.user.id)) {
        return interaction.reply({
          content: "You are already creating a hero.",
          ephemeral: true
        });
      }

      heroCreationSessions.set(interaction.user.id, {
        step: 1,
        data: {}
      });

      return interaction.reply({
        content: "Hero name?",
        ephemeral: true
      });
    }

    if (interaction.customId === "manage_edithero") {
      if (heroEditSessions.has(interaction.user.id)) {
        return interaction.reply({
          content: "You are already editing a hero.",
          ephemeral: true
        });
      }

      heroEditSessions.set(interaction.user.id, {
        step: 1,
        hero: null,
        field: null
      });

      return interaction.reply({
        content: "Hero name?",
        ephemeral: true
      });
    }

    if (interaction.customId === "manage_deletehero") {
      if (heroDeleteSessions.has(interaction.user.id)) {
        return interaction.reply({
          content: "You are already deleting a hero.",
          ephemeral: true
        });
      }

      heroDeleteSessions.set(interaction.user.id, {
        step: 1,
        hero: null
      });

      return interaction.reply({
        content: "Hero name?",
        ephemeral: true
      });
    }
  }

  // ===== GUIDE BUTTON =====
  if (interaction.isButton() && interaction.customId.startsWith("guide_")) {
    const hero = interaction.customId.replace("guide_", "");

    try {
      await interaction.deferReply({ ephemeral: true });

      const pdf = findPdf(hero);

      if (!pdf) {
        return interaction.editReply({
          content: "Guide not found."
        });
      }

      return interaction.editReply({
        content: `Guide for ${hero}`,
        files: [`./pdf/${pdf}`]
      });
    } catch (err) {
      console.error("Guide button error:", err);
    }

    return;
  }

  // ===== TIERLIST MENU =====
  if (interaction.isStringSelectMenu() && interaction.customId === "tierlist_menu") {
    const selected = interaction.values[0];
    const tierlistFiles = getTierlistFiles();

    const selectedFile = tierlistFiles.find(file => path.parse(file).name === selected);

    try {
      await interaction.deferReply({ ephemeral: true });

      if (!selectedFile) {
        return interaction.editReply({
          content: "Tierlist not found."
        });
      }

      return interaction.editReply({
        content: formatFileLabel(selected),
        files: [`./tierlist/${selectedFile}`]
      });
    } catch (err) {
      console.error("Tierlist menu error:", err);
    }
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
