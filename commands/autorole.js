const fs = require("fs");
const path = require("path");

async function handleAutorole(message) {
  console.log("AUTOROLE COMMAND CALLED");
  const msg = await message.channel.send(
`## Game Version Selection

React with the versions you play:

🔴 NA
🔵 EU
🟢 RUMBLE

You may select multiple versions.`
  );

  await msg.react("🔴");
  await msg.react("🔵");
  await msg.react("🟢");

  fs.writeFileSync(
    path.join(__dirname, "..", "autorole.json"),
    JSON.stringify({ messageId: msg.id }, null, 2)
  );
}

module.exports = { handleAutorole };
