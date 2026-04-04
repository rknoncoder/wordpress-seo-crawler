export default function ($) {
  return {
    totalImages: $("img").length,
    imagesWithoutAlt: $("img:not([alt])").length
  };
}