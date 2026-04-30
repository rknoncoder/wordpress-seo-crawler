import { createIssue } from "./issueFactory.js";

export default function ecommerceAudit(pages, siteProfile) {
  const issues = [];
  const productPages = pages.filter((page) => page.classification?.pageType === "product");
  const productCollectionPages = pages.filter((page) => page.classification?.pageType === "product_collection_page");
  const hasEcommerce = siteProfile.detectedCategories.includes("ecommerce");

  if (hasEcommerce && productPages.length === 0 && productCollectionPages.length > 0) {
    issues.push(createIssue({
      severity: "low",
      category: "ecommerce",
      type: "no_product_detail_pages_crawled",
      url: "",
      message: "Product collection pages were crawled, but no product detail pages were classified.",
      recommendation: "Include product detail/PDP sitemaps if you want Product schema and product-page SEO checks."
    }));
  }

  productPages.forEach((page) => {
    if (!page.schema?.hasProductSchema) {
      issues.push(createIssue({
        severity: "high",
        category: "ecommerce",
        type: "missing_product_schema",
        url: page.url,
        message: "Product page is missing Product schema.",
        recommendation: "Add Product schema with price, availability, SKU, image, and brand where applicable."
      }));
    }
  });

  return issues;
}
