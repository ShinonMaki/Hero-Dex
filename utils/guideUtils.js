const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

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
  }

  return guides;
}

function addGuide(category, title, fileName) {
  const guides = getGuides();

  if (!guides[category]) {
    guides[category] = {};
  }

  guides[category][title] = {
    file: fileName
  };

  saveGuides(guides);
  return guides;
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

    // Title
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .text(title, { align: "center" });

    doc.moveDown(1.5);

    // Body
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(text, {
        align: "left",
        lineGap: 4
      });

    // Images
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
  addCategory,
  addGuide,
  createGuidePdf,
  ensureGuidesFolder,
  slugify,
  guidesFolderPath
};
