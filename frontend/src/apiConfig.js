const normalizeBaseUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  return url.replace(/\/api\/?$/, "").replace(/\/$/, "");
};

const rawApiUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "";
const API_BASE = normalizeBaseUrl(rawApiUrl);

export default API_BASE;
