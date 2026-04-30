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
