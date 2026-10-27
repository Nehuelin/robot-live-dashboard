export const DEFAULT_API_URL = "http://10.100.45.68:8001";
export const EMPTY_TELEMETRY = {
  modelo: "",
  ts: null,
  motores: [],
  imu: {},
  bms: {},
  fuerzas: {},
};
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const finiteNumber = (value) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const numericFields = (source, keys) =>
  Object.fromEntries(keys.map((key) => [key, finiteNumber(source?.[key])]));

// Partial subsystems are valid; at least one finite measurement is required.
export function normalizeTelemetry(payload) {
  if (!record(payload)) return null;
  const motores = Array.isArray(payload.motores)
    ? payload.motores.flatMap((motor, idx) => {
        if (!record(motor)) return [];
        return [
          {
            id: finiteNumber(motor.id) ?? idx,
            nombre:
              typeof motor.nombre === "string" && motor.nombre.trim()
                ? motor.nombre
                : `motor_${idx}`,
            ...numericFields(motor, [
              "angulo",
              "velocidad",
              "torque",
              "temperatura",
            ]),
          },
        ];
      })
    : [];
  const imu = numericFields(record(payload.imu) ? payload.imu : {}, [
    "roll",
    "pitch",
    "yaw",
    "ax",
    "ay",
    "az",
  ]);
  const bms = {
    ...numericFields(record(payload.bms) ? payload.bms : {}, [
      "soc",
      "corriente",
      "temperatura",
    ]),
    celdas: Array.isArray(payload.bms?.celdas)
      ? payload.bms.celdas.map(finiteNumber)
      : [],
  };
  const fuerzas = record(payload.fuerzas)
    ? Object.fromEntries(
        Object.entries(payload.fuerzas).map(([key, value]) => [
          key,
          typeof value === "boolean" ? Number(value) : finiteNumber(value),
        ]),
      )
    : {};
  const hasMeasurement =
    motores.some((m) =>
      ["angulo", "velocidad", "torque", "temperatura"].some(
        (key) => m[key] !== null,
      ),
    ) ||
    Object.values(imu).some((v) => v !== null) ||
    ["soc", "corriente", "temperatura"].some((key) => bms[key] !== null) ||
    bms.celdas.some((v) => v !== null) ||
    Object.values(fuerzas).some((v) => v !== null);
  if (!hasMeasurement) return null;
  return {
    modelo: typeof payload.modelo === "string" ? payload.modelo.trim() : "",
    ts: finiteNumber(payload.ts),
    motores,
    imu,
    bms,
    fuerzas,
  };
}

export function sanitizeBaseUrl(value = "") {
  try {
    const parsed = new URL(String(value).trim());
    return ["http:", "https:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
      ? parsed.origin
      : "";
  } catch {
    return "";
  }
}
export const buildApiUrl = (baseUrl, path) => {
  const origin = sanitizeBaseUrl(baseUrl);
  return origin ? `${origin}${path}` : "";
};
export function readSavedUrl() {
  try {
    return (
      sanitizeBaseUrl(localStorage.getItem("robot-api-url")) || DEFAULT_API_URL
    );
  } catch {
    return DEFAULT_API_URL;
  }
}
export function saveUrl(url) {
  try {
    localStorage.setItem("robot-api-url", url);
  } catch {
    /* Persistence is optional. */
  }
}
export function resolveRobotModel(telemetry, info) {
  const known = (value) =>
    typeof value === "string" &&
    ["go2", "g1"].includes(value.trim().toLowerCase())
      ? value.trim().toLowerCase()
      : "";
  return (
    known(telemetry?.modelo) ||
    [info?.tipo, info?.modelo, info?.nombre].map(known).find(Boolean) ||
    ""
  );
}
export const fmt = (value, digits = 1) =>
  finiteNumber(value) === null ? "—" : Number(value).toFixed(digits);
export const temperatureClass = (value) =>
  finiteNumber(value) === null
    ? "temp-unknown"
    : value < 40
      ? "temp-green"
      : value <= 60
        ? "temp-yellow"
        : "temp-red";
