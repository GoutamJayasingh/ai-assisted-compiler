export type Theme = "light" | "dark";

export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("parallax-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage unavailable: fall back to system preference */
  }
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("parallax-theme", t);
  } catch {
    /* ignore */
  }
}
