import { api } from "./api";

export async function downloadFileByUuid(fileUuid: string, fileName: string): Promise<void> {
  const r = await api.fetch(`/files/${fileUuid}/download`, { method: "GET" });
  if (!r.ok) {
    throw new Error(`download_${r.status}`);
  }
  const blob = await r.blob();
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = fileName;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(u);
}
