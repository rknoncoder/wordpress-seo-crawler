import { createIssue } from "./issueFactory.js";

export default function courseAudit(pages) {
  return pages
    .filter((page) => page.classification?.pageType === "course")
    .flatMap((page) => {
      if (page.schema?.hasCourseSchema) {
        return [];
      }

      return [
        createIssue({
          severity: "medium",
          category: "course",
          type: "missing_course_schema",
          url: page.url,
          message: "Course page is missing Course schema.",
          recommendation: "Add Course schema with name, description, provider, and relevant offer details."
        })
      ];
    });
}
