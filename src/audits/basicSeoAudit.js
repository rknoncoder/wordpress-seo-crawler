import { createIssue } from "./issueFactory.js";

export default function basicSeoAudit(pages) {
  const issues = [];
  const titles = new Map();
  const descriptions = new Map();

  pages.forEach((page) => {
    if (page.fetchError) {
      issues.push(createIssue({
        severity: "high",
        category: "technical",
        type: "fetch_error",
        url: page.url,
        message: `Page could not be fetched: ${page.fetchError}.`,
        recommendation: "Check whether the URL is intentionally blocked, removed, or returning an error."
      }));
      return;
    }

    if (page.status >= 400) {
      issues.push(createIssue({
        severity: "high",
        category: "technical",
        type: "http_error",
        url: page.url,
        message: `Page returned HTTP ${page.status}.`,
        recommendation: "Fix the URL, redirect it to a relevant page, or remove it from crawlable navigation/sitemaps."
      }));
    }

    if (!page.title) {
      issues.push(createIssue({
        severity: "high",
        category: "basic_seo",
        type: "missing_title",
        url: page.url,
        message: "Page is missing a title tag.",
        recommendation: "Add a unique, descriptive title tag."
      }));
    } else if (page.titleLength > 65) {
      issues.push(createIssue({
        severity: "medium",
        category: "basic_seo",
        type: "long_title",
        url: page.url,
        message: `Title is ${page.titleLength} characters long.`,
        recommendation: "Consider keeping important title text within roughly 50-65 characters.",
        evidence: page.title
      }));
    }

    if (!page.metaDescription) {
      issues.push(createIssue({
        severity: "medium",
        category: "basic_seo",
        type: "missing_meta_description",
        url: page.url,
        message: "Page is missing a meta description.",
        recommendation: "Add a unique summary that matches the page intent."
      }));
    } else if (page.metaDescriptionLength > 160) {
      issues.push(createIssue({
        severity: "low",
        category: "basic_seo",
        type: "long_meta_description",
        url: page.url,
        message: `Meta description is ${page.metaDescriptionLength} characters long.`,
        recommendation: "Consider shortening the meta description so the main value appears early.",
        evidence: page.metaDescription
      }));
    }

    if (!page.canonical) {
      issues.push(createIssue({
        severity: "medium",
        category: "technical",
        type: "missing_canonical",
        url: page.url,
        message: "Page is missing a canonical link.",
        recommendation: "Add a canonical URL to clarify the preferred indexable version."
      }));
    }

    if (page.isNoindex) {
      issues.push(createIssue({
        severity: "medium",
        category: "technical",
        type: "noindex_page",
        url: page.url,
        message: "Page has a noindex directive.",
        recommendation: "Confirm this page is intentionally excluded from search results.",
        evidence: page.robots
      }));
    }

    if (page.h1Count === 0) {
      issues.push(createIssue({
        severity: "medium",
        category: "basic_seo",
        type: "missing_h1",
        url: page.url,
        message: "Page is missing an H1.",
        recommendation: "Add one clear H1 that describes the page topic."
      }));
    } else if (page.h1Count > 1) {
      issues.push(createIssue({
        severity: "low",
        category: "basic_seo",
        type: "multiple_h1",
        url: page.url,
        message: `Page has ${page.h1Count} H1 headings.`,
        recommendation: "Use one primary H1 and structure subtopics under H2/H3 headings.",
        evidence: page.h1Text
      }));
    }

    if (page.imagesWithoutAlt > 0 || page.imagesWithEmptyAlt > 0) {
      issues.push(createIssue({
        severity: "medium",
        category: "basic_seo",
        type: "image_alt_issues",
        url: page.url,
        message: `Page has ${page.imagesWithoutAlt} images missing alt and ${page.imagesWithEmptyAlt} images with empty alt.`,
        recommendation: "Add descriptive alt text for meaningful images and keep decorative images intentionally empty."
      }));
    }

    if (page.wordCount > 0 && page.wordCount < 250 && !["contact_page", "shop_or_account_page"].includes(page.classification?.pageType)) {
      issues.push(createIssue({
        severity: "low",
        category: "content",
        type: "thin_content",
        url: page.url,
        message: `Page has only ${page.wordCount} words.`,
        recommendation: "Review whether the page sufficiently satisfies its search intent."
      }));
    }

    addDuplicateCandidate(titles, page.title, page.url);
    addDuplicateCandidate(descriptions, page.metaDescription, page.url);
  });

  addDuplicateIssues(issues, titles, "duplicate_title", "basic_seo", "Multiple pages share the same title.");
  addDuplicateIssues(issues, descriptions, "duplicate_meta_description", "basic_seo", "Multiple pages share the same meta description.");

  return issues;
}

function addDuplicateCandidate(map, value, url) {
  if (!value) return;
  const normalized = value.trim().toLowerCase();
  if (!map.has(normalized)) map.set(normalized, { value, urls: [] });
  map.get(normalized).urls.push(url);
}

function addDuplicateIssues(issues, map, type, category, message) {
  map.forEach(({ value, urls }) => {
    if (urls.length < 2) return;

    urls.forEach((url) => {
      issues.push(createIssue({
        severity: "medium",
        category,
        type,
        url,
        message,
        recommendation: "Make this metadata unique to the page intent.",
        evidence: value
      }));
    });
  });
}
