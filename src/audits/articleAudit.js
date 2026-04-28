import { createIssue } from "./issueFactory.js";

export default function articleAudit(pages) {
  return pages
    .filter((page) => page.classification?.pageType === "article")
    .flatMap((page) => {
      const issues = [];

      if (!page.schema?.hasArticleSchema) {
        issues.push(createIssue({
          severity: "medium",
          category: "article",
          type: "missing_article_schema",
          url: page.url,
          message: "Article page is missing Article or BlogPosting schema.",
          recommendation: "Add Article/BlogPosting schema to improve article understanding."
        }));
      }

      if (!page.openGraph?.image) {
        issues.push(createIssue({
          severity: "low",
          category: "article",
          type: "missing_og_image",
          url: page.url,
          message: "Article page is missing an Open Graph image.",
          recommendation: "Add an og:image so shared links render with a relevant preview."
        }));
      }

      if (!page.metaDescription) {
        issues.push(createIssue({
          severity: "medium",
          category: "article",
          type: "article_missing_meta_description",
          url: page.url,
          message: "Article is missing a meta description.",
          recommendation: "Add a concise summary that describes the article's value."
        }));
      }

      return issues;
    });
}
