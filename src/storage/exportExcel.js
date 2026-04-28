import fs from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

const INPUT_PATH = path.resolve("data/raw/output.json");
const OUTPUT_PATH = path.resolve("data/output.xlsx");
const HEADERS = [
  "URL",
  "Title",
  "Meta Description",
  "H1 count",
  "Images without alt",
  "Total issues count",
  "Issue types"
];
const CHUNK_SIZE = 500;

export default async function exportExcel() {
  const records = await readCrawlerOutput(INPUT_PATH);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS]);

  for (let offset = 0; offset < records.length; offset += CHUNK_SIZE) {
    const chunk = records.slice(offset, offset + CHUNK_SIZE);
    const rows = chunk.map(toExcelRow);

    XLSX.utils.sheet_add_json(worksheet, rows, {
      origin: -1,
      skipHeader: true
    });
  }

  worksheet["!cols"] = [
    { wch: 60 },
    { wch: 50 },
    { wch: 60 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "SEO Results");
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  XLSX.writeFile(workbook, OUTPUT_PATH);

  return OUTPUT_PATH;
}

async function readCrawlerOutput(filePath) {
  let raw;

  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  if (!raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function toExcelRow(record = {}) {
  const issues = Array.isArray(record.issues) ? record.issues : [];

  return {
    URL: record.url || "",
    Title: record.title || "",
    "Meta Description": record.metaDescription || "",
    "H1 count": record.h1Count ?? 0,
    "Images without alt": record.imagesWithoutAlt ?? 0,
    "Total issues count": issues.length,
    "Issue types": issues
      .map((issue) => issue?.type)
      .filter(Boolean)
      .join(", ")
  };
}
