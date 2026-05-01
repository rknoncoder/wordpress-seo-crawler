const FACET_QUERY_PARAMS = new Set([
  "filter",
  "filter_by",
  "filtered",
  "attribute",
  "pa_color",
  "pa_size",
  "color",
  "colour",
  "size",
  "brand",
  "price",
  "min_price",
  "max_price",
  "rating",
  "orderby",
  "sort",
  "dir",
  "availability",
  "stock",
  "material",
  "gender",
  "cat",
  "category"
]);

const FACET_PARAM_PATTERNS = [
  /^filter_/i,
  /^pa_/i,
  /^attribute_/i,
  /^product_cat$/i,
  /^product_tag$/i
];

export function detectFacetedUrl(url) {
  const params = getQueryParamNames(url);
  const facetParams = params.filter((param) => isFacetParam(param));

  return {
    isFacetedUrl: facetParams.length > 0,
    facetQueryParams: [...new Set(facetParams)]
  };
}

export function isFacetParam(param) {
  const normalized = String(param || "").trim().toLowerCase();

  return FACET_QUERY_PARAMS.has(normalized) || FACET_PARAM_PATTERNS.some((pattern) => pattern.test(normalized));
}

function getQueryParamNames(url) {
  if (typeof url !== "string" || !url.trim()) {
    return [];
  }

  try {
    const parsedUrl = new URL(url);
    return [...parsedUrl.searchParams.keys()];
  } catch {
    return [];
  }
}
