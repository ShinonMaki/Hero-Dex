const fs = require("fs");
const path = require("path");

const NOTIFICATIONS_FILE = path.join(__dirname, "../data/notifications.json");

function ensureFile() {
  const dir = path.dirname(NOTIFICATIONS_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    fs.writeFileSync(NOTIFICATIONS_FILE, "[]", "utf8");
  }
}

function loadNotifications() {
  ensureFile();

  const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf8");
  return JSON.parse(raw);
}

function saveNotifications(notifications) {
  ensureFile();
  fs.writeFileSync(
    NOTIFICATIONS_FILE,
    JSON.stringify(notifications, null, 2),
    "utf8"
  );
}

function addNotification(notification) {
  const notifications = loadNotifications();

  notifications.push({
    ...notification,
    enabled: true,
    lastSentKey: null
  });

  saveNotifications(notifications);
}

function updateNotification(id, updater) {
  const notifications = loadNotifications();

  const index = notifications.findIndex(n => n.id === id);
  if (index === -1) return false;

  notifications[index] = updater(notifications[index]);

  saveNotifications(notifications);
  return true;
}

module.exports = {
  loadNotifications,
  saveNotifications,
  addNotification,
  updateNotification
};
