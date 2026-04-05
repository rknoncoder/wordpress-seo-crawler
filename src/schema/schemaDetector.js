import * as cheerio from "cheerio";

export default function schemaDetector(html) {
  const $ = cheerio.load(html || "");
  const schemas = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const content = $(element).html()?.trim();

    if (!content) {
      return;
    }

    const parsed = parseJson(content);
    if (parsed === null) {
      return;
    }

    normalizeSchemas(parsed).forEach((schema) => {
      schemas.push({
        type: extractSchemaType(schema),
        raw: schema
      });
    });
  });

  return { schemas };
}

function parseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function normalizeSchemas(parsed) {
  if (Array.isArray(parsed)) {
    return parsed.filter(isObjectLike);
  }

  if (isObjectLike(parsed) && Array.isArray(parsed["@graph"])) {
    return parsed["@graph"].filter(isObjectLike);
  }

  return isObjectLike(parsed) ? [parsed] : [];
}

function extractSchemaType(schema) {
  const type = schema?.["@type"];

  if (Array.isArray(type)) {
    return type.join(", ");
  }

  return typeof type === "string" ? type : "";
}

function isObjectLike(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
