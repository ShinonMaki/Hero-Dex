const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

async function handleRules(message) {
  const embed = new EmbedBuilder()
    .setColor(0xFF2D95)
    .setTitle("📜 Rules & Community Guidelines")
    .setDescription(
`Welcome to the server!

To ensure a friendly and enjoyable environment for everyone, please follow these rules:

**1. Respect Everyone**

Treat all members with respect. Harassment, discrimination, hate speech, personal attacks, or toxic behavior will not be tolerated.

**2. No Drama**

Avoid creating unnecessary conflicts, arguments, or public disputes. If you have an issue, contact a staff member.

**3. Keep It Appropriate**

Do not share NSFW, offensive, illegal, or disturbing content.

**4. No Spam**

Avoid excessive messages, repeated content, unnecessary mentions, or disruptive behavior.

**5. Use Channels Correctly**

Please use the appropriate channels for their intended purpose to keep the server organized.

**6. No Scams or Malicious Content**

Do not share malicious links, scams, phishing attempts, cheats, exploits, or anything that may harm other members.

**7. Follow Discord's Terms of Service**

All members must comply with Discord's Terms of Service and Community Guidelines.

**8. Staff Decisions**

Staff members are here to keep the community healthy and organized. Please respect their decisions.

🤝 **About This Community**

This server was created to help players, share knowledge, and build a friendly community around the game.

Our goal is to provide:

* Up-to-date hero guides.
* Accurate tier lists.
* Event information and useful resources.
* News and announcements whenever new information becomes available.
* A place where players can help each other improve.

Please remember that all guides, tier lists, and updates are maintained by staff members during their free time. While we do our best to keep everything updated as quickly as possible, real-life commitments may occasionally cause delays.

By joining this community, you agree to contribute positively and help maintain a respectful environment for everyone.

Click ✅ below to accept these terms and gain access to the server.`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("rules_accept")
      .setLabel("Accept & Enter")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
  );

  return message.channel.send({
    embeds: [embed],
    components: [row]
  });
}

module.exports = { handleRules };
