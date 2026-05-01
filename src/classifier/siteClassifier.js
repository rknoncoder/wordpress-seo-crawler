export default function classifySite(pages) {
  const pageTypeCounts = countBy(pages, (page) => page.classification?.pageType || "unknown");
  const wordpressEvidencePages = pages.filter(hasWordPressEvidence);
  const pluginNames = collectUnique(wordpressEvidencePages, (page) => page.wordpress?.plugins);
  const seoPlugins = collectUnique(wordpressEvidencePages, (page) => page.wordpress?.seoPlugins);
  const ecommercePlugins = collectUnique(wordpressEvidencePages, (page) => page.wordpress?.ecommercePlugins);
  const lmsPlugins = collectUnique(wordpressEvidencePages, (page) => page.wordpress?.lmsPlugins);
  const builders = collectUnique(wordpressEvidencePages, (page) => page.wordpress?.builders);
  const themeSlugs = collectUnique(wordpressEvidencePages, (page) => page.wordpress?.themes);
  const schemaTypes = collectUnique(pages, (page) => page.schema?.types);
  const globalSchemaTypes = collectUnique(pages, (page) => page.schema?.globalTypes);
  const pageLevelSchemaTypes = collectUnique(pages, (page) => page.schema?.pageLevelTypes);
  const detectedCategories = detectSiteCategories(pages, pageTypeCounts, {
    ecommercePlugins,
    lmsPlugins,
    pageLevelSchemaTypes
  });
  const modulesToRun = detectModules(detectedCategories);

  return {
    totalPagesCrawled: pages.length,
    detectedCategories,
    primaryCategory: detectPrimaryCategory(pageTypeCounts, detectedCategories),
    modulesToRun,
    pageTypeCounts,
    wordpress: {
      isWordPress: wordpressEvidencePages.length > 0,
      plugins: pluginNames,
      seoPlugins,
      ecommercePlugins,
      lmsPlugins,
      builders,
      themes: themeSlugs
    },
    schemaTypes,
    globalSchemaTypes,
    pageLevelSchemaTypes,
    evidence: buildEvidence(pages, pageTypeCounts, {
      ecommercePlugins,
      lmsPlugins,
      schemaTypes,
      globalSchemaTypes,
      pageLevelSchemaTypes
    })
  };
}

function hasWordPressEvidence(page) {
  const signals = page.wordpress?.signals || [];

  return (
    signals.includes("meta-generator") ||
    signals.includes("wp-json") ||
    signals.includes("wp-login") ||
    signals.includes("plugin-assets") ||
    signals.includes("theme-assets") ||
    (page.wordpress?.plugins?.length || 0) > 0 ||
    (page.wordpress?.themes?.length || 0) > 0
  );
}

function detectSiteCategories(pages, pageTypeCounts, context) {
  const categories = [];

  if (pageTypeCounts.product > 0 || pageTypeCounts.product_collection_page > 0 || context.ecommercePlugins.length > 0) {
    categories.push("ecommerce");
  }

  if (pageTypeCounts.course > 0 || context.lmsPlugins.length > 0) {
    categories.push("course");
  }

  if (pageTypeCounts.local_page > 0 || pageTypeCounts.contact_page > 0 || (pageTypeCounts.service_page || 0) >= 3) {
    categories.push("local_service");
  }

  if (pageTypeCounts.article > 0 || pageTypeCounts.blog_index > 0) {
    categories.push("blog_news");
  }

  if (
    pageTypeCounts.business_page > 0 ||
    pageTypeCounts.contact_page > 0 ||
    context.pageLevelSchemaTypes.includes("LocalBusiness")
  ) {
    categories.push("business");
  }

  return [...new Set(categories)];
}

function detectPrimaryCategory(pageTypeCounts, detectedCategories) {
  const candidates = [
    { category: "blog_news", count: (pageTypeCounts.article || 0) + (pageTypeCounts.blog_index || 0) },
    { category: "local_service", count: (pageTypeCounts.service_page || 0) + (pageTypeCounts.local_page || 0) },
    { category: "course", count: pageTypeCounts.course || 0 },
    { category: "ecommerce", count: (pageTypeCounts.product || 0) + (pageTypeCounts.product_collection_page || 0) },
    { category: "business", count: (pageTypeCounts.business_page || 0) + (pageTypeCounts.contact_page || 0) }
  ].filter((candidate) => detectedCategories.includes(candidate.category));

  const dominant = candidates.sort((a, b) => b.count - a.count)[0];
  return dominant?.category || detectedCategories[0] || "unknown";
}

function detectModules(categories) {
  const modules = ["basicSeo", "schemaAudit"];

  if (categories.includes("blog_news")) modules.push("articleSchema");
  if (categories.includes("ecommerce")) modules.push("ecommerceSeo", "productSchema");
  if (categories.includes("local_service")) modules.push("localSeo");
  if (categories.includes("course")) modules.push("courseSchema");
  if (categories.includes("business")) modules.push("organizationSchema");

  return [...new Set(modules)];
}

function buildEvidence(pages, pageTypeCounts, context) {
  return {
    pageTypes: pageTypeCounts,
    plugins: {
      ecommerce: context.ecommercePlugins,
      lms: context.lmsPlugins
    },
    schemaTypes: context.schemaTypes,
    globalSchemaTypes: context.globalSchemaTypes,
    pageLevelSchemaTypes: context.pageLevelSchemaTypes,
    sampleUrls: {
      articles: collectSampleUrls(pages, "article"),
      products: collectSampleUrls(pages, "product"),
      productCollections: collectSampleUrls(pages, "product_collection_page"),
      courses: collectSampleUrls(pages, "course"),
      services: collectSampleUrls(pages, "service_page"),
      localPages: collectSampleUrls(pages, "local_page"),
      businessPages: collectSampleUrls(pages, "business_page"),
      themeDemoPages: collectSampleUrls(pages, "theme_demo_page"),
      builderPages: collectSampleUrls(pages, "builder_page")
    }
  };
}

function collectSampleUrls(pages, pageType) {
  return pages
    .filter((page) => page.classification?.pageType === pageType)
    .map((page) => page.url)
    .slice(0, 10);
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function collectUnique(items, getValues) {
  return [
    ...new Set(
      items
        .flatMap((item) => getValues(item) || [])
        .filter(Boolean)
    )
  ];
}
