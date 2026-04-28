import axios from "axios";
import config from "../config/config.js";

export default async function fetchPage(url) {
  let lastError = null;

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    try {
      const res = await axios.get(url, {
        timeout: config.timeout,
        maxRedirects: 5,
        responseType: "text",
        validateStatus: () => true,
        headers: {
          "User-Agent": config.userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });

      const contentType = res.headers["content-type"] || "";
      const isHtml = contentType.includes("text/html");
      const finalUrl = res.request?.res?.responseUrl || url;
      const metadata = {
        requestedUrl: url,
        finalUrl,
        status: res.status,
        contentType,
        redirected: finalUrl !== url,
        error: ""
      };

      if (shouldRetryStatus(res.status) && attempt < config.retries) {
        await waitForRetry(attempt);
        continue;
      }

      if (res.status >= 400) {
        return {
          ...metadata,
          html: "",
          error: `HTTP ${res.status}`
        };
      }

      if (!isHtml || typeof res.data !== "string") {
        return {
          ...metadata,
          html: "",
          error: "Non-HTML response"
        };
      }

      return {
        ...metadata,
        html: res.data
      };
    } catch (err) {
      lastError = err;

      if (attempt < config.retries) {
        await waitForRetry(attempt);
      }
    }
  }

  return {
    requestedUrl: url,
    finalUrl: url,
    status: 0,
    contentType: "",
    redirected: false,
    html: "",
    error: lastError?.code || lastError?.message || "Fetch error"
  };
}

function shouldRetryStatus(status) {
  return [429, 500, 502, 503, 504].includes(status);
}

function waitForRetry(attempt) {
  return new Promise((resolve) => {
    setTimeout(resolve, config.retryDelayMs * (attempt + 1));
  });
}
