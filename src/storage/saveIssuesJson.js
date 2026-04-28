import fs from "fs";
import path from "path";

export default function saveIssuesJson(data) {
  const outputPath = path.resolve("data/reports/issues.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}
