const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send("Bot is alive");
});

app.listen(3000, () => {
  console.log("Web server attivo");
});

const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const PREFIX = ".";

client.once("ready", () => {
  console.log("Hero-Dex is online");
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().toLowerCase().split(/ +/);
  const command = args[0];

  if (command === "heroes") {
    const files = fs.readdirSync("./pdf");
    const categories = {};

    files.forEach(file => {
      const name = file.replace(".pdf", "");
      const parts = name.split("_");
      const cats = parts[0].split("+");
      const hero = parts[1];

      cats.forEach(cat => {
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(hero);
      });
    });

    let reply = "**Hero List:**\n";
    for (let cat in categories) {
      reply += `\n__${cat.toUpperCase()}__:\n`;
      reply += categories[cat].map(h => `- ${h}`).join("\n") + "\n";
    }

    message.reply(reply);
  } else {
    const files = fs.readdirSync("./pdf");
    const file = files.find(f => f.toLowerCase().includes(command));

    if (file) {
      message.reply({
        content: `Here is ${command}`,
        files: [`./pdf/${file}`]
      });
    }
  }
});

client.login(process.env.TOKEN);
