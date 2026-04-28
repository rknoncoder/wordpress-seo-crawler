import fs from "fs";
import path from "path";

const COLUMNS = [
  { header: "Sitemap URL", value: (row) => row.sitemapUrl },
  { header: "XML Type", value: (row) => row.type },
  { header: "Sitemap Type", value: (row) => row.sitemapType },
  { header: "URL Count", value: (row) => row.urlCount },
  { header: "Selected For Crawl", value: (row) => row.selectedForCrawl },
  { header: "Lastmod First", value: (row) => row.lastmodFirst },
  { header: "Lastmod Last", value: (row) => row.lastmodLast },
  { header: "Sample URLs", value: (row) => row.sampleUrls?.join(" | ") }
];

export default function saveSitemapCsv(data) {
  const outputPath = path.resolve("data/reports/sitemaps.csv");
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
