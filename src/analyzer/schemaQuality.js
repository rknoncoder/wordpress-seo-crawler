const DUPLICATE_IGNORED_TYPES = new Set([
  "AggregateRating",
  "BreadcrumbList",
  "ImageObject",
  "ListItem",
  "Organization",
  "Offer",
  "Person",
  "Quotation",
  "Rating",
  "Review",
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

  const missingProductFields = getMissingProductSchemaFields(schema);

  missingProductFields.forEach((field) => {
    issues.add(`missing_product_${field}`);
  });

  if (hasEmptySchemaFields(schema) || missingProductFields.length > 0) {
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

  if (schema.hasProductSchema && getMissingProductSchemaFields(schema).length > 0) {
    return true;
  }

  return false;
}

export function getMissingProductSchemaFields(schema = {}) {
  if (!schema.hasProductSchema) {
    return [];
  }

  return [
    ["price", schema.hasProductPrice],
    ["availability", schema.hasProductAvailability],
    ["brand", schema.hasProductBrand],
    ["rating", schema.hasProductRating]
  ]
    .filter(([, hasField]) => !hasField)
    .map(([field]) => field);
}
