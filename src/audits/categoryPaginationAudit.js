import { createIssue } from "./issueFactory.js";

const CATEGORY_PAGE_TYPES = new Set([
  "product_collection_page",
  "blog_index"
]);

export default function categoryPaginationAudit(pages) {
  const issues = [];
  const categoryPages = pages.filter((page) => CATEGORY_PAGE_TYPES.has(page.classification?.pageType));

  categoryPages.forEach((page) => {
    if (page.fetchError || page.status >= 400) {
      return;
    }

    addCanonicalIssues(issues, page);
    addRelPaginationIssues(issues, page);
  });

  addDuplicateCategoryIssues(
    issues,
    categoryPages,
    (page) => page.title,
    "category_duplicate_title",
    "Multiple category/collection pages share the same title."
  );
  addDuplicateCategoryIssues(
    issues,
    categoryPages,
    (page) => page.metaDescription,
    "category_duplicate_meta_description",
    "Multiple category/collection pages share the same meta description."
  );

  return issues;
}

function addCanonicalIssues(issues, page) {
  if (!page.canonical) {
    issues.push(createIssue({
      severity: "medium",
      category: "category_pagination",
      type: "category_missing_canonical",
      url: page.url,
      message: "Category/collection page is missing a canonical URL.",
      recommendation: "Add a self-referencing canonical URL for the category page unless it is intentionally consolidated."
    }));
    return;
  }

  if (isPaginatedUrl(page.url) && !isSameUrl(page.url, page.canonical)) {
    issues.push(createIssue({
      severity: "medium",
      category: "category_pagination",
      type: "paginated_canonical_mismatch",
      url: page.url,
      message: "Paginated category URL canonicalizes to a different URL.",
      recommendation: "For crawlable paginated category pages, usually use a self-referencing canonical on each page in the sequence.",
      evidence: page.canonical
    }));
  }
}

function addRelPaginationIssues(issues, page) {
  const hasPaginationSignals = isPaginatedUrl(page.url) || page.paginationLinkCount > 0 || page.relNext || page.relPrev;

  if (!hasPaginationSignals) {
    return;
  }

  if (isPaginatedUrl(page.url) && !page.relPrev) {
    issues.push(createIssue({
      severity: "low",
      category: "category_pagination",
      type: "missing_rel_prev",
      url: page.url,
      message: "Paginated category URL does not expose rel=prev.",
      recommendation: "Add rel=prev for paginated category sequences when previous pages exist."
    }));
  }

  if (!page.relNext && page.paginationLinkCount > 0) {
    issues.push(createIssue({
      severity: "low",
      category: "category_pagination",
      type: "missing_rel_next",
      url: page.url,
      message: "Category page has pagination links but does not expose rel=next.",
      recommendation: "Add rel=next for category pages that continue into another paginated URL."
    }));
  }
}

function addDuplicateCategoryIssues(issues, pages, getValue, type, message) {
  const groups = new Map();

  pages.forEach((page) => {
    if (page.fetchError || page.status >= 400) {
      return;
    }

    const value = getValue(page);
    if (!value) {
      return;
    }

    const normalized = value.trim().toLowerCase();
    if (!groups.has(normalized)) {
      groups.set(normalized, { value, pages: [] });
    }

    groups.get(normalized).pages.push(page);
  });

  groups.forEach(({ value, pages: groupedPages }) => {
    if (groupedPages.length < 2) {
      return;
    }

    groupedPages.forEach((page) => {
      issues.push(createIssue({
        severity: "medium",
        category: "category_pagination",
        type,
        url: page.url,
        message,
        recommendation: "Make category titles and meta descriptions unique, especially across paginated or filtered collection pages.",
        evidence: value
      }));
    });
  });
}

function isPaginatedUrl(url) {
  return /(?:[?&](?:page|paged|p)=\d+\b|\/page\/\d+\/?$|\/page-\d+\/?$)/i.test(url || "");
}

function isSameUrl(firstUrl, secondUrl) {
  const first = normalizeUrl(firstUrl, firstUrl);
  const second = normalizeUrl(secondUrl, firstUrl);
  return Boolean(first && second && first === second);
}

function normalizeUrl(url, baseUrl) {
  if (typeof url !== "string" || !url.trim()) {
    return "";
  }

  try {
    const parsedUrl = new URL(url, baseUrl);
    parsedUrl.hash = "";
    return parsedUrl.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}
