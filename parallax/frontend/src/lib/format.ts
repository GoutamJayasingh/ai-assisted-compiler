export const pct = (x: number | null | undefined, digits = 1) => (x === null || x === undefined ? "n/a" : `${(100 * x).toFixed(digits)}%`);
export const num = (x: number | null | undefined, digits = 2) => (x === null || x === undefined || !Number.isFinite(x) ? "n/a" : x.toFixed(digits));
export const ms = (x: number | null | undefined) => (x === null || x === undefined ? "n/a" : x < 1 ? `${(x * 1000).toFixed(0)} µs` : `${x.toFixed(1)} ms`);

export async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback (non-secure contexts): FNV-1a, only used for cache keys.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

export function downloadText(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
