import fs from "fs";
import path from "path";

const COLUMNS = [
  { header: "Priority", value: (row) => row.priority },
  { header: "Category", value: (row) => row.category },
  { header: "URL", value: (row) => row.url },
  { header: "Page Type", value: (row) => row.pageType },
  { header: "Issue Count", value: (row) => row.issueCount },
  { header: "High Issues", value: (row) => row.highIssues },
  { header: "Medium Issues", value: (row) => row.mediumIssues },
  { header: "Low Issues", value: (row) => row.lowIssues },
  { header: "Top Issue Type", value: (row) => row.topIssueType },
  { header: "Action", value: (row) => row.action },
  { header: "Reason", value: (row) => row.reason },
  { header: "Related Issue Types", value: (row) => row.relatedIssueTypes }
];

export default function saveActionPlanCsv(data) {
  const outputPath = path.resolve("data/reports/action-plan.csv");
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
