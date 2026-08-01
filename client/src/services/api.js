import axios from "axios";

const configuredBaseUrl = process.env.REACT_APP_API_URL?.trim();
const candidateBaseUrls = [
  configuredBaseUrl,
  "http://localhost:5000",
  "http://localhost:5001",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5001",
].filter(Boolean);

let activeBaseUrl = candidateBaseUrls[0] || "http://localhost:5000";

const api = axios.create({
  baseURL: activeBaseUrl,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isConnectionIssue = !error.response && ["ERR_NETWORK", "ECONNABORTED", "ERR_CONNECTION_REFUSED"].includes(error.code);

    if (!isConnectionIssue) {
      return Promise.reject(error);
    }

    const triedUrls = new Set([activeBaseUrl]);
    const nextBaseUrl = candidateBaseUrls.find((url) => !triedUrls.has(url));

    if (!nextBaseUrl) {
      return Promise.reject(error);
    }

    activeBaseUrl = nextBaseUrl;
    api.defaults.baseURL = nextBaseUrl;

    const retryConfig = {
      ...error.config,
      baseURL: nextBaseUrl,
    };

    return axios.request(retryConfig);
  }
);

export default api;