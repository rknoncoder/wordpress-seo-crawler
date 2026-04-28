import fs from "fs";
import path from "path";

export default function saveSiteProfileJson(data) {
  const outputPath = path.resolve("data/raw/site-profile.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}
