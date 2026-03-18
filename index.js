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
  ButtonStyle
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

client.once("clientReady", () => {
  console.log(`Hero-Dex is online as ${client.user.tag}`);
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

// ===== COMANDI =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const command = message.content.slice(1).trim().toLowerCase();

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
      reply += `\n__${cat.toUpperCase()}__:\n`;
      reply += categories[cat].sort().map(h => `- ${h}`).join("\n") + "\n";
    });

    return message.reply(reply || "No heroes found.");
  }

  const hero = command;
  const data = heroesData[hero];

  const pdf = findPdf(hero);
  if (!pdf) return message.reply("Hero not found.");

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
      { name: "Category", value: data?.category || "Unknown" }
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

// ===== BUTTON CLICK =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith("guide_")) {
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
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
