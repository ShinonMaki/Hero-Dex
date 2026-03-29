const { removePremium } = require("../utils/premiumUtils");

const OWNER_ID = process.env.OWNER_ID;

async function handleUnregister(message) {
  if (message.author.id !== OWNER_ID) {
    return message.reply("You are not allowed to use this command.");
  }

  const user = message.mentions.users.first();
  if (!user) {
    return message.reply("Mention a user.");
  }

  removePremium(user.id);

  return message.reply(`❌ ${user.username} removed from premium.`);
}

module.exports = { handleUnregister };
