const {
  loadNotifications,
  updateNotification
} = require("./notificationStore");

function startNotificationRunner(client) {
  setInterval(async () => {
    const now = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Europe/Rome"
      })
    );

    const currentTime = now.toTimeString().slice(0, 5);
    const todayKey = now.toISOString().slice(0, 10);

    const notifications = loadNotifications();

    for (const notification of notifications) {
      if (!notification.enabled) continue;
      if (notification.time !== currentTime) continue;

      const startDate = new Date(`${notification.startDate}T00:00:00`);

      const diffDays = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 0) continue;

      const cycleDay = diffDays % notification.cycleDays;

      if (!notification.activeDays.includes(cycleDay)) continue;

      const sentKey = `${notification.id}_${todayKey}_${notification.time}`;

      if (notification.lastSentKey === sentKey) continue;

      const channel = await client.channels.fetch(notification.channelId).catch(() => null);
      if (!channel) continue;

      await channel.send({
        content: notification.roleId
          ? `<@&${notification.roleId}> ${notification.message}`
          : notification.message
      });

      updateNotification(notification.id, old => ({
        ...old,
        lastSentKey: sentKey
      }));
    }
  }, 60 * 1000);
}

module.exports = {
  startNotificationRunner
};
