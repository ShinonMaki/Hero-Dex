const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const EVENT_COLOR = 0xFF2D95;
const TIMEZONE = "Europe/Rome";

const notificationsPath = path.join(__dirname, "../data/notifications.json");

function getRomeDate() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: TIMEZONE
    })
  );
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

function getMonthName(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dateKey(date) {
  return date.toISOString().split("T")[0];
}

function isSameOrBefore(a, b) {
  return a.getTime() <= b.getTime();
}

function addEvent(events, date, name) {
  events.push({
    key: `${dateKey(date)}_${name}`,
    date: new Date(date),
    name
  });
}

function isInitialRealmPeriod(date) {
  const startDate = new Date("2026-05-05T00:00:00");

  const checkDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffDays = Math.floor(
    (checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return false;

  const cycleDay = diffDays % 28;

  return cycleDay >= 0 && cycleDay <= 2;
}

function loadNotifications() {
  if (!fs.existsSync(notificationsPath)) return [];

  try {
    return JSON.parse(fs.readFileSync(notificationsPath, "utf8"));
  } catch (err) {
    console.error("Calendar notifications JSON error:", err);
    return [];
  }
}

function addNotificationEvents(events, startDate, endDate) {
  const notifications = loadNotifications();

  for (const notification of notifications) {
    if (!notification.enabled) continue;

    const eventStart = new Date(`${notification.startDate}T00:00:00`);
    const cycleDays = Number(notification.cycleDays);
    const activeDays = Array.isArray(notification.activeDays)
      ? notification.activeDays
      : [0];

    if (!cycleDays || cycleDays < 1) continue;

    for (
      let date = new Date(startDate);
      isSameOrBefore(date, endDate);
      date.setDate(date.getDate() + 1)
    ) {
      const cleanDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      const diffDays = Math.floor(
        (cleanDate.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 0) continue;

      const cycleDay = diffDays % cycleDays;

      if (activeDays.includes(cycleDay)) {
        addEvent(events, cleanDate, notification.name);
      }
    }
  }
}

function addHardcodedEvents(events, startDate, endDate) {
  for (
    let date = new Date(startDate);
    isSameOrBefore(date, endDate);
    date.setDate(date.getDate() + 1)
  ) {
    const day = date.getDay();

    const cleanDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    // Arena Tournament - every 3 days from 2026-05-06
    const arenaStart = new Date("2026-05-06T00:00:00");
    const arenaDiffDays = Math.floor(
      (cleanDate.getTime() - arenaStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (arenaDiffDays >= 0 && arenaDiffDays % 3 === 0) {
      addEvent(events, cleanDate, "Arena Tournament");
    }

    // Guild War - Monday, Wednesday, Friday
    if ([1, 3, 5].includes(day)) {
      addEvent(events, cleanDate, "Guild War");
    }

    // Holy Domain Duel - Sunday
    if (day === 0) {
      addEvent(events, cleanDate, "Holy Domain Duel");
    }

    // Hall of Heroes - Monday
    if (day === 1) {
      addEvent(events, cleanDate, "Hall of Heroes");
    }

    // Initial Realm / Ancient Battlefield
    if (isInitialRealmPeriod(cleanDate)) {
      addEvent(events, cleanDate, "Initial Realm");
      addEvent(events, cleanDate, "Ancient Battlefield");
    }
  }
}

async function handleCalendar(message) {
  const now = getRomeDate();

  const startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 2,
    0
  );

  const events = [];

  addNotificationEvents(events, startDate, endDate);
  addHardcodedEvents(events, startDate, endDate);

  const uniqueEvents = Array.from(
    new Map(events.map(event => [event.key, event])).values()
  );

  uniqueEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  const grouped = {};

  for (const event of uniqueEvents) {
    const month = getMonthName(event.date);

    if (!grouped[month]) grouped[month] = [];

    grouped[month].push(`**${formatDate(event.date)}** • ${event.name}`);
  }

  const embed = new EmbedBuilder()
    .setColor(EVENT_COLOR)
    .setTitle("📅 Hero-Dex Event Calendar")
    .setDescription(
      `Showing events from **${getMonthName(startDate)}** to **${getMonthName(endDate)}**`
    )
    .setFooter({ text: "Hero-Dex • Event Calendar" })
    .setTimestamp();

  for (const [month, list] of Object.entries(grouped)) {
    const chunks = [];

    for (let i = 0; i < list.length; i += 25) {
      chunks.push(list.slice(i, i + 25));
    }

    chunks.forEach((chunk, index) => {
      embed.addFields({
        name: index === 0 ? `🗓️ ${month}` : `🗓️ ${month} continued`,
        value: chunk.join("\n"),
        inline: false
      });
    });
  }

  return message.reply({
    embeds: [embed]
  });
}

module.exports = {
  handleCalendar
};
