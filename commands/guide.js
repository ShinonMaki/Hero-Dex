module.exports = async (message) => {
  const embed = {
    color: 0x5865F2,
    title: "📚 Guide Hub",
    description: "Choose a category below."
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("guide_category_heroes")
      .setLabel("Heroes")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("guide_category_events")
      .setLabel("Events")
      .setStyle(ButtonStyle.Primary)
  );

  return message.reply({
    embeds: [embed],
    components: [row]
  });
};
