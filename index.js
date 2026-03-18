const express = require("express");
const app = express();
const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const PREFIX = ".";

app.get("/", (req, res) => {
  res.send("Bot is alive");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server attivo sulla porta ${PORT}`);
});

console.log("Starting Hero-Dex...");
console.log("Token exists?", !!process.env.TOKEN);
console.log("Token length:", process.env.TOKEN ? process.env.TOKEN.length : 0);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Hero-Dex is online as ${client.user.tag}`);
});

client.on("error", (err) => {
  console.error("Client error:", err);
});

client.on("shardError", (err) => {
  console.error("Shard error:", err);
});

function getPdfFiles() {
  try {
    return fs.readdirSync("./pdf").filter(file => file.toLowerCase().endsWith(".pdf"));
  } catch (err) {
    console.log("Cartella pdf non trovata o vuota");
    return [];
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().toLowerCase().split(/ +/);
  const command = args[0];

  if (command === "heroes") {
    const files = getPdfFiles();
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

  const files = getPdfFiles();
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

client.login(process.env.TOKEN)
  .then(() => {
    console.log("Login request sent");
  })
  .catch((err) => {
    console.error("Login error:", err);
  });
