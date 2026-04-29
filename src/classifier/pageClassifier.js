export default function classifyPage(data) {
  const url = new URL(data.url);
  const pathname = url.pathname.toLowerCase();
  const evidence = [];

  if (data.schema?.hasProductSchema) evidence.push("product-schema");
  if (data.schema?.hasCourseSchema) evidence.push("course-schema");
  if (data.schema?.hasArticleSchema) evidence.push("article-schema");
  if (data.openGraph?.type) evidence.push(`og:${data.openGraph.type}`);
  if (data.wordpress?.routeSignals?.length) evidence.push(...data.wordpress.routeSignals);
  if (data.wordpress?.localSignals?.length) evidence.push(...data.wordpress.localSignals);

  if (
    data.schema?.hasProductSchema ||
    (data.wordpress?.ecommercePlugins?.length > 0 && data.wordpress?.routeSignals?.includes("woocommerce-route"))
  ) {
    return buildClassification("product", ["ecommerceSeo", "productSchema"], evidence);
  }

  if (data.wordpress?.routeSignals?.includes("woocommerce-route")) {
    return buildClassification("shop_or_account_page", ["basicSeo"], evidence);
  }

  if (data.schema?.hasCourseSchema || data.wordpress?.routeSignals?.includes("course-route")) {
    return buildClassification("course", ["courseSchema"], evidence);
  }

  if (isBlogIndex(pathname, data)) {
    return buildClassification("blog_index", ["articleSchema"], evidence);
  }

  if (isThemeDemoPage(pathname, data)) {
    return buildClassification("theme_demo_page", ["basicSeo"], evidence);
  }

  if (isContactPage(pathname)) {
    return buildClassification("contact_page", ["basicSeo", "localSeo"], evidence);
  }

  if (isServicePage(pathname, data)) {
    return buildClassification("service_page", ["basicSeo", "localSeo"], evidence);
  }

  if (isLocalPage(pathname, data)) {
    return buildClassification("local_page", ["localSeo"], evidence);
  }

  if (isCaseStudy(pathname)) {
    return buildClassification("case_study", ["basicSeo"], evidence);
  }

  if (isBusinessPage(pathname)) {
    return buildClassification("business_page", ["basicSeo", "organizationSchema"], evidence);
  }

  if (isArticlePage(pathname, data)) {
    return buildClassification("article", ["articleSchema"], evidence);
  }

  return buildClassification("other", ["basicSeo"], evidence);
}

function buildClassification(pageType, modules, evidence) {
  return {
    pageType,
    modules: [...new Set(["basicSeo", ...modules])],
    evidence: [...new Set(evidence)]
  };
}

function isBlogIndex(pathname, data) {
  return pathname === "/blog/" || (data.h1Text?.toLowerCase() === "blog" && data.schema?.types?.includes("CollectionPage"));
}

function isServicePage(pathname, data) {
  return pathname.includes("/services/") || data.wordpress?.routeSignals?.includes("service-route");
}

function isLocalPage(pathname, data) {
  return (
    pathname.includes("/locations/") ||
    pathname.includes("/location/") ||
    pathname.includes("/service-area/") ||
    data.wordpress?.routeSignals?.includes("location-route") ||
    data.wordpress?.localSignals?.includes("google-map")
  );
}

function isCaseStudy(pathname) {
  return pathname.includes("/case-studies/") || pathname.includes("/case-study/");
}

function isContactPage(pathname) {
  return ["/contact/", "/contact-us/", "/get-in-touch/"].some((route) => pathname.includes(route));
}

function isBusinessPage(pathname) {
  return pathname === "/" || pathname.includes("/about") || pathname.includes("/team");
}

function isArticlePage(pathname, data) {
  return (
    data.schema?.hasArticleSchema ||
    pathname.includes("/blog/") ||
    pathname.includes("/post/") ||
    pathname.includes("/news/") ||
    pathname.includes("/article/")
  );
}

function isThemeDemoPage(pathname, data) {
  const demoPathPatterns = [
    "front-page",
    "slider",
    "wishlist",
    "elements",
    "shortcode",
    "video-icon",
    "widget-title",
    "buttons-on-this-theme",
    "gallery",
    "testimonial"
  ];
  const h1Text = data.h1Text?.toLowerCase() || "";
  const title = data.title?.toLowerCase() || "";
  const textToCheck = `${pathname} ${h1Text} ${title}`;
  const hasDemoPattern = demoPathPatterns.some((pattern) => textToCheck.includes(pattern));
  const hasOnlyGenericSchema = !data.schema?.hasArticleSchema && !data.schema?.hasProductSchema && !data.schema?.hasCourseSchema;

  return hasDemoPattern && hasOnlyGenericSchema;
}
