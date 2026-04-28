import fs from "fs";
import path from "path";

export default function saveSitemapJson(data) {
  const outputPath = path.resolve("data/raw/sitemaps.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}
