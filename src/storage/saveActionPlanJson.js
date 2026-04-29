import fs from "fs";
import path from "path";

export default function saveActionPlanJson(data) {
  const outputPath = path.resolve("data/reports/action-plan.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}
