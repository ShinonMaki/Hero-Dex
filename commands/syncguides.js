const { syncGuides } = require("../utils/syncGuides");
const { gitCommitAndPush } = require("../utils/gitUtils");

async function handleSyncGuides(message) {
  await message.reply("Syncing guides...");

  const updated = await syncGuides();

  gitCommitAndPush("Sync guides images + regenerate PDFs");

  return message.channel.send(
    `Done. Updated guides: ${updated}`
  );
}

module.exports = { handleSyncGuides };
