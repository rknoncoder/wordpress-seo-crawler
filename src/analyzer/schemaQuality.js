const DUPLICATE_IGNORED_TYPES = new Set([
  "BreadcrumbList",
  "ImageObject",
  "ListItem",
  "Organization",
  "Person",
  "SearchAction",
  "WebPage",
  "WebSite"
]);

export default function detectSchemaIssues(pageData) {
  const issues = new Set();
  const schema = pageData.schema || {};

  if (schema.jsonLdParseErrors > 0 || schema.invalidStructureCount > 0) {
    issues.add("invalid_structure");
  }

  if (hasDuplicateSchema(schema.schemaTypeCounts)) {
    issues.add("duplicate_schema");
  }

  if (hasEmptySchemaFields(schema)) {
    issues.add("empty_fields");
  }

  return [...issues];
}

function hasDuplicateSchema(schemaTypeCounts = {}) {
  return Object.entries(schemaTypeCounts).some(([schemaType, count]) =>
    !DUPLICATE_IGNORED_TYPES.has(schemaType) && count > 1
  );
}

function hasEmptySchemaFields(schema) {
  if (schema.hasArticleSchema && (!schema.hasArticleAuthor || !schema.hasArticlePublishedDate)) {
    return true;
  }

  if (schema.hasProductSchema && (!schema.hasProductPrice || !schema.hasProductRating)) {
    return true;
  }

  return false;
}
