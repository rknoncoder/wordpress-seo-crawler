import axios from "axios";
import config from "../config/config.js";

const siteChecks = new Map();

const SEO_PLUGIN_PATTERNS = [
  { name: "Yoast SEO", patterns: ["yoast-seo", "yoast.com/wordpress/plugins/seo", "wpseo"] },
  { name: "Rank Math", patterns: ["rank-math", "rankmath"] },
  { name: "All in One SEO", patterns: ["all-in-one-seo", "aioseo"] },
  { name: "SEOPress", patterns: ["seopress"] },
  { name: "The SEO Framework", patterns: ["autodescription", "the-seo-framework"] }
];

const ECOMMERCE_PLUGIN_PATTERNS = [
  {
    name: "WooCommerce",
    patterns: [
      "/wp-content/plugins/woocommerce/",
      "/woocommerce/",
      "woocommerce-page",
      "woocommerce-js",
      "post-type-archive-product",
      "single-product",
      "wc-blocks",
      "wc-cart",
      "wc-checkout"
    ]
  },
  {
    name: "Easy Digital Downloads",
    patterns: ["/wp-content/plugins/easy-digital-downloads/", "edd_download", "edd-cart"]
  }
];

const LMS_PLUGIN_PATTERNS = [
  { name: "LearnDash", patterns: ["learndash", "sfwd-"] },
  { name: "Tutor LMS", patterns: ["tutor-lms", "tutor-course"] },
  { name: "LearnPress", patterns: ["learnpress", "lp-course"] },
  { name: "LifterLMS", patterns: ["lifterlms", "llms-"] },
  { name: "Sensei LMS", patterns: ["sensei-lms", "sensei-course"] }
];

const BUILDER_PATTERNS = [
  { name: "Elementor", patterns: ["elementor"] },
  { name: "Divi", patterns: ["et-core", "divi", "et_pb_"] },
  { name: "WPBakery", patterns: ["js_composer", "wpbakery"] },
  { name: "Oxygen", patterns: ["oxygen"] },
  { name: "Bricks", patterns: ["bricks"] },
  { name: "Beaver Builder", patterns: ["fl-builder"] },
  { name: "Gutenberg", patterns: ["wp-block-", "block-library"] }
];

export default async function ($, url) {
  let isWordPress = false;
  const signals = [];
  const origin = new URL(url).origin;
  const pathname = new URL(url).pathname.toLowerCase();

  const generator = $('meta[name="generator"]').attr("content");
  if (generator && generator.toLowerCase().includes("wordpress")) {
    isWordPress = true;
    signals.push("meta-generator");
  }

  const html = $.html();
  const normalizedHtml = html.toLowerCase();
  const assetUrls = collectAssetUrls($);
  const assetText = assetUrls.join(" ").toLowerCase();
  const structuralText = [
    $("body").attr("class") || "",
    $('link[href*="/wp-content/plugins/"]').map((_, element) => $(element).attr("href") || "").get().join(" "),
    $('script[src*="/wp-content/plugins/"]').map((_, element) => $(element).attr("src") || "").get().join(" ")
  ]
    .join(" ")
    .toLowerCase();

  if (normalizedHtml.includes("wp-content") || normalizedHtml.includes("wp-includes")) {
    isWordPress = true;
    signals.push("wp-path");
  }

  const cachedChecks = await getSiteChecks(origin);

  if (cachedChecks.has("wp-json")) {
    isWordPress = true;
    signals.push("wp-json");
  }

  if (cachedChecks.has("wp-login")) {
    isWordPress = true;
    signals.push("wp-login");
  }

  const plugins = collectPluginSlugs(assetUrls);
  const themes = collectThemeSlugs(assetUrls);
  const seoPlugins = detectNamedPatterns(normalizedHtml, SEO_PLUGIN_PATTERNS);
  const ecommercePlugins = detectNamedPatterns(`${assetText} ${structuralText}`, ECOMMERCE_PLUGIN_PATTERNS);
  const lmsPlugins = detectNamedPatterns(normalizedHtml, LMS_PLUGIN_PATTERNS);
  const builders = detectNamedPatterns(normalizedHtml, BUILDER_PATTERNS);
  const routeSignals = detectRouteSignals(pathname);
  const localSignals = detectLocalSignals($, normalizedHtml);

  if (plugins.length > 0) {
    isWordPress = true;
    signals.push("plugin-assets");
  }

  if (themes.length > 0) {
    isWordPress = true;
    signals.push("theme-assets");
  }

  return {
    isWordPress,
    signals: [...new Set(signals)],
    generator: generator || "",
    plugins,
    themes,
    seoPlugins,
    ecommercePlugins,
    lmsPlugins,
    builders,
    routeSignals,
    localSignals,
    hasWooCommerce: ecommercePlugins.includes("WooCommerce"),
    hasLms: lmsPlugins.length > 0 || routeSignals.includes("course-route"),
    hasLocalSignals: localSignals.length > 0
  };
}

async function getSiteChecks(origin) {
  if (siteChecks.has(origin)) {
    return siteChecks.get(origin);
  }

  const signals = new Set();

  try {
    const wpJsonResponse = await axios.get(new URL("/wp-json/", origin).href, {
      timeout: 5000,
      headers: {
        "User-Agent": config.userAgent
      },
      validateStatus: () => true
    });

    if (wpJsonResponse.status === 200 && typeof wpJsonResponse.data === "object") {
      signals.add("wp-json");
    }
  } catch {}

  try {
    const loginResponse = await axios.get(new URL("/wp-login.php", origin).href, {
      timeout: 5000,
      headers: {
        "User-Agent": config.userAgent
      },
      validateStatus: () => true
    });

    if (loginResponse.status === 200) {
      signals.add("wp-login");
    }
  } catch {}

  siteChecks.set(origin, signals);
  return signals;
}

function collectAssetUrls($) {
  const urls = [];

  $('script[src], link[href], img[src], source[src], iframe[src]').each((_, element) => {
    const src = $(element).attr("src") || $(element).attr("href");
    if (src) {
      urls.push(src);
    }
  });

  return urls;
}

function collectPluginSlugs(assetUrls) {
  return collectSlugs(assetUrls, /\/wp-content\/plugins\/([^/]+)/i);
}

function collectThemeSlugs(assetUrls) {
  return collectSlugs(assetUrls, /\/wp-content\/themes\/([^/]+)/i);
}

function collectSlugs(assetUrls, pattern) {
  return [
    ...new Set(
      assetUrls
        .map((assetUrl) => {
          const match = assetUrl.match(pattern);
          return match?.[1] || "";
        })
        .filter(Boolean)
    )
  ];
}

function detectNamedPatterns(text, definitions) {
  return definitions
    .filter((definition) => definition.patterns.some((pattern) => text.includes(pattern.toLowerCase())))
    .map((definition) => definition.name);
}

function detectRouteSignals(pathname) {
  const signals = [];

  if (["/shop/", "/product/", "/cart/", "/checkout/", "/my-account/"].some((route) => pathname.includes(route))) {
    signals.push("woocommerce-route");
  }

  if (["/course/", "/courses/", "/lesson/", "/lessons/"].some((route) => pathname.includes(route))) {
    signals.push("course-route");
  }

  if (["/service/", "/services/"].some((route) => pathname.includes(route))) {
    signals.push("service-route");
  }

  if (["/location/", "/locations/", "/service-area/"].some((route) => pathname.includes(route))) {
    signals.push("location-route");
  }

  if (pathname.includes("/blog/")) {
    signals.push("blog-route");
  }

  return signals;
}

function detectLocalSignals($, normalizedHtml) {
  const signals = [];

  if (normalizedHtml.includes("google.com/maps") || normalizedHtml.includes("maps.google.com")) {
    signals.push("google-map");
  }

  if ($('a[href^="tel:"]').length > 0) {
    signals.push("phone-link");
  }

  if ($('a[href^="mailto:"]').length > 0) {
    signals.push("email-link");
  }

  return signals;
}
