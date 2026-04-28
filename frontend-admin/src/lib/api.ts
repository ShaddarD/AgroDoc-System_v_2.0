import { createApiClient } from "../../../shared-ui/src/apiClient";

export const api = createApiClient(
  () => import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8000",
);
