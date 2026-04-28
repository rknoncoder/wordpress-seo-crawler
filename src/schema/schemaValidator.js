const REQUIRED_FIELDS = {
  Article: ["headline"],
  BlogPosting: ["headline"],
  FAQPage: ["mainEntity"],
  LocalBusiness: ["name"],
  Organization: ["name"],
  Person: ["name"],
  Product: ["name"],
  WebPage: ["name"],
  WebSite: ["name", "url"]
};

export default function schemaValidator(schema) {
  const rawSchema = normalizeSchema(schema);
  const issues = [];
  const schemaTypes = getSchemaTypes(rawSchema);

  if (schemaTypes.length === 0) {
    issues.push({
      type: "missing_schema_type",
      field: "@type"
    });
  }

  const requiredFields = getRequiredFields(schemaTypes);

  requiredFields.forEach((field) => {
    if (isMissingField(rawSchema, field)) {
      issues.push({
        type: "missing_required_field",
        field
      });
    }
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

function normalizeSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return {};
  }

  if (schema.raw && typeof schema.raw === "object" && !Array.isArray(schema.raw)) {
    return schema.raw;
  }

  return schema;
}

function getSchemaTypes(schema) {
  const type = schema?.["@type"];

  if (Array.isArray(type)) {
    return type.filter((value) => typeof value === "string" && value.trim());
  }

  if (typeof type === "string" && type.trim()) {
    return [type.trim()];
  }

  return [];
}

function getRequiredFields(schemaTypes) {
  const requiredFields = new Set();

  schemaTypes.forEach((schemaType) => {
    const fields = REQUIRED_FIELDS[schemaType] || [];
    fields.forEach((field) => requiredFields.add(field));
  });

  return [...requiredFields];
}

function isMissingField(schema, field) {
  const value = schema?.[field];

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return value === undefined || value === null;
}
