const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const NOTIFICATIONS_FILE = path.join(
  __dirname,
  "../data/notifications.json"
);

function ensureFile() {
  const dir = path.dirname(NOTIFICATIONS_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    fs.writeFileSync(
      NOTIFICATIONS_FILE,
      "[]",
      "utf8"
    );
  }
}

function loadNotifications() {
  ensureFile();

  const raw = fs.readFileSync(
    NOTIFICATIONS_FILE,
    "utf8"
  );

  return JSON.parse(raw);
}

function autoPushToGithub() {
  const repoPath = path.join(__dirname, "..");

  const command = `
    cd ${repoPath} &&
    git add data/notifications.json &&
    git commit -m "Update notifications" || true &&
    git push
  `;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(
        "Git auto-push error:",
        error.message
      );
      return;
    }

    console.log(
      "Notifications synced to GitHub"
    );

    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
  });
}

function saveNotifications(notifications) {
  ensureFile();

  fs.writeFileSync(
    NOTIFICATIONS_FILE,
    JSON.stringify(
      notifications,
      null,
      2
    ),
    "utf8"
  );

  autoPushToGithub();
}

function addNotification(notification) {
  const notifications =
    loadNotifications();

  notifications.push({
    ...notification,
    enabled: true,
    lastSentKey: null
  });

  saveNotifications(notifications);
}

function updateNotification(
  id,
  updater
) {
  const notifications =
    loadNotifications();

  const index =
    notifications.findIndex(
      n => n.id === id
    );

  if (index === -1)
    return false;

  notifications[index] =
    updater(
      notifications[index]
    );

  saveNotifications(
    notifications
  );

  return true;
}

module.exports = {
  loadNotifications,
  saveNotifications,
  addNotification,
  updateNotification
};
