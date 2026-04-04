import axios from "axios";
import config from "../config/config.js";

export default async function fetchPage(url) {
  try {
    const res = await axios.get(url, {
      timeout: config.timeout,
      maxRedirects: 5,
      responseType: "text",
      validateStatus: () => true
    });

    const contentType = res.headers["content-type"] || "";
    const isHtml = contentType.includes("text/html");

    if (res.status >= 400 || !isHtml || typeof res.data !== "string") {
      console.log(`Skipping non-HTML or error response: ${url} (${res.status})`);
      return null;
    }

    return {
      html: res.data,
      finalUrl: res.request?.res?.responseUrl || url,
      status: res.status
    };
  } catch (err) {
    console.log(`Fetch error: ${url}`);
    return null;
  }
}
