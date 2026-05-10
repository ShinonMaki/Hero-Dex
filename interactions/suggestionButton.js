const pendingSuggestions = new Map();

const SUGGESTION_CHANNEL_ID = "1503033650508337333";
const IMPLEMENTED_CHANNEL_ID = "1501588339776815144";

async function handleSuggestionButton(interaction) {
  await interaction.reply({
    content: "💡 Write your suggestion.",
    ephemeral: true
  });

  pendingSuggestions.set(interaction.user.id, true);
}

async function handleSuggestionMessage(message) {
  if (!pendingSuggestions.has(message.author.id)) return false;

  pendingSuggestions.delete(message.author.id);

  const suggestion = message.content;

  await message.delete().catch(() => {});

  const suggestionChannel =
    await message.client.channels.fetch(
      SUGGESTION_CHANNEL_ID
    );

  if (!suggestionChannel) return true;

  const embed = {
    color: 0xFF2D95,
    title: "💡 New Suggestion",
    fields: [
      {
        name: "Author",
        value: `<@${message.author.id}>`,
        inline: true
      },
      {
        name: "Suggestion",
        value: suggestion
      }
    ],
    footer: {
      text: `User ID: ${message.author.id}`
    },
    timestamp: new Date()
  };

  await suggestionChannel.send({
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Completed",
            emoji: {
              name: "✅"
            },
            custom_id: `suggestion_done_${message.author.id}`
          }
        ]
      }
    ]
  });

  return true;
}

async function handleSuggestionDone(interaction) {
  const userId =
    interaction.customId.split("_")[2];

  const implementedChannel =
    await interaction.client.channels.fetch(
      IMPLEMENTED_CHANNEL_ID
    );

  if (!implementedChannel) return;

  await implementedChannel.send({
    embeds: [
      {
        color: 0x57F287,
        title: "✅ Suggestion Implemented",
        description:
          `A suggestion has been implemented!\n\nAuthor: <@${userId}>`,
        timestamp: new Date()
      }
    ]
  });

  await interaction.update({
    components: []
  });
}

module.exports = {
  handleSuggestionButton,
  handleSuggestionMessage,
  handleSuggestionDone
};
