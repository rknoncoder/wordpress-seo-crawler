import checkCanonical from "./canonicalChecker.js";

export default function analyzeSeo(pageData) {
  const issues = [];

  if (!pageData.title || !pageData.title.trim()) {
    issues.push({
      type: "missing_title",
      severity: "high"
    });
  }

  if (!pageData.metaDescription || !pageData.metaDescription.trim()) {
    issues.push({
      type: "missing_meta_description",
      severity: "high"
    });
  }

  if ((pageData.h1Count || 0) === 0) {
    issues.push({
      type: "missing_h1",
      severity: "high"
    });
  }

  if ((pageData.h1Count || 0) > 1) {
    issues.push({
      type: "multiple_h1",
      severity: "medium"
    });
  }

  if ((pageData.imagesWithoutAlt || 0) > 0) {
    issues.push({
      type: "images_without_alt",
      severity: "medium"
    });
  }

  const canonicalAnalysis = checkCanonical(pageData);
  issues.push(...canonicalAnalysis.issues);

  return {
    url: pageData.url || "",
    issues
  };
}
