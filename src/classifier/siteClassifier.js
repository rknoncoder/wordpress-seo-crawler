export default function classifySite(pages) {
  const pageTypeCounts = countBy(pages, (page) => page.classification?.pageType || "unknown");
  const pluginNames = collectUnique(pages, (page) => page.wordpress?.plugins);
  const seoPlugins = collectUnique(pages, (page) => page.wordpress?.seoPlugins);
  const ecommercePlugins = collectUnique(pages, (page) => page.wordpress?.ecommercePlugins);
  const lmsPlugins = collectUnique(pages, (page) => page.wordpress?.lmsPlugins);
  const builders = collectUnique(pages, (page) => page.wordpress?.builders);
  const themeSlugs = collectUnique(pages, (page) => page.wordpress?.themes);
  const schemaTypes = collectUnique(pages, (page) => page.schema?.types);
  const detectedCategories = detectSiteCategories(pages, pageTypeCounts, {
    ecommercePlugins,
    lmsPlugins,
    schemaTypes
  });
  const modulesToRun = detectModules(detectedCategories);

  return {
    totalPagesCrawled: pages.length,
    detectedCategories,
    primaryCategory: detectPrimaryCategory(pageTypeCounts, detectedCategories),
    modulesToRun,
    pageTypeCounts,
    wordpress: {
      isWordPress: pages.some((page) => page.wordpress?.isWordPress),
      plugins: pluginNames,
      seoPlugins,
      ecommercePlugins,
      lmsPlugins,
      builders,
      themes: themeSlugs
    },
    schemaTypes,
    evidence: buildEvidence(pages, pageTypeCounts, {
      ecommercePlugins,
      lmsPlugins,
      schemaTypes
    })
  };
}

function detectSiteCategories(pages, pageTypeCounts, context) {
  const categories = [];

  if (pageTypeCounts.product > 0 || context.ecommercePlugins.length > 0) {
    categories.push("ecommerce");
  }

  if (pageTypeCounts.course > 0 || context.lmsPlugins.length > 0) {
    categories.push("course");
  }

  if (pageTypeCounts.local_page > 0 || pageTypeCounts.service_page > 0 || pages.some((page) => page.wordpress?.hasLocalSignals)) {
    categories.push("local_service");
  }

  if (pageTypeCounts.article > 0 || pageTypeCounts.blog_index > 0) {
    categories.push("blog_news");
  }

  if (
    pageTypeCounts.business_page > 0 ||
    pageTypeCounts.contact_page > 0 ||
    context.schemaTypes.includes("Organization") ||
    context.schemaTypes.includes("LocalBusiness")
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
    { category: "ecommerce", count: pageTypeCounts.product || 0 },
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
    sampleUrls: {
      articles: collectSampleUrls(pages, "article"),
      products: collectSampleUrls(pages, "product"),
      courses: collectSampleUrls(pages, "course"),
      services: collectSampleUrls(pages, "service_page"),
      localPages: collectSampleUrls(pages, "local_page"),
      businessPages: collectSampleUrls(pages, "business_page")
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
