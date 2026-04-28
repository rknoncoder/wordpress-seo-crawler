import fs from "fs";
import path from "path";

const COLUMNS = [
  { header: "Severity", value: (row) => row.severity },
  { header: "Category", value: (row) => row.category },
  { header: "Type", value: (row) => row.type },
  { header: "URL", value: (row) => row.url },
  { header: "Message", value: (row) => row.message },
  { header: "Recommendation", value: (row) => row.recommendation },
  { header: "Evidence", value: (row) => row.evidence }
];

export default function saveIssuesCsv(data) {
  const outputPath = path.resolve("data/reports/issues.csv");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const rows = [
    COLUMNS.map((column) => escapeCsvValue(column.header)).join(","),
    ...data.map((row) => COLUMNS.map((column) => escapeCsvValue(column.value(row))).join(","))
  ];

  writeCsvFile(outputPath, rows.join("\n"));
}

function writeCsvFile(outputPath, content) {
  try {
    fs.writeFileSync(outputPath, content);
  } catch (err) {
    if (err.code !== "EBUSY") {
      throw err;
    }

    const parsedPath = path.parse(outputPath);
    const fallbackPath = path.join(parsedPath.dir, `${parsedPath.name}-${Date.now()}${parsedPath.ext}`);
    fs.writeFileSync(fallbackPath, content);
    console.log(`CSV file is locked. Wrote fallback report: ${fallbackPath}`);
  }
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value).replace(/\r?\n/g, " ").trim();

  if (/[",]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
