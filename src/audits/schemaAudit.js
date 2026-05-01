import { createIssue } from "./issueFactory.js";
import { getMissingProductSchemaFields } from "../analyzer/schemaQuality.js";

export default function schemaAudit(pages) {
  const issues = [];

  pages.forEach((page) => {
    if (page.fetchError) return;

    if (!page.schema?.types?.length) {
      issues.push(createIssue({
        severity: "medium",
        category: "schema",
        type: "missing_schema",
        url: page.url,
        message: "Page has no detected schema markup.",
        recommendation: "Add structured data that matches the page type."
      }));
    }

    if (page.schema?.jsonLdParseErrors > 0) {
      issues.push(createIssue({
        severity: "high",
        category: "schema",
        type: "jsonld_parse_error",
        url: page.url,
        message: `Page has ${page.schema.jsonLdParseErrors} JSON-LD parse error(s).`,
        recommendation: "Validate and fix malformed JSON-LD."
      }));
    }

    if (page.classification?.pageType === "article" && !page.schema?.hasArticleSchema) {
      issues.push(createIssue({
        severity: "medium",
        category: "schema",
        type: "article_page_missing_article_schema",
        url: page.url,
        message: "Article-like page is missing Article or BlogPosting schema.",
        recommendation: "Add Article or BlogPosting schema with headline, author, datePublished, dateModified, and image."
      }));
    }

    if (page.classification?.pageType === "product" && !page.schema?.hasProductSchema) {
      issues.push(createIssue({
        severity: "high",
        category: "schema",
        type: "product_page_missing_product_schema",
        url: page.url,
        message: "Product-like page is missing Product schema.",
        recommendation: "Add Product schema with name, image, price, availability, and SKU where applicable."
      }));
    }

    if (page.classification?.pageType === "product" && page.schema?.hasProductSchema) {
      getMissingProductSchemaFields(page.schema).forEach((field) => {
        issues.push(createIssue({
          severity: field === "price" || field === "availability" ? "high" : "medium",
          category: "schema",
          type: `missing_product_${field}`,
          url: page.url,
          message: `Product schema is missing ${field}.`,
          recommendation: "Add complete Product schema fields: price, availability, brand, and rating/review data where available."
        }));
      });
    }
  });

  return issues;
}
