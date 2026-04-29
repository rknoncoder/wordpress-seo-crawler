import fs from "fs";
import path from "path";

const COLUMNS = [
  { header: "Requested URL", value: (row) => row.requestedUrl },
  { header: "Final URL", value: (row) => row.finalUrl || row.url },
  { header: "Status", value: (row) => row.status },
  { header: "Fetch Error", value: (row) => row.fetchError },
  { header: "Redirected", value: (row) => row.redirected },
  { header: "Depth", value: (row) => row.depth },
  { header: "Title", value: (row) => row.title },
  { header: "Title Length", value: (row) => row.titleLength },
  { header: "Meta Description", value: (row) => row.metaDescription },
  { header: "Meta Description Length", value: (row) => row.metaDescriptionLength },
  { header: "Canonical", value: (row) => row.canonical },
  { header: "Robots", value: (row) => row.robots },
  { header: "Noindex", value: (row) => row.isNoindex },
  { header: "H1 Count", value: (row) => row.h1Count },
  { header: "H1 Text", value: (row) => row.h1Text },
  { header: "H2 Count", value: (row) => row.h2Count },
  { header: "H3 Count", value: (row) => row.h3Count },
  { header: "Word Count", value: (row) => row.wordCount },
  { header: "Text Length", value: (row) => row.textLength },
  { header: "HTML Length", value: (row) => row.htmlLength },
  { header: "Text To HTML Ratio", value: (row) => row.textToHtmlRatio },
  { header: "Total Images", value: (row) => row.totalImages },
  { header: "Images Without Alt", value: (row) => row.imagesWithoutAlt },
  { header: "Images With Empty Alt", value: (row) => row.imagesWithEmptyAlt },
  { header: "Lazy Images", value: (row) => row.lazyImages },
  { header: "Images Without Dimensions", value: (row) => row.imagesWithoutDimensions },
  { header: "Internal Link Count", value: (row) => row.internalLinkCount },
  { header: "External Link Count", value: (row) => row.externalLinkCount },
  { header: "Nofollow Link Count", value: (row) => row.nofollowLinkCount },
  { header: "Schema Types", value: (row) => row.schema?.types?.join(", ") },
  { header: "Schema Injected By App", value: (row) => row.schema?.injectedByApp },
  { header: "Schema Source Type", value: (row) => row.schema?.sourceType },
  { header: "Schema Source Name", value: (row) => row.schema?.sourceName },
  { header: "Schema Source Evidence", value: (row) => row.schema?.sourceEvidence?.join(", ") },
  { header: "JSON-LD Count", value: (row) => row.schema?.jsonLdCount },
  { header: "JSON-LD Parse Errors", value: (row) => row.schema?.jsonLdParseErrors },
  { header: "Has Article Schema", value: (row) => row.schema?.hasArticleSchema },
  { header: "Has Product Schema", value: (row) => row.schema?.hasProductSchema },
  { header: "Has LocalBusiness Schema", value: (row) => row.schema?.hasLocalBusinessSchema },
  { header: "Has Organization Schema", value: (row) => row.schema?.hasOrganizationSchema },
  { header: "Has Course Schema", value: (row) => row.schema?.hasCourseSchema },
  { header: "Has Breadcrumb Schema", value: (row) => row.schema?.hasBreadcrumbSchema },
  { header: "Has FAQ Schema", value: (row) => row.schema?.hasFaqSchema },
  { header: "OG Type", value: (row) => row.openGraph?.type },
  { header: "OG Title", value: (row) => row.openGraph?.title },
  { header: "Twitter Card", value: (row) => row.twitter?.card },
  { header: "Is WordPress", value: (row) => row.wordpress?.isWordPress },
  { header: "WordPress Signals", value: (row) => row.wordpress?.signals?.join(", ") },
  { header: "WordPress Generator", value: (row) => row.wordpress?.generator },
  { header: "Plugin Slugs", value: (row) => row.wordpress?.plugins?.join(", ") },
  { header: "Theme Slugs", value: (row) => row.wordpress?.themes?.join(", ") },
  { header: "SEO Plugins", value: (row) => row.wordpress?.seoPlugins?.join(", ") },
  { header: "Ecommerce Plugins", value: (row) => row.wordpress?.ecommercePlugins?.join(", ") },
  { header: "LMS Plugins", value: (row) => row.wordpress?.lmsPlugins?.join(", ") },
  { header: "Builders", value: (row) => row.wordpress?.builders?.join(", ") },
  { header: "Route Signals", value: (row) => row.wordpress?.routeSignals?.join(", ") },
  { header: "Local Signals", value: (row) => row.wordpress?.localSignals?.join(", ") },
  { header: "Has WooCommerce", value: (row) => row.wordpress?.hasWooCommerce },
  { header: "Has LMS", value: (row) => row.wordpress?.hasLms },
  { header: "Has Local Signals", value: (row) => row.wordpress?.hasLocalSignals },
  { header: "Content Type", value: (row) => row.contentType },
  { header: "Page Type", value: (row) => row.classification?.pageType },
  { header: "Page Modules", value: (row) => row.classification?.modules?.join(", ") },
  { header: "Page Classification Evidence", value: (row) => row.classification?.evidence?.join(", ") }
];

export default function saveCsv(data) {
  const outputPath = path.resolve("data/reports/pages.csv");
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
