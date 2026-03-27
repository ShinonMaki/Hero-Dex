const fs = require("fs");
const path = require("path");
const { createGuidePdf } = require("./guideUtils");

const guidesPath = path.join(__dirname, "../guides.json");
const guidesFolder = path.join(__dirname, "../guides");

function getGuideNameFromFile(file) {
  return file.split("-")[0];
}

async function syncGuides() {
  const guidesData = JSON.parse(fs.readFileSync(guidesPath, "utf-8"));

  const files = fs.readdirSync(guidesFolder);

  const imageMap = {};

  for (const file of files) {
    if (!file.endsWith(".png")) continue;

    const guideName = getGuideNameFromFile(file);

    if (!imageMap[guideName]) {
      imageMap[guideName] = [];
    }

    imageMap[guideName].push(file);
  }

  let updated = 0;

  for (const category of Object.keys(guidesData)) {
    for (const guideName of Object.keys(guidesData[category])) {
      const guide = guidesData[category][guideName];

      const images = imageMap[guideName] || [];

      // ordina per numero se possibile
      images.sort((a, b) => {
        const numA = parseInt(a.split("-")[1]);
        const numB = parseInt(b.split("-")[1]);
        return numA - numB;
      });

      guide.images = images;

      try {
        const imagePaths = images.map(img =>
          path.join(guidesFolder, img)
        );

        const outputPath = path.join(
          guidesFolder,
          guide.file || `${guideName}.pdf`
        );

        await createGuidePdf(
          outputPath,
          guideName,
          guide.text || "",
          imagePaths
        );

        updated++;
      } catch (err) {
        console.error(`Error regenerating ${guideName}:`, err);
      }
    }
  }

  fs.writeFileSync(guidesPath, JSON.stringify(guidesData, null, 2));

  return updated;
}

module.exports = { syncGuides };
