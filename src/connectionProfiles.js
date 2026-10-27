import { readSavedUrl, sanitizeBaseUrl } from "./utils";
export const PROFILES_KEY = "robot-connection-profiles-v1";
export const PROFILE_LABELS = {
  go2: "Go2 / Perro",
  g1: "G1 / Humanoide",
  custom: "URL personalizada",
};
export const DEMO_URLS = {
  go2: "http://localhost:5173",
  g1: "http://localhost:5174",
};
export function readProfiles() {
  const last = readSavedUrl();
  const settings = {
    version: 1,
    selected: "custom",
    urls: { go2: "", g1: "", custom: last },
  };
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILES_KEY));
    if (saved?.version !== 1) return settings;
    for (const id of Object.keys(PROFILE_LABELS))
      settings.urls[id] =
        sanitizeBaseUrl(saved.urls?.[id]) || (id === "custom" ? last : "");
    if (
      saved.selected in PROFILE_LABELS &&
      settings.urls[saved.selected] === last
    )
      settings.selected = saved.selected;
  } catch {
    /* Optional storage; keep the existing API URL. */
  }
  return settings;
}
export function saveProfiles(profiles) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    /* In-memory profiles remain usable. */
  }
}
