import { telemetry } from "../tests/fixtures.js";

const rounded = (value, digits) => Number(value.toFixed(digits));

// Deterministic teaching signals, not a calibrated battery or dynamics model.
// Time is supplied by the server so REST and WebSocket use the same generator.
export function demoTelemetry(
  model,
  elapsedSeconds,
  { static: fixed = false } = {},
) {
  const t = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const data = telemetry(model, rounded(t, 2));
  if (fixed) return data;

  // Preserve the existing IMU and motor demonstration, including joint names.
  data.imu = {
    ...data.imu,
    roll: Math.sin(t * 0.3) * 5,
    pitch: Math.sin(t * 0.5) * 8,
    yaw: Math.sin(t * 0.1) * 15,
  };
  data.motores.forEach((motor, i) => {
    motor.angulo = Math.sin(t * 1.2 + i * 0.5) * 20;
  });

  const baseline = data.bms;
  const soc = Math.max(20, baseline.soc - t / 180); // About 0.33 percentage points/minute.
  data.bms = {
    soc: rounded(soc, 3),
    // mA; keep the fixture's negative discharge convention, with at most 8% ripple.
    corriente: Math.round(
      baseline.corriente *
        (1 + 0.06 * Math.sin(t / 4) + 0.02 * Math.sin(t / 13)),
    ),
    temperatura: rounded(
      baseline.temperatura +
        3 * (1 - Math.exp(-t / 600)) +
        0.15 * Math.sin(t / 90),
      3,
    ),
    celdas: baseline.celdas.map((voltage, i) =>
      rounded(
        voltage -
          0.0025 * (baseline.soc - soc) +
          0.0015 * Math.sin(t / 20) +
          0.002 * (Math.sin(t / 7 + i * 0.7) - Math.sin(i * 0.7)),
        4,
      ),
    ),
  };

  // 2.4 s cycles with overlapping stance phases: no unsupported airborne state.
  // Go2 alternates diagonal pairs; G1 alternates its two documented foot keys.
  const support = (offset) => Number((t / 2.4 + offset) % 1 < 0.65);
  data.fuerzas =
    model === "g1"
      ? { R_foot: support(0), L_foot: support(0.5) }
      : { FR: support(0), FL: support(0.5), RR: support(0.5), RL: support(0) };
  return data;
}
