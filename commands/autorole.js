async function handleAutorole(message) {
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
}

module.exports = { handleAutorole };
