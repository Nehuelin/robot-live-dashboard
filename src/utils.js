export const EMPTY_TELEMETRY = { modelo: '', ts: 0, motores: [], imu: {}, bms: {}, fuerzas: {} };

export const normalizeTelemetry = (payload = {}) => ({
  modelo: payload.modelo || '',
  ts: Number(payload.ts ?? 0),
  motores: Array.isArray(payload.motores)
    ? payload.motores.map((motor, idx) => ({
        id: Number(motor.id ?? idx),
        nombre: motor.nombre || `motor_${idx}`,
        angulo: Number(motor.angulo ?? 0),
        velocidad: Number(motor.velocidad ?? 0),
        torque: Number(motor.torque ?? 0),
        temperatura: Number(motor.temperatura ?? 0),
      }))
    : [],
  imu: payload.imu || {},
  bms: payload.bms || {},
  fuerzas: payload.fuerzas || {},
});

export const sanitizeBaseUrl = (value = '') => {
  const cleaned = String(value).trim().replace(/\/+$/, '');
  if (!cleaned) return '';
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned;
  }
};

export const buildApiUrl = (baseUrl, path) => {
  const origin = sanitizeBaseUrl(baseUrl);
  if (!origin) return '';
  return `${origin}${path}`;
};

export const fmt = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
