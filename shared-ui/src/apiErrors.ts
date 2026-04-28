/** Parse FastAPI-style JSON error body (or plain text) for user-facing messages. */
export async function readApiError(response: Response): Promise<string> {
  const raw = await response.text();
  if (!raw) {
    return `HTTP ${response.status}`;
  }
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
  }
  try {
    const j = JSON.parse(raw) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") {
      return d;
    }
    if (Array.isArray(d)) {
      return d
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: string }).msg);
          }
          return JSON.stringify(item);
        })
        .join("; ");
    }
    if (d !== undefined && d !== null) {
      return typeof d === "object" ? JSON.stringify(d) : String(d);
    }
  } catch {
    /* fall through */
  }
  return raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
}
