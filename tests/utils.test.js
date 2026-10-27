import { describe, it, expect } from "vitest";
import { normalizeTelemetry, sanitizeBaseUrl, fmt } from "../src/utils";
import { telemetry } from "./fixtures";

describe("telemetry boundary", () => {
  it.each(["go2", "g1"])(
    "accepts %s without changing units or joint names",
    (model) => {
      const data = telemetry(model);
      expect(normalizeTelemetry(data)).toEqual(data);
    },
  );
  it.each([null, {}, [], "invalid", { motores: [null] }])(
    "rejects unusable payload %j",
    (payload) => {
      expect(normalizeTelemetry(payload)).toBeNull();
    },
  );
  it("keeps partial valid telemetry and unknown values distinct from zero", () => {
    const data = normalizeTelemetry({
      motores: [{ nombre: 8, angulo: "5", temperatura: "bad" }],
      imu: { roll: 0 },
    });
    expect(data.motores[0]).toMatchObject({
      nombre: "motor_0",
      angulo: 5,
      temperatura: null,
      torque: null,
    });
    expect(data.imu.roll).toBe(0);
    expect(data.imu.pitch).toBeNull();
  });
  it.each([null, undefined, "", Infinity, NaN])(
    "formats unknown %s as unavailable",
    (value) => {
      expect(fmt(value)).toBe("—");
    },
  );
  it("keeps zero and negative numeric strings", () => {
    expect(fmt(0)).toBe("0.0");
    expect(fmt("-1.2")).toBe("-1.2");
  });
});

describe("API origin", () => {
  it("preserves the existing root-origin contract", () => {
    expect(sanitizeBaseUrl(" https://example.test:8001/path?q=1/ ")).toBe(
      "https://example.test:8001",
    );
  });
  it.each([
    "",
    "bad",
    "localhost:8001",
    "ftp://example.test",
    "file:///tmp/a",
    "http://user:pass@example.test",
  ])("rejects %s", (url) => {
    expect(sanitizeBaseUrl(url)).toBe("");
  });
});
