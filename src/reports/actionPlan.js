const SEVERITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2
};

export default function buildActionPlan(issues, pages, siteProfile) {
  const pagesByUrl = new Map(pages.map((page) => [page.url, page]));
  const groupedIssues = groupIssuesByUrl(issues);

  return [...groupedIssues.entries()]
    .map(([url, pageIssues]) => buildActionPlanRow(url, pageIssues, pagesByUrl.get(url), siteProfile))
    .sort(compareActionRows);
}

function groupIssuesByUrl(issues) {
  return issues.reduce((groups, issue) => {
    const key = issue.url || "site-wide";

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(issue);
    return groups;
  }, new Map());
}

function buildActionPlanRow(url, issues, page, siteProfile) {
  const severityCounts = countBy(issues, (issue) => issue.severity || "unknown");
  const topIssue = [...issues].sort(compareIssues)[0];

  return {
    priority: getPriority(topIssue?.severity),
    category: topIssue?.category || "unknown",
    url: url === "site-wide" ? "" : url,
    pageType: page?.classification?.pageType || (url === "site-wide" ? "site-wide" : "unknown"),
    issueCount: issues.length,
    highIssues: severityCounts.high || 0,
    mediumIssues: severityCounts.medium || 0,
    lowIssues: severityCounts.low || 0,
    topIssueType: topIssue?.type || "",
    action: getRecommendedAction(topIssue, page, siteProfile),
    reason: topIssue?.message || "",
    relatedIssueTypes: [...new Set(issues.map((issue) => issue.type).filter(Boolean))].join(", ")
  };
}

function getPriority(severity) {
  if (severity === "high") return "Do first";
  if (severity === "medium") return "Do next";
  if (severity === "low") return "Review later";
  return "Review";
}

function getRecommendedAction(issue, page, siteProfile) {
  if (!issue) {
    return "";
  }

  if (issue.recommendation) {
    return issue.recommendation;
  }

  if (issue.category === "ecommerce" || page?.classification?.pageType === "product") {
    return "Review product SEO fields and Product schema.";
  }

  if (issue.category === "local_seo" || siteProfile.detectedCategories?.includes("local_service")) {
    return "Review local business NAP, contact details, and LocalBusiness schema.";
  }

  if (issue.category === "article" || page?.classification?.pageType === "article") {
    return "Review article metadata, Open Graph fields, and Article schema.";
  }

  if (issue.category === "course" || page?.classification?.pageType === "course") {
    return "Review course metadata and Course schema.";
  }

  return "Review the page and fix the listed SEO issue.";
}

function compareActionRows(first, second) {
  const priorityDiff = priorityValue(first.priority) - priorityValue(second.priority);
  if (priorityDiff !== 0) return priorityDiff;

  const highDiff = second.highIssues - first.highIssues;
  if (highDiff !== 0) return highDiff;

  const totalDiff = second.issueCount - first.issueCount;
  if (totalDiff !== 0) return totalDiff;

  return first.url.localeCompare(second.url);
}

function compareIssues(first, second) {
  return severityValue(first.severity) - severityValue(second.severity);
}

function priorityValue(priority) {
  if (priority === "Do first") return 0;
  if (priority === "Do next") return 1;
  if (priority === "Review later") return 2;
  return 3;
}

function severityValue(severity) {
  return SEVERITY_ORDER[severity] ?? 3;
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}
