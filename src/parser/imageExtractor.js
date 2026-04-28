export default function ($) {
  const images = $("img")
    .map((_, element) => {
      const image = $(element);
      const src = image.attr("src") || image.attr("data-src") || image.attr("data-lazy-src") || "";
      const alt = image.attr("alt");

      return {
        src,
        alt: alt ?? "",
        missingAlt: alt === undefined,
        emptyAlt: alt !== undefined && alt.trim() === "",
        width: image.attr("width") || "",
        height: image.attr("height") || "",
        loading: image.attr("loading") || ""
      };
    })
    .get();

  return {
    totalImages: images.length,
    imagesWithoutAlt: images.filter((image) => image.missingAlt).length,
    imagesWithEmptyAlt: images.filter((image) => image.emptyAlt).length,
    lazyImages: images.filter((image) => image.loading.toLowerCase() === "lazy").length,
    imagesWithoutDimensions: images.filter((image) => !image.width || !image.height).length,
    imageSamples: images.slice(0, 10)
  };
}
