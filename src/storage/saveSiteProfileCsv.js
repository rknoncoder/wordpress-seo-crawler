import fs from "fs";
import path from "path";

const ROWS = [
  { label: "Total Pages Crawled", value: (profile) => profile.totalPagesCrawled },
  { label: "Primary Category", value: (profile) => profile.primaryCategory },
  { label: "Detected Categories", value: (profile) => profile.detectedCategories.join(", ") },
  { label: "Modules To Run", value: (profile) => profile.modulesToRun.join(", ") },
  { label: "Page Type Counts", value: (profile) => JSON.stringify(profile.pageTypeCounts) },
  { label: "SEO Plugins", value: (profile) => profile.wordpress.seoPlugins.join(", ") },
  { label: "Ecommerce Plugins", value: (profile) => profile.wordpress.ecommercePlugins.join(", ") },
  { label: "LMS Plugins", value: (profile) => profile.wordpress.lmsPlugins.join(", ") },
  { label: "Builders", value: (profile) => profile.wordpress.builders.join(", ") },
  { label: "Themes", value: (profile) => profile.wordpress.themes.join(", ") },
  { label: "Schema Types", value: (profile) => profile.schemaTypes.join(", ") }
];

export default function saveSiteProfileCsv(profile) {
  const outputPath = path.resolve("data/reports/site-profile.csv");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const rows = [
    "Field,Value",
    ...ROWS.map((row) => `${escapeCsvValue(row.label)},${escapeCsvValue(row.value(profile))}`)
  ];

  fs.writeFileSync(outputPath, rows.join("\n"));
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
