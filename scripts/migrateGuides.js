const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const guidesPath = path.join(__dirname, "..", "guides.json");
const guidesFolder = path.join(__dirname, "..", "guides");

async function runMigration() {
  const guides = JSON.parse(fs.readFileSync(guidesPath, "utf-8"));

  for (const category of Object.keys(guides)) {
    for (const title of Object.keys(guides[category])) {
      const guide = guides[category][title];

      // Se già migrata, salta
      if (guide.text && guide.text.length > 50) continue;

      const pdfPath = path.join(guidesFolder, guide.file);

      if (!fs.existsSync(pdfPath)) {
        console.log(`❌ File non trovato: ${guide.file}`);
        continue;
      }

      try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdf(dataBuffer);

        let extractedText = data.text || "";

        // pulizia base
        extractedText = extractedText
          .replace(/\n\s*\n/g, "\n\n")
          .trim();

        guides[category][title].text = extractedText || "Text extraction failed.";
        guides[category][title].images = [];

        console.log(`✅ Migrata: ${title}`);
      } catch (err) {
        console.log(`❌ Errore su ${title}:`, err.message);
      }
    }
  }

  fs.writeFileSync(guidesPath, JSON.stringify(guides, null, 2));
  console.log("🔥 Migrazione completata!");
}

runMigration();
