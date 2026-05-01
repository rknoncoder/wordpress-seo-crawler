import fs from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

const INPUT_PATHS = {
  pages: path.resolve("data/raw/output.json"),
  issues: path.resolve("data/reports/issues.json"),
  actionPlan: path.resolve("data/reports/action-plan.json"),
  siteProfile: path.resolve("data/raw/site-profile.json"),
  sitemapProfile: path.resolve("data/raw/sitemaps.json")
};

const OUTPUT_PATH = path.resolve("data/output.xlsx");

const SHEET_COLUMNS = {
  overview: [
    { header: "Metric", value: (row) => row.metric },
    { header: "Value", value: (row) => row.value }
  ],
  pages: [
    { header: "URL", value: (row) => row.url },
    { header: "Status", value: (row) => row.status },
    { header: "Page Type", value: (row) => row.classification?.pageType },
    { header: "Modules", value: (row) => joinList(row.classification?.modules) },
    { header: "Title", value: (row) => row.title },
    { header: "Title Length", value: (row) => row.titleLength },
    { header: "Meta Description", value: (row) => row.metaDescription },
    { header: "Meta Description Length", value: (row) => row.metaDescriptionLength },
    { header: "Canonical", value: (row) => row.canonical },
    { header: "Rel Next", value: (row) => row.relNext },
    { header: "Rel Prev", value: (row) => row.relPrev },
    { header: "Faceted URL", value: (row) => boolText(row.isFacetedUrl) },
    { header: "Facet Query Params", value: (row) => joinList(row.facetQueryParams) },
    { header: "Robots", value: (row) => row.robots },
    { header: "H1 Count", value: (row) => row.h1Count },
    { header: "H1 Text", value: (row) => row.h1Text },
    { header: "Word Count", value: (row) => row.wordCount },
    { header: "Images", value: (row) => row.totalImages },
    { header: "Images Missing Alt", value: (row) => row.imagesWithoutAlt },
    { header: "Images Empty Alt", value: (row) => row.imagesWithEmptyAlt },
    { header: "Internal Links", value: (row) => row.internalLinkCount },
    { header: "External Links", value: (row) => row.externalLinkCount },
    { header: "Pagination Link Count", value: (row) => row.paginationLinkCount },
    { header: "Pagination Link Samples", value: (row) => joinList(row.paginationLinkSamples?.map((link) => link.url)) },
    { header: "Schema Types", value: (row) => joinList(row.schema?.types) },
    { header: "Global Schema Types", value: (row) => joinList(row.schema?.globalTypes) },
    { header: "Page-Level Schema Types", value: (row) => joinList(row.schema?.pageLevelTypes) },
    { header: "Expected Schema", value: (row) => row.schemaValidation?.expectedSchema },
    { header: "Found Expected Schema Types", value: (row) => joinList(row.schemaValidation?.foundSchema) },
    { header: "Expected Schema Status", value: (row) => row.schemaValidation?.status },
    { header: "Schema Issues", value: (row) => joinList(row.schemaIssues) },
    { header: "Schema Injected By App", value: (row) => boolText(row.schema?.injectedByApp) },
    { header: "Schema Source Type", value: (row) => row.schema?.sourceType },
    { header: "Schema Source Name", value: (row) => row.schema?.sourceName },
    { header: "Schema Source Evidence", value: (row) => joinList(row.schema?.sourceEvidence) },
    { header: "Has Article Schema", value: (row) => boolText(row.schema?.hasArticleSchema) },
    { header: "Has Article Author", value: (row) => boolText(row.schema?.hasArticleAuthor) },
    { header: "Has Article Published Date", value: (row) => boolText(row.schema?.hasArticlePublishedDate) },
    { header: "Has Product Price", value: (row) => boolText(row.schema?.hasProductPrice) },
    { header: "Has Product Rating", value: (row) => boolText(row.schema?.hasProductRating) },
    { header: "WordPress", value: (row) => boolText(row.wordpress?.isWordPress) },
    { header: "Plugins", value: (row) => joinList(row.wordpress?.plugins) },
    { header: "Fetch Error", value: (row) => row.fetchError }
  ],
  issues: [
    { header: "Severity", value: (row) => row.severity },
    { header: "Category", value: (row) => row.category },
    { header: "Type", value: (row) => row.type },
    { header: "URL", value: (row) => row.url },
    { header: "Message", value: (row) => row.message },
    { header: "Recommendation", value: (row) => row.recommendation },
    { header: "Evidence", value: (row) => row.evidence }
  ],
  actionPlan: [
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
  ],
  summary: [
    { header: "Group", value: (row) => row.group },
    { header: "Name", value: (row) => row.name },
    { header: "Count", value: (row) => row.count }
  ],
  siteProfile: [
    { header: "Field", value: (row) => row.field },
    { header: "Value", value: (row) => row.value }
  ],
  sitemaps: [
    { header: "Sitemap URL", value: (row) => row.sitemapUrl },
    { header: "Type", value: (row) => row.type },
    { header: "Sitemap Type", value: (row) => row.sitemapType },
    { header: "URL Count", value: (row) => row.urlCount },
    { header: "Selected For Crawl", value: (row) => boolText(row.selectedForCrawl) }
  ]
};

export default async function exportExcel() {
  const pages = await readJsonFile(INPUT_PATHS.pages, []);
  const issues = await readJsonFile(INPUT_PATHS.issues, []);
  const actionPlan = await readJsonFile(INPUT_PATHS.actionPlan, []);
  const siteProfile = await readJsonFile(INPUT_PATHS.siteProfile, {});
  const sitemapProfile = await readJsonFile(INPUT_PATHS.sitemapProfile, {});

  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, "Overview", buildOverviewRows(pages, issues, siteProfile, sitemapProfile), SHEET_COLUMNS.overview);
  appendSheet(workbook, "Pages", pages, SHEET_COLUMNS.pages);
  appendSheet(workbook, "Issues", issues, SHEET_COLUMNS.issues);
  appendSheet(workbook, "Action Plan", actionPlan, SHEET_COLUMNS.actionPlan);
  appendSheet(workbook, "Issue Summary", buildIssueSummaryRows(issues), SHEET_COLUMNS.summary);
  appendSheet(workbook, "Site Profile", buildSiteProfileRows(siteProfile), SHEET_COLUMNS.siteProfile);
  appendSheet(workbook, "Sitemaps", sitemapProfile.sitemaps || [], SHEET_COLUMNS.sitemaps);

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  XLSX.writeFile(workbook, OUTPUT_PATH);

  return OUTPUT_PATH;
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

function appendSheet(workbook, sheetName, rows, columns) {
  const sheetRows = rows.map((row) => toSheetRow(row, columns));
  const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
    header: columns.map((column) => column.header),
    skipHeader: false
  });

  worksheet["!cols"] = columns.map((column) => ({
    wch: Math.min(Math.max(column.header.length + 4, 14), 60)
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

function toSheetRow(row, columns) {
  return columns.reduce((output, column) => {
    output[column.header] = normalizeCellValue(column.value(row));
    return output;
  }, {});
}

function buildOverviewRows(pages, issues, siteProfile, sitemapProfile) {
  const severityCounts = countBy(issues, (issue) => issue.severity || "unknown");

  return [
    { metric: "Total pages crawled", value: pages.length },
    { metric: "Primary category", value: siteProfile.primaryCategory || "unknown" },
    { metric: "Detected categories", value: joinList(siteProfile.detectedCategories) },
    { metric: "Modules to run", value: joinList(siteProfile.modulesToRun) },
    { metric: "Total issues", value: issues.length },
    { metric: "High issues", value: severityCounts.high || 0 },
    { metric: "Medium issues", value: severityCounts.medium || 0 },
    { metric: "Low issues", value: severityCounts.low || 0 },
    { metric: "WordPress detected", value: boolText(siteProfile.wordpress?.isWordPress) },
    { metric: "SEO plugins", value: joinList(siteProfile.wordpress?.seoPlugins) },
    { metric: "Ecommerce plugins", value: joinList(siteProfile.wordpress?.ecommercePlugins) },
    { metric: "LMS plugins", value: joinList(siteProfile.wordpress?.lmsPlugins) },
    { metric: "Builders", value: joinList(siteProfile.wordpress?.builders) },
    { metric: "Total sitemaps found", value: sitemapProfile.totalSitemapsFound ?? 0 },
    { metric: "Total sitemap URLs found", value: sitemapProfile.totalUrlsFound ?? 0 },
    { metric: "Selected sitemaps for crawl", value: sitemapProfile.selectedSitemapsForCrawl ?? 0 }
  ];
}

function buildIssueSummaryRows(issues) {
  return [
    ...toSummaryRows("Severity", countBy(issues, (issue) => issue.severity || "unknown")),
    ...toSummaryRows("Category", countBy(issues, (issue) => issue.category || "unknown")),
    ...toSummaryRows("Type", countBy(issues, (issue) => issue.type || "unknown"))
  ];
}

function buildSiteProfileRows(siteProfile) {
  return [
    { field: "Total pages crawled", value: siteProfile.totalPagesCrawled ?? 0 },
    { field: "Primary category", value: siteProfile.primaryCategory || "unknown" },
    { field: "Detected categories", value: joinList(siteProfile.detectedCategories) },
    { field: "Modules to run", value: joinList(siteProfile.modulesToRun) },
    { field: "Page type counts", value: formatObject(siteProfile.pageTypeCounts) },
    { field: "WordPress detected", value: boolText(siteProfile.wordpress?.isWordPress) },
    { field: "Plugins", value: joinList(siteProfile.wordpress?.plugins) },
    { field: "SEO plugins", value: joinList(siteProfile.wordpress?.seoPlugins) },
    { field: "Ecommerce plugins", value: joinList(siteProfile.wordpress?.ecommercePlugins) },
    { field: "LMS plugins", value: joinList(siteProfile.wordpress?.lmsPlugins) },
    { field: "Builders", value: joinList(siteProfile.wordpress?.builders) },
    { field: "Themes", value: joinList(siteProfile.wordpress?.themes) },
    { field: "Schema types", value: joinList(siteProfile.schemaTypes) },
    { field: "Global schema types", value: joinList(siteProfile.globalSchemaTypes) },
    { field: "Page-level schema types", value: joinList(siteProfile.pageLevelSchemaTypes) }
  ];
}

function toSummaryRows(group, counts) {
  return Object.entries(counts)
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
    .map(([name, count]) => ({ group, name, count }));
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function normalizeCellValue(value) {
  if (Array.isArray(value)) return joinList(value);
  if (value && typeof value === "object") return formatObject(value);
  if (value === undefined || value === null) return "";
  return value;
}

function joinList(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : value || "";
}

function boolText(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function formatObject(value) {
  if (!value || typeof value !== "object") {
    return "";
  }

  return Object.entries(value)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? joinList(item) : item}`)
    .join("; ");
}
