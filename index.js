const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");

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

// ===== COMANDI =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const command = message.content.slice(1).trim().toLowerCase();

  if (!command) return;

  // ===== HERO LIST =====
  if (command === "heroes") {
    const files = getFiles("./pdf", [".pdf"]);
    const categories = {};

    files.forEach(file => {
      const name = file.replace(".pdf", "");
      const [catsPart, hero] = name.split("_");
      if (!hero) return;

      const cats = catsPart.split("+");

      cats.forEach(cat => {
        if (!categories[cat]) categories[cat] = [];
        if (!categories[cat].includes(hero)) {
          categories[cat].push(hero);
        }
      });
    });

    let reply = "**Hero List:**\n";

    Object.keys(categories).sort().forEach(cat => {
      reply += `\n__${formatFileLabel(cat)}__:\n`;
      reply += categories[cat].sort().map(h => `- ${h}`).join("\n") + "\n";
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

console.log("TOKEN:", process.env.TOKEN);

client.login(process.env.TOKEN)
  .then(() => {
    console.log("Login request sent");
  })
  .catch((err) => {
    console.error("Login error:", err);
  });
