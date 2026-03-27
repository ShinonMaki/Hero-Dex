const fs = require("fs");
const path = require("path");
const { getGuides, saveGuides, createGuidePdf, guidesFolderPath, slugify } = require("./guideUtils");

const guidesPath = path.join(__dirname, "../guides.json");

function isImageFile(file) {
  return /\.(png|jpg|jpeg|webp)$/i.test(file);
}

function getImagesForGuide(files, guideTitle) {
  const guideSlug = slugify(guideTitle);

  return files
    .filter(file => isImageFile(file))
    .filter(file => file.toLowerCase().startsWith(`${guideSlug}-`))
    .sort((a, b) => {
      const numA = extractTrailingNumber(a);
      const numB = extractTrailingNumber(b);

      if (numA === null || numB === null) {
        return a.localeCompare(b);
      }

      return numA - numB;
    });
}

function extractTrailingNumber(filename) {
  const name = path.parse(filename).name;
  const match = name.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

async function syncGuides() {
  const guidesData = getGuides();
  const files = fs.readdirSync(guidesFolderPath);

  let updated = 0;

  for (const category of Object.keys(guidesData)) {
    const categoryGuides = guidesData[category];

    if (!categoryGuides || typeof categoryGuides !== "object" || Array.isArray(categoryGuides)) {
      continue;
    }

    for (const guideTitle of Object.keys(categoryGuides)) {
      const guide = categoryGuides[guideTitle];
      const images = getImagesForGuide(files, guideTitle);

      guide.images = images;

      try {
        const imagePaths = images.map(img => path.join(guidesFolderPath, img));
        const outputPath = path.join(guidesFolderPath, guide.file || `${slugify(guideTitle)}.pdf`);

        await createGuidePdf(
          outputPath,
          guideTitle,
          guide.text || "",
          imagePaths
        );

        updated++;
      } catch (err) {
        console.error(`Error regenerating ${guideTitle}:`, err);
      }
    }
  }

  saveGuides(guidesData);
  return updated;
}

module.exports = { syncGuides };
