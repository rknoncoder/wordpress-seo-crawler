export default function checkCanonical(pageData) {
  const issues = [];
  const canonical = typeof pageData.canonical === "string" ? pageData.canonical.trim() : "";
  const canonicalTagCount = pageData.canonicalTagCount ?? 0;

  if (!canonical) {
    issues.push({
      type: "missing_canonical",
      severity: "high"
    });
  }

  if (canonicalTagCount > 1) {
    issues.push({
      type: "multiple_canonical_tags",
      severity: "high"
    });
  }

  if (canonical && isCanonicalMismatch(pageData.url, canonical)) {
    issues.push({
      type: "canonical_mismatch",
      severity: "medium"
    });
  }

  return {
    url: pageData.url || "",
    canonical,
    issues
  };
}

function isCanonicalMismatch(pageUrl, canonicalUrl) {
  const normalizedPageUrl = normalizeUrl(pageUrl, pageUrl);
  const normalizedCanonicalUrl = normalizeUrl(canonicalUrl, pageUrl);

  if (!normalizedPageUrl || !normalizedCanonicalUrl) {
    return canonicalUrl.trim() !== (pageUrl || "").trim();
  }

  return normalizedPageUrl !== normalizedCanonicalUrl;
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
