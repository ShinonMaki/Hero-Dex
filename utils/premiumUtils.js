const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/premiumUsers.json");

function getPremiumData() {
  if (!fs.existsSync(filePath)) {
    return { premiumUsers: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function savePremiumData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function isPremium(userId) {
  const data = getPremiumData();
  return data.premiumUsers.includes(userId);
}

function addPremium(userId) {
  const data = getPremiumData();
  if (!data.premiumUsers.includes(userId)) {
    data.premiumUsers.push(userId);
    savePremiumData(data);
  }
}

function removePremium(userId) {
  const data = getPremiumData();
  data.premiumUsers = data.premiumUsers.filter(id => id !== userId);
  savePremiumData(data);
}

module.exports = {
  isPremium,
  addPremium,
  removePremium
};
