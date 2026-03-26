const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { gitCommitAndPush } = require("./gitUtils");

const guidesFilePath = path.join(__dirname, "..", "guides.json");
const guidesFolderPath = path.join(__dirname, "..", "guides");

function getGuides() {
  try {
    return JSON.parse(fs.readFileSync(guidesFilePath, "utf-8"));
  } catch {
    return {};
  }
}

function saveGuides(data) {
  fs.writeFileSync(guidesFilePath, JSON.stringify(data, null, 2));
}

function ensureGuidesFolder() {
  if (!fs.existsSync(guidesFolderPath)) {
    fs.mkdirSync(guidesFolderPath, { recursive: true });
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function addCategory(category) {
  const guides = getGuides();

  if (!guides[category]) {
    guides[category] = {};
    saveGuides(guides);
    gitCommitAndPush(`Add category: ${category}`);
  }

  return guides;
}

function renameCategory(oldCategory, newCategory) {
  const guides = getGuides();

  if (!guides[oldCategory]) {
    return { ok: false, reason: "Old category not found." };
  }

  if (guides[newCategory]) {
    return { ok: false, reason: "New category already exists." };
  }

  guides[newCategory] = guides[oldCategory];
  delete guides[oldCategory];

  saveGuides(guides);
  gitCommitAndPush(`Rename category: ${oldCategory} -> ${newCategory}`);

  return { ok: true };
}

function addGuide(category, title, fileName, text = "", images = []) {
  const guides = getGuides();

  if (!guides[category]) {
    guides[category] = {};
  }

  guides[category][title] = {
    file: fileName,
    text,
    images
  };

  saveGuides(guides);
  gitCommitAndPush(`Add guide: ${title}`);

  return guides;
}

function deleteGuide(category, title) {
  const guides = getGuides();

  if (!guides[category] || !guides[category][title]) {
    return false;
  }

  delete guides[category][title];
  saveGuides(guides);
  gitCommitAndPush(`Delete guide: ${title}`);

  return true;
}

function createGuidePdf(outputPath, title, text, imagePaths = []) {
  return new Promise((resolve, reject) => {
    ensureGuidesFolder();

    const doc = new PDFDocument({
      margin: 50,
      size: "A4"
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .text(title, { align: "center" });

    doc.moveDown(1.5);

    doc
      .font("Helvetica")
      .fontSize(12)
      .text(text, {
        align: "left",
        lineGap: 4
      });

    for (const imagePath of imagePaths) {
      if (!fs.existsSync(imagePath)) continue;

      doc.addPage();

      doc
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Image", { align: "center" });

      doc.moveDown(1);

      try {
        doc.image(imagePath, {
          fit: [500, 650],
          align: "center",
          valign: "center"
        });
      } catch (err) {
        console.error("Error adding image to PDF:", err);
      }
    }

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

module.exports = {
  getGuides,
  saveGuides,
  ensureGuidesFolder,
  slugify,
  addCategory,
  renameCategory,
  addGuide,
  deleteGuide,
  createGuidePdf,
  guidesFolderPath
};
