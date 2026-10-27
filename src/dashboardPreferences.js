export const PANEL_DEFINITIONS = [
  { id: "orientation", label: "Orientación / IMU" },
  { id: "battery", label: "Sistema de energía / BMS" },
  { id: "forces", label: "Contacto con superficie" },
  { id: "motors", label: "Actuadores / Motores" },
  { id: "model", label: "Visor 3D" },
];
export const PANEL_PREFERENCES_KEY = "robot-dashboard-panels-v1";
export const defaultPanels = () =>
  Object.fromEntries(PANEL_DEFINITIONS.map(({ id }) => [id, true]));

export function readPanelPreferences() {
  const fallback = defaultPanels();
  try {
    const saved = JSON.parse(localStorage.getItem(PANEL_PREFERENCES_KEY));
    if (
      saved?.version !== 1 ||
      !saved.visible ||
      typeof saved.visible !== "object" ||
      Array.isArray(saved.visible)
    )
      return fallback;
    for (const { id } of PANEL_DEFINITIONS) {
      if (typeof saved.visible[id] === "boolean")
        fallback[id] = saved.visible[id];
    }
  } catch {
    /* Unavailable storage and older values use the default view. */
  }
  return fallback;
}
export function savePanelPreferences(visible) {
  try {
    localStorage.setItem(
      PANEL_PREFERENCES_KEY,
      JSON.stringify({ version: 1, visible }),
    );
  } catch {
    /* Preferences remain available for this session. */
  }
}

export function resolveViewerSelection(mode, telemetryModel, hasData) {
  const manual = mode !== "auto";
  const model = manual ? mode : telemetryModel || (hasData ? "go2" : "");
  return {
    model,
    manual,
    neutral: manual && (!hasData || model !== telemetryModel),
  };
}
