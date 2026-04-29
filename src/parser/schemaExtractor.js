export default function schemaExtractor($) {
  const jsonLd = extractJsonLd($);
  const microdataTypes = extractMicrodataTypes($);
  const schemaTypes = [...new Set([...jsonLd.types, ...microdataTypes])];
  const source = detectSchemaSource($, schemaTypes);

  return {
    schema: {
      types: schemaTypes,
      jsonLdCount: jsonLd.count,
      jsonLdParseErrors: jsonLd.parseErrors,
      microdataTypes,
      sourceType: source.sourceType,
      sourceName: source.sourceName,
      injectedByApp: source.injectedByApp,
      sourceEvidence: source.evidence,
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

function detectSchemaSource($, schemaTypes) {
  if (schemaTypes.length === 0) {
    return buildSchemaSource("none", "", false, []);
  }

  const html = $.html().toLowerCase();
  const schemaScripts = $('script[type="application/ld+json"]')
    .map((_, element) => {
      const script = $(element);
      return [
        script.attr("id") || "",
        script.attr("class") || "",
        script.contents().text() || ""
      ].join(" ");
    })
    .get()
    .join(" ")
    .toLowerCase();
  const sourceText = `${html} ${schemaScripts}`;
  const pluginSource = detectPluginSchemaSource(sourceText);

  if (pluginSource) {
    return buildSchemaSource("plugin", pluginSource.name, true, pluginSource.evidence);
  }

  if (html.includes("/wp-content/themes/")) {
    return buildSchemaSource("theme_or_custom", "WordPress theme/custom code", false, ["theme-assets"]);
  }

  if (html.includes("wp-content") || html.includes("wp-includes")) {
    return buildSchemaSource("manual_or_unknown", "WordPress unknown source", false, ["wordpress-markup"]);
  }

  return buildSchemaSource("manual_or_unknown", "Unknown source", false, ["schema-markup"]);
}

function detectPluginSchemaSource(sourceText) {
  const definitions = [
    {
      name: "Yoast SEO",
      patterns: ["yoast-schema-graph", "yoast seo", "/wp-content/plugins/wordpress-seo/", "wpseo"]
    },
    {
      name: "Rank Math",
      patterns: ["rank-math-schema", "rank math", "/wp-content/plugins/seo-by-rank-math/", "rankmath"]
    },
    {
      name: "All in One SEO",
      patterns: ["aioseo-schema", "all in one seo", "/wp-content/plugins/all-in-one-seo-pack/", "aioseo"]
    },
    {
      name: "SEOPress",
      patterns: ["seopress", "/wp-content/plugins/wp-seopress/"]
    },
    {
      name: "The SEO Framework",
      patterns: ["the-seo-framework", "autodescription", "/wp-content/plugins/autodescription/"]
    },
    {
      name: "Schema Pro",
      patterns: ["schema-pro", "/wp-content/plugins/schema-pro/"]
    },
    {
      name: "WooCommerce",
      patterns: ["woocommerce", "/wp-content/plugins/woocommerce/"]
    }
  ];

  const match = definitions.find((definition) =>
    definition.patterns.some((pattern) => sourceText.includes(pattern))
  );

  if (!match) {
    return null;
  }

  return {
    name: match.name,
    evidence: match.patterns.filter((pattern) => sourceText.includes(pattern)).slice(0, 5)
  };
}

function buildSchemaSource(sourceType, sourceName, injectedByApp, evidence) {
  return {
    sourceType,
    sourceName,
    injectedByApp,
    evidence
  };
}
