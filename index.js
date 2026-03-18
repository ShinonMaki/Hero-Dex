const express = require("express");
const app = express();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

// ===== PORTA RENDER =====
const PORT = process.env.PORT || 3000;

// ===== WEB SERVER (per Render) =====
app.get("/", (req, res) => {
  res.send("Bot is alive");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server attivo sulla porta ${PORT}`);
});

// ===== DEBUG TOKEN =====
console.log("Starting Hero-Dex...");
console.log("Token exists?", !!process.env.TOKEN);
console.log("Token length:", process.env.TOKEN ? process.env.TOKEN.length : 0);

// ===== DISCORD CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = ".";

// ===== BOT ONLINE =====
client.once("ready", () => {
  console.log(`Hero-Dex is online as ${client.user.tag}`);
});

// ===== ERROR HANDLING =====
client.on("error", (err) => {
  console.error("Client error:", err);
});

client.on("shardError", (err) => {
  console.error("Shard error:", err);
});

// ===== COMANDI =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().toLowerCase().split(/ +/);
  const command = args[0];

  // ===== LISTA HEROES =====
  if (command === "heroes") {
    const files = fs.readdirSync("./pdf").filter(f => f.endsWith(".pdf"));
    const categories = {};

    files.forEach(file => {
      const name = file.replace(".pdf", "");
      const parts = name.split("_");
      const cats = parts[0].split("+");
      const hero = parts[1];

      if (!hero) return;

      cats.forEach(cat => {
        if (!categories[cat]) categories[cat] = [];
        if (!categories[cat].includes(hero)) {
          categories[cat].push(hero);
        }
      });
    });

    let reply = "**Hero List:**\n";

    for (const cat in categories) {
      reply += `\n__${cat.toUpperCase()}__:\n`;
      reply += categories[cat].map(h => `- ${h}`).join("\n") + "\n";
    }

    if (reply === "**Hero List:**\n") {
      reply = "No heroes found.";
    }

    message.reply(reply);
    return;
  }

  // ===== CERCA HERO =====
  const files = fs.readdirSync("./pdf").filter(f => f.endsWith(".pdf"));
  const file = files.find(f => f.toLowerCase().includes(command));

  if (file) {
    message.reply({
      content: `Here is ${command}`,
      files: [`./pdf/${file}`]
    });
  } else {
    message.reply("Hero not found.");
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN)
  .then(() => {
    console.log("Login request sent");
  })
  .catch((err) => {
    console.error("Login error:", err);
  });
