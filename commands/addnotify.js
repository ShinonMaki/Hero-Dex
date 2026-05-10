const { addNotification } = require("../utils/notificationStore");

const OWNER_ID = "632138675764985886";
const pendingNotifications = new Map();

const EVENT_CHANNEL_ID = "1434858215245484103";
const EVENT_ROLE_ID = "1470141312308216080";

async function startAddNotify(message) {
  if (message.author.id !== OWNER_ID) {
    return message.reply("❌ You are not allowed to use this command.");
  }

  pendingNotifications.set(message.author.id, {
    step: "name",
    data: {}
  });

  return message.reply("Notification name? Example: `Ninja War`");
}

async function handleAddNotifyFlow(message) {
  const session = pendingNotifications.get(message.author.id);
  if (!session) return false;

  const text = message.content.trim();

  if (text.toLowerCase() === "cancel") {
    pendingNotifications.delete(message.author.id);
    await message.reply("Notification creation cancelled.");
    return true;
  }

  if (session.step === "name") {
    session.data.name = text;
    session.data.id = text.toLowerCase().replace(/\s+/g, "_").replace(/[^\w_]/g, "");
    session.step = "message";
    await message.reply("Notification message? Example: `Ninja War start`");
    return true;
  }

  if (session.step === "message") {
    session.data.message = text;
    session.step = "time";
    await message.reply("Time? Use `HH:mm`, example: `11:00`");
    return true;
  }

  if (session.step === "time") {
    if (!/^\d{2}:\d{2}$/.test(text)) {
      await message.reply("Invalid time. Use `HH:mm`, example: `11:00`");
      return true;
    }

    session.data.time = text;
    session.step = "cycle";
    await message.reply("Cycle days? Example: `7`, `28`, `3`");
    return true;
  }

  if (session.step === "cycle") {
    const cycleDays = Number(text);

    if (!Number.isInteger(cycleDays) || cycleDays <= 0) {
      await message.reply("Invalid cycle. Write only a number, example: `28`");
      return true;
    }

    session.data.cycleDays = cycleDays;
    session.step = "startDate";
    await message.reply("Start date? Use `YYYY-MM-DD`, example: `2026-05-26`");
    return true;
  }

  if (session.step === "startDate") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      await message.reply("Invalid date. Use `YYYY-MM-DD`, example: `2026-05-26`");
      return true;
    }

    session.data.startDate = text;
    session.step = "activeDays";
    await message.reply(
      "Active cycle days? Example:\n`0` = only start day\n`0,1,2` = start day + next 2 days"
    );
    return true;
  }

  if (session.step === "activeDays") {
    const activeDays = text
      .split(",")
      .map(x => Number(x.trim()))
      .filter(x => Number.isInteger(x) && x >= 0);

    if (activeDays.length === 0) {
      await message.reply("Invalid active days. Example: `0,1,2`");
      return true;
    }

    const notification = {
      ...session.data,
      activeDays,
      channelId: EVENT_CHANNEL_ID,
      roleId: EVENT_ROLE_ID,
      timezone: "Europe/Rome"
    };

    addNotification(notification);
    pendingNotifications.delete(message.author.id);

    await message.reply(
      `✅ Notification created:\n` +
      `**${notification.name}**\n` +
      `Message: ${notification.message}\n` +
      `Time: ${notification.time}\n` +
      `Every ${notification.cycleDays} day(s)\n` +
      `Start: ${notification.startDate}\n` +
      `Active days: ${notification.activeDays.join(", ")}`
    );

    return true;
  }

  return false;
}

module.exports = {
  startAddNotify,
  handleAddNotifyFlow
};
