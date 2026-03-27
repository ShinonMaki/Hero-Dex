const fs = require("fs");
const path = require("path");
const heroesData = require("../heroes.json");

function getFiles(folder, exts) {
  try {
    return fs.readdirSync(folder).filter(file =>
      exts.includes(path.extname(file).toLowerCase())
    );
  } catch {
    return [];
  }
}

function ensureDir(folder) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

function findPdf(hero) {
  const files = getFiles("./pdf", [".pdf"]);
  return files.find(f =>
    path.basename(f, ".pdf").toLowerCase().endsWith(`_${hero}`) ||
    path.basename(f, ".pdf").toLowerCase() === hero
  );
}

function findImage(hero) {
  const files = getFiles("./images", [".png", ".jpg", ".jpeg", ".webp"]);
  return files.find(f => path.parse(f).name.toLowerCase() === hero);
}

function getTierlistFiles() {
  return getFiles("./tierlist", [".png", ".jpg", ".jpeg", ".webp", ".pdf"]);
}

function saveHeroesJson() {
  fs.writeFileSync("./heroes.json", JSON.stringify(heroesData, null, 2));
}

async function downloadAttachment(url, destinationPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destinationPath, Buffer.from(arrayBuffer));
}

function renameHeroFiles(oldName, newName) {
  try {
    // ===== HERO IMAGE =====
    const imageFile = findImage(oldName);
    if (imageFile) {
      const ext = path.extname(imageFile);
      const oldImagePath = path.join("./images", imageFile);
      const newImagePath = path.join("./images", `${newName}${ext}`);

      if (fs.existsSync(oldImagePath)) {
        fs.renameSync(oldImagePath, newImagePath);
      }
    }

    // ===== HERO PDF =====
    const pdfFile = findPdf(oldName);
    if (pdfFile) {
      const oldPdfPath = path.join("./pdf", pdfFile);
      const newPdfPath = path.join("./pdf", `${newName}.pdf`);

      if (fs.existsSync(oldPdfPath)) {
        fs.renameSync(oldPdfPath, newPdfPath);
      }
    }

    // ===== ANDROID/PC GUIDE IMAGES FOLDER =====
    const oldFolder = path.join("./hero-guide-images", oldName);
    const newFolder = path.join("./hero-guide-images", newName);

    if (fs.existsSync(oldFolder)) {
      fs.renameSync(oldFolder, newFolder);
    }
  } catch (err) {
    console.error("Rename hero files error:", err);
  }
}

module.exports = {
  heroesData,
  getFiles,
  ensureDir,
  findPdf,
  findImage,
  getTierlistFiles,
  saveHeroesJson,
  downloadAttachment,
  renameHeroFiles
};
