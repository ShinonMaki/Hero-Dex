const fs = require("fs");
const PDFDocument = require("pdfkit");

const guidesFilePath = "./guides.json";

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

function addCategory(category) {
  const guides = getGuides();

  if (!guides[category]) {
    guides[category] = [];
    saveGuides(guides);
  }

  return guides;
}

function addGuide(category, guideData) {
  const guides = getGuides();

  if (!guides[category]) {
    guides[category] = [];
  }

  guides[category].push(guideData);
  saveGuides(guides);

  return guides;
}

function deleteGuide(category, guideName) {
  const guides = getGuides();

  if (!guides[category]) return false;

  const originalLength = guides[category].length;
  guides[category] = guides[category].filter(
    guide => guide.name.toLowerCase() !== guideName.toLowerCase()
  );

  if (guides[category].length === originalLength) return false;

  saveGuides(guides);
  return true;
}

function editGuide(category, oldGuideName, newGuideData) {
  const guides = getGuides();

  if (!guides[category]) return false;

  const index = guides[category].findIndex(
    guide => guide.name.toLowerCase() === oldGuideName.toLowerCase()
  );

  if (index === -1) return false;

  guides[category][index] = newGuideData;
  saveGuides(guides);
  return true;
}

function createGuidePdf(outputPath, title, text, imagePaths = []) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: "A4"
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.fontSize(22).text(title, { align: "center" });
    doc.moveDown(2);

    doc.fontSize(12).text(text, {
      align: "left"
    });

    if (imagePaths.length > 0) {
      imagePaths.forEach(imagePath => {
        doc.addPage();
        doc.fontSize(18).text("Image", { align: "center" });
        doc.moveDown(1);

        try {
          doc.image(imagePath, {
            fit: [500, 700],
            align: "center",
            valign: "center"
          });
        } catch (err) {
          console.error("Error adding image to PDF:", err);
        }
      });
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
  deleteGuide,
  editGuide,
  createGuidePdf
};
