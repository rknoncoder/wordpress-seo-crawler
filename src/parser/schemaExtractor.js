export default function schemaExtractor($) {
  const jsonLd = extractJsonLd($);
  const microdataTypes = extractMicrodataTypes($);
  const schemaTypes = [...new Set([...jsonLd.types, ...microdataTypes])];

  return {
    schema: {
      types: schemaTypes,
      jsonLdCount: jsonLd.count,
      jsonLdParseErrors: jsonLd.parseErrors,
      microdataTypes,
      hasArticleSchema: hasSchemaType(schemaTypes, ["Article", "BlogPosting", "NewsArticle"]),
      hasProductSchema: hasSchemaType(schemaTypes, ["Product"]),
      hasLocalBusinessSchema: hasSchemaType(schemaTypes, ["LocalBusiness"]),
      hasOrganizationSchema: hasSchemaType(schemaTypes, ["Organization"]),
      hasCourseSchema: hasSchemaType(schemaTypes, ["Course"]),
      hasBreadcrumbSchema: hasSchemaType(schemaTypes, ["BreadcrumbList"]),
      hasFaqSchema: hasSchemaType(schemaTypes, ["FAQPage"])
    }
  };
}

function extractJsonLd($) {
  const types = [];
  let count = 0;
  let parseErrors = 0;

  $('script[type="application/ld+json"]').each((_, element) => {
    count += 1;
    const rawJson = $(element).contents().text().trim();

    if (!rawJson) {
      return;
    }

    try {
      collectSchemaTypes(JSON.parse(rawJson), types);
    } catch {
      parseErrors += 1;
    }
  });

  return {
    count,
    parseErrors,
    types: [...new Set(types)]
  };
}

function extractMicrodataTypes($) {
  return $('[itemtype]')
    .map((_, element) => normalizeSchemaType($(element).attr("itemtype") || ""))
    .get()
    .filter(Boolean);
}

function collectSchemaTypes(value, types) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaTypes(item, types));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const type = value["@type"];
  if (Array.isArray(type)) {
    type.forEach((item) => types.push(normalizeSchemaType(item)));
  } else if (type) {
    types.push(normalizeSchemaType(type));
  }

  if (value["@graph"]) {
    collectSchemaTypes(value["@graph"], types);
  }
}

function normalizeSchemaType(value) {
  return String(value).split("/").filter(Boolean).pop() || "";
}

function hasSchemaType(schemaTypes, targetTypes) {
  return schemaTypes.some((schemaType) => targetTypes.includes(schemaType));
}
