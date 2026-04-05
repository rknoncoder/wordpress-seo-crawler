const SUPPORTED_TYPES = new Set(["Organization", "LocalBusiness"]);

export default function schemaGenerator(input = {}, schemaType = "Organization") {
  if (!SUPPORTED_TYPES.has(schemaType)) {
    throw new Error(`Unsupported schema type: ${schemaType}`);
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": schemaType
  };

  const name = normalizeValue(input.name);
  const url = normalizeValue(input.url);
  const logo = normalizeValue(input.logo);

  if (name) {
    schema.name = name;
  }

  if (url) {
    schema.url = url;
  }

  if (logo) {
    schema.logo = logo;
  }

  return schema;
}

export function generateOrganizationSchema(input = {}) {
  return schemaGenerator(input, "Organization");
}

export function generateLocalBusinessSchema(input = {}) {
  return schemaGenerator(input, "LocalBusiness");
}

function normalizeValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}
