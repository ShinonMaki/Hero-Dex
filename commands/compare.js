const {
  findHeroPdfFile,
  getHeroProfile,
  formatCompareResponse
} = require("../utils/compareUtils");

async function handleCompare(message) {
  const raw = message.content.slice(1).trim();

  const withoutPrefix = raw.replace(/^compare\s+/i, "").trim();
  if (!withoutPrefix) {
    return message.reply("Usage: `.compare hero1 vs hero2`");
  }

  let hero1 = "";
  let hero2 = "";

  if (/\s+vs\s+/i.test(withoutPrefix)) {
    const parts = withoutPrefix.split(/\s+vs\s+/i);
    hero1 = parts[0]?.trim();
    hero2 = parts[1]?.trim();
  } else {
    const parts = withoutPrefix.split(/\s+/);
    hero1 = parts[0]?.trim();
    hero2 = parts.slice(1).join(" ").trim();
  }

  if (!hero1 || !hero2) {
    return message.reply("Usage: `.compare hero1 vs hero2`");
  }

  const file1 = findHeroPdfFile(hero1);
  const file2 = findHeroPdfFile(hero2);

  if (!file1 && !file2) {
    return message.reply("Both heroes were not found in the pdf folder.");
  }

  if (!file1) {
    return message.reply(`Hero not found: ${hero1}`);
  }

  if (!file2) {
    return message.reply(`Hero not found: ${hero2}`);
  }

  await message.reply("Comparing heroes...");

  try {
    const profile1 = await getHeroProfile(hero1);
    const profile2 = await getHeroProfile(hero2);

    if (!profile1 || !profile2) {
      return message.channel.send("Could not analyze one or both heroes.");
    }

    const response = formatCompareResponse(profile1, profile2);

    const chunks = splitLongMessage(response, 1900);

    for (const chunk of chunks) {
      await message.channel.send(chunk);
    }
  } catch (err) {
    console.error("Compare error:", err);
    return message.channel.send("Something went wrong while comparing these heroes.");
  }
}

function splitLongMessage(text, maxLength) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let splitIndex = remaining.lastIndexOf("\n", maxLength);

    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

module.exports = { handleCompare };
