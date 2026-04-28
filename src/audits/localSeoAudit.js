import { createIssue } from "./issueFactory.js";

export default function localSeoAudit(pages, siteProfile) {
  const issues = [];
  const localPages = pages.filter((page) =>
    ["local_page", "service_page", "contact_page"].includes(page.classification?.pageType)
  );
  const contactPages = pages.filter((page) => page.classification?.pageType === "contact_page");

  if (siteProfile.detectedCategories.includes("local_service") && contactPages.length === 0) {
    issues.push(createIssue({
      severity: "medium",
      category: "local_seo",
      type: "missing_contact_page",
      url: "",
      message: "Local/service site signals were detected, but no contact page was classified.",
      recommendation: "Ensure the contact page is crawlable and linked internally."
    }));
  }

  localPages.forEach((page) => {
    if (!page.schema?.hasLocalBusinessSchema && page.classification?.pageType !== "service_page") {
      issues.push(createIssue({
        severity: "medium",
        category: "local_seo",
        type: "missing_localbusiness_schema",
        url: page.url,
        message: "Local page is missing LocalBusiness schema.",
        recommendation: "Add LocalBusiness schema with consistent name, address, phone, and URL."
      }));
    }

    if (!page.wordpress?.localSignals?.includes("phone-link") && page.classification?.pageType === "contact_page") {
      issues.push(createIssue({
        severity: "low",
        category: "local_seo",
        type: "contact_page_missing_phone_link",
        url: page.url,
        message: "Contact page does not expose a detected telephone link.",
        recommendation: "Add a clickable tel: phone link if phone contact is relevant."
      }));
    }
  });

  return issues;
}
