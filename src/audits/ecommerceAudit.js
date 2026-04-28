import { createIssue } from "./issueFactory.js";

export default function ecommerceAudit(pages, siteProfile) {
  const issues = [];
  const productPages = pages.filter((page) => page.classification?.pageType === "product");
  const hasEcommerce = siteProfile.detectedCategories.includes("ecommerce");

  if (hasEcommerce && productPages.length === 0) {
    issues.push(createIssue({
      severity: "medium",
      category: "ecommerce",
      type: "no_product_pages_crawled",
      url: "",
      message: "Ecommerce signals were detected, but no product pages were classified in the crawl.",
      recommendation: "Review sitemap selection and product URL patterns so product pages are included."
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
