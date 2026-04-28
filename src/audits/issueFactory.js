export function createIssue({ severity, category, type, url, message, recommendation, evidence = "" }) {
  return {
    severity,
    category,
    type,
    url,
    message,
    recommendation,
    evidence
  };
}
