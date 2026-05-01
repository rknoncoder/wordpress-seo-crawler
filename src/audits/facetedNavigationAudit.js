import { createIssue } from "./issueFactory.js";
import { detectFacetedUrl } from "../utils/facetedUrl.js";

export default function facetedNavigationAudit(pages) {
  const issues = [];

  pages.forEach((page) => {
    const facetedUrl = page.isFacetedUrl ? {
      isFacetedUrl: true,
      facetQueryParams: page.facetQueryParams || []
    } : detectFacetedUrl(page.url || page.finalUrl || page.requestedUrl);

    if (!facetedUrl.isFacetedUrl) {
      return;
    }

    if (page.fetchError || page.status >= 400) {
      return;
    }

    const hasNoindex = Boolean(page.isNoindex);
    const hasCanonical = Boolean(page.canonical);

    if (!hasNoindex && !hasCanonical) {
      issues.push(createIssue({
        severity: "high",
        category: "faceted_navigation",
        type: "faceted_url_missing_noindex_or_canonical",
        url: page.url,
        message: "Faceted/filter URL is indexable and has no canonical URL.",
        recommendation: "Add noindex or canonicalize the filtered URL to the preferred clean category URL.",
        evidence: facetedUrl.facetQueryParams.join(", ")
      }));
      return;
    }

    if (!hasNoindex && hasCanonical && isSameUrl(page.url, page.canonical)) {
      issues.push(createIssue({
        severity: "medium",
        category: "faceted_navigation",
        type: "faceted_url_self_canonical",
        url: page.url,
        message: "Faceted/filter URL has a self-referencing canonical and is not noindexed.",
        recommendation: "For non-primary filter combinations, use noindex or canonicalize to the preferred clean category URL.",
        evidence: page.canonical
      }));
    }
  });

  return issues;
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
