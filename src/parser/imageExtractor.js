export default function ($) {
  return {
    totalImages: $("img").length,
    imagesWithoutAlt: $('img').filter((_, element) => {
      const alt = $(element).attr("alt");
      return alt === undefined || alt.trim() === "";
    }).length
  };
}
