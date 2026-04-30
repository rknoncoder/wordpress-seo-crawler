export default function schemaExtractor($) {
  const jsonLd = extractJsonLd($);
  const microdataTypes = extractMicrodataTypes($);
  const schemaTypes = [...new Set([...jsonLd.types, ...microdataTypes])];
  const globalTypes = filterSchemaTypes(schemaTypes, GLOBAL_SCHEMA_TYPES);
  const pageLevelTypes = schemaTypes.filter((schemaType) => !GLOBAL_SCHEMA_TYPES.has(schemaType));
  const articleDetails = extractArticleDetails($, jsonLd.nodes);
  const productDetails = extractProductDetails($, jsonLd.nodes);
  const source = detectSchemaSource($, schemaTypes);

  return {
    schema: {
      types: schemaTypes,
      globalTypes,
      pageLevelTypes,
      jsonLdCount: jsonLd.count,
      jsonLdParseErrors: jsonLd.parseErrors,
      invalidStructureCount: jsonLd.invalidStructures,
      microdataTypes,
      schemaTypeCounts: countSchemaTypes([...jsonLd.allTypes, ...microdataTypes]),
      sourceType: source.sourceType,
      sourceName: source.sourceName,
      injectedByApp: source.injectedByApp,
      sourceEvidence: source.evidence,
      hasArticleSchema: hasSchemaType(pageLevelTypes, ["Article", "BlogPosting", "NewsArticle"]),
      hasArticleAuthor: articleDetails.hasAuthor,
      hasArticlePublishedDate: articleDetails.hasPublishedDate,
      hasProductSchema: hasSchemaType(pageLevelTypes, ["Product"]),
      hasProductPrice: productDetails.hasPrice,
      hasProductRating: productDetails.hasRating,
      hasLocalBusinessSchema: hasSchemaType(pageLevelTypes, ["LocalBusiness"]),
      hasOrganizationSchema: hasSchemaType(globalTypes, ["Organization"]),
      hasCourseSchema: hasSchemaType(pageLevelTypes, ["Course"]),
      hasBreadcrumbSchema: hasSchemaType(globalTypes, ["BreadcrumbList"]),
      hasFaqSchema: hasSchemaType(pageLevelTypes, ["FAQPage"])
    }
  };
}

const GLOBAL_SCHEMA_TYPES = new Set([
  "BreadcrumbList",
  "ListItem",
  "Organization",
  "Person",
  "SearchAction",
  "WebPage",
  "WebSite"
]);

function extractJsonLd($) {
  const types = [];
  const nodes = [];
  let count = 0;
  let parseErrors = 0;
  let invalidStructures = 0;

  $('script[type="application/ld+json"]').each((_, element) => {
    count += 1;
    const rawJson = $(element).contents().text().trim();

    if (!rawJson) {
      return;
    }

    try {
      const parsedJson = JSON.parse(rawJson);
      if (!parsedJson || (typeof parsedJson !== "object" && !Array.isArray(parsedJson))) {
        invalidStructures += 1;
        return;
      }

      collectSchemaNodes(parsedJson, nodes);
    } catch {
      parseErrors += 1;
    }
  });

  return {
    count,
    parseErrors,
    invalidStructures,
    nodes,
    allTypes: nodes.map((node) => node.type).filter(Boolean),
    types: [...new Set(nodes.map((node) => node.type).filter(Boolean))]
  };
}

function extractArticleDetails($, jsonLdNodes) {
  const articleNodes = jsonLdNodes.filter((node) =>
    ["Article", "BlogPosting", "NewsArticle"].includes(node.type)
  );

  const hasAuthorInJsonLd = articleNodes.some((node) => hasValue(node.raw?.author));
  const hasPublishedDateInJsonLd = articleNodes.some((node) => hasValue(node.raw?.datePublished));
  const hasAuthorMicrodata = $('[itemtype*="Article"] [itemprop="author"], [itemprop="author"]').length > 0;
  const hasPublishedDateMicrodata = $('[itemtype*="Article"] [itemprop="datePublished"], [itemprop="datePublished"]').length > 0;

  return {
    hasAuthor: hasAuthorInJsonLd || hasAuthorMicrodata,
    hasPublishedDate: hasPublishedDateInJsonLd || hasPublishedDateMicrodata
  };
}

function extractProductDetails($, jsonLdNodes) {
  const productNodes = jsonLdNodes.filter((node) => node.type === "Product");
  const hasPriceInJsonLd = productNodes.some((node) =>
    hasValue(node.raw?.price) || hasValue(node.raw?.offers?.price) || hasOfferArrayPrice(node.raw?.offers)
  );
  const hasRatingInJsonLd = productNodes.some((node) =>
    hasValue(node.raw?.aggregateRating?.ratingValue) || hasValue(node.raw?.review)
  );
  const hasPriceMicrodata = $('[itemtype*="Product"] [itemprop="price"], [itemprop="price"]').length > 0;
  const hasRatingMicrodata = $('[itemtype*="Product"] [itemprop="ratingValue"], [itemprop="ratingValue"]').length > 0;

  return {
    hasPrice: hasPriceInJsonLd || hasPriceMicrodata,
    hasRating: hasRatingInJsonLd || hasRatingMicrodata
  };
}

function collectSchemaNodes(value, nodes) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaNodes(item, nodes));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const rawTypes = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  rawTypes
    .map(normalizeSchemaType)
    .filter(Boolean)
    .forEach((type) => nodes.push({ type, raw: value }));

  if (value["@graph"]) {
    collectSchemaNodes(value["@graph"], nodes);
  }
}

function hasValue(value) {
  if (Array.isArray(value)) {
    return value.some(hasValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return Boolean(value);
}

function hasOfferArrayPrice(offers) {
  return Array.isArray(offers) && offers.some((offer) => hasValue(offer?.price));
}

function countSchemaTypes(schemaTypes) {
  return schemaTypes.reduce((counts, schemaType) => {
    if (!schemaType) return counts;
    counts[schemaType] = (counts[schemaType] || 0) + 1;
    return counts;
  }, {});
}

function extractMicrodataTypes($) {
  return $('[itemtype]')
    .map((_, element) => normalizeSchemaType($(element).attr("itemtype") || ""))
    .get()
    .filter(Boolean);
}

function normalizeSchemaType(value) {
  if (!value) {
    return "";
  }

  return String(value).split("/").filter(Boolean).pop() || "";
}

function hasSchemaType(schemaTypes, targetTypes) {
  return schemaTypes.some((schemaType) => targetTypes.includes(schemaType));
}

function filterSchemaTypes(schemaTypes, targetTypes) {
  return schemaTypes.filter((schemaType) => targetTypes.has(schemaType));
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
