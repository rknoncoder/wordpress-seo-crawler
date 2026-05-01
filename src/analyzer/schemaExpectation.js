const EXPECTED_SCHEMA_BY_PAGE_TYPE = {
  article: "Article",
  product: "Product",
  local_page: "LocalBusiness",
  contact_page: "LocalBusiness"
};

export default function validateExpectedSchema(pageData) {
  if (pageData.fetchError || pageData.classification?.pageType === "fetch_error") {
    return {
      expectedSchema: "",
      foundSchema: [],
      status: "not_checked"
    };
  }

  const pageType = pageData.classification?.pageType || "";

  if (pageType === "product_collection_page") {
    return validateProductCollectionSchema(pageData);
  }

  const expectedSchema = EXPECTED_SCHEMA_BY_PAGE_TYPE[pageType] || "";
  const foundSchema = pageData.schema?.pageLevelTypes || pageData.schema?.types || [];

  if (!expectedSchema) {
    return {
      expectedSchema: "",
      foundSchema,
      status: "not_applicable"
    };
  }

  const hasExpectedSchema = foundSchema.includes(expectedSchema);

  return {
    expectedSchema,
    foundSchema,
    status: hasExpectedSchema ? "valid" : getMissingStatus(foundSchema)
  };
}

function getMissingStatus(foundSchema) {
  return foundSchema.length > 0 ? "partial" : "missing";
}

function validateProductCollectionSchema(pageData) {
  const allSchemaTypes = pageData.schema?.types || [];
  const foundSchema = allSchemaTypes.filter((schemaType) =>
    ["CollectionPage", "ItemList", "BreadcrumbList"].includes(schemaType)
  );
  const hasCollectionSchema = allSchemaTypes.includes("CollectionPage") || allSchemaTypes.includes("ItemList");
  const hasBreadcrumbSchema = allSchemaTypes.includes("BreadcrumbList");

  return {
    expectedSchema: "CollectionPage or ItemList + BreadcrumbList; FAQPage optional",
    foundSchema,
    status: getProductCollectionStatus(hasCollectionSchema, hasBreadcrumbSchema)
  };
}

function getProductCollectionStatus(hasCollectionSchema, hasBreadcrumbSchema) {
  if (hasCollectionSchema && hasBreadcrumbSchema) {
    return "valid";
  }

  if (hasCollectionSchema || hasBreadcrumbSchema) {
    return "partial";
  }

  return "missing";
}
