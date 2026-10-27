import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { demoTelemetry } from "../scripts/demo-telemetry.mjs";
import { telemetry, MockSocket, response } from "./fixtures";
import { normalizeTelemetry, fmt } from "../src/utils";
import { downloadSamples } from "../src/csv";
import App from "../src/App";

vi.mock("../src/RobotViewer", () => ({
  default: () => <div>Visor simulado</div>,
}));
vi.mock("react-chartjs-2", () => ({ Line: () => <div>Historial IMU</div> }));
vi.mock("../src/csv", async (importOriginal) => ({
  ...(await importOriginal()),
  downloadSamples: vi.fn(),
}));
const flush = async () =>
  act(async () => {
    for (let i = 0; i < 16; i++) await Promise.resolve();
  });
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

for (const model of ["go2", "g1"]) {
  it(`${model}: BMS evolves gradually and remains bounded at 10 Hz and in long sessions`, () => {
    let previous = demoTelemetry(model, 0);
    for (const t of [
      ...Array.from({ length: 600 }, (_, i) => i / 10),
      600,
      3600,
      12000,
      86400,
    ]) {
      const data = demoTelemetry(model, t);
      expect(data.bms.soc).toBeGreaterThanOrEqual(20);
      expect(data.bms.soc).toBeLessThanOrEqual(previous.bms.soc);
      expect(data.bms.corriente).toBeGreaterThanOrEqual(-1296);
      expect(data.bms.corriente).toBeLessThanOrEqual(-1104);
      expect(data.bms.temperatura).toBeGreaterThanOrEqual(31.85);
      expect(data.bms.temperatura).toBeLessThanOrEqual(35.15);
      expect(data.bms.celdas).toHaveLength(telemetry(model).bms.celdas.length);
      for (const voltage of data.bms.celdas) {
        expect(voltage).toBeGreaterThan(3.4);
        expect(voltage).toBeLessThan(3.8);
      }
      if (t > 0 && t < 60) {
        expect(
          Math.abs(data.bms.corriente - previous.bms.corriente),
        ).toBeLessThanOrEqual(3);
        expect(
          Math.abs(data.bms.temperatura - previous.bms.temperatura),
        ).toBeLessThanOrEqual(0.0021);
        expect(Math.abs(data.bms.soc - previous.bms.soc)).toBeLessThanOrEqual(
          0.0011,
        );
        data.bms.celdas.forEach((value, i) =>
          expect(Math.abs(value - previous.bms.celdas[i])).toBeLessThanOrEqual(
            0.00011,
          ),
        );
      }
      previous = data;
    }
    expect(demoTelemetry(model, 180).bms.soc).toBe(85);
    expect(demoTelemetry(model, 180).bms.temperatura).toBeGreaterThan(32);
    expect(demoTelemetry(model, 180).bms.celdas).not.toEqual(
      demoTelemetry(model, 0).bms.celdas,
    );
  });
  it(`${model}: contacts alternate reproducibly using only the existing keys and binary values`, () => {
    const states = Array.from(
      { length: 48 },
      (_, i) => demoTelemetry(model, i / 20).fuerzas,
    );
    expect(Object.keys(states[0])).toEqual(
      Object.keys(telemetry(model).fuerzas),
    );
    for (const key of Object.keys(states[0]))
      expect(new Set(states.map((s) => s[key]))).toEqual(new Set([0, 1]));
    for (const state of states) {
      expect(
        Object.values(state).every((value) => value === 0 || value === 1),
      ).toBe(true);
      expect(
        Object.values(state).reduce((a, b) => a + b, 0),
      ).toBeGreaterThanOrEqual(model === "g1" ? 1 : 2);
      if (model === "go2") {
        expect(state.FR).toBe(state.RL);
        expect(state.FL).toBe(state.RR);
      }
    }
  });
  it(`${model}: generation is reproducible and does not mutate fixtures`, () => {
    const original = telemetry(model);
    const first = demoTelemetry(model, 17.3);
    demoTelemetry(model, 1234);
    expect(demoTelemetry(model, 17.3)).toEqual(first);
    expect(telemetry(model)).toEqual(original);
    expect(first.motores.map((m) => m.nombre)).toEqual(
      original.motores.map((m) => m.nombre),
    );
    expect(normalizeTelemetry(first)).toEqual(first);
  });
  it(`${model}: --static preserves every fixture measurement while timestamps advance`, () => {
    expect(demoTelemetry(model, 10, { static: true })).toEqual(
      telemetry(model, 10),
    );
    expect(demoTelemetry(model, 20, { static: true })).toEqual(
      telemetry(model, 20),
    );
  });
  it(`${model}: UI updates BMS/contact values and captures the actual received messages`, async () => {
    vi.useFakeTimers();
    localStorage.setItem("robot-api-url", "http://demo.test");
    MockSocket.instances = [];
    vi.stubGlobal("WebSocket", MockSocket);
    const first = demoTelemetry(model, 0),
      next = demoTelemetry(model, 180.8);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        response(
          url.endsWith("/info") ? { tipo: model, simulation: true } : first,
        ),
      ),
    );
    render(<App />);
    await flush();
    const capture = () =>
      fireEvent.click(screen.getByRole("button", { name: /Capturar muestra/ }));
    const battery = document.querySelector(".battery-content"),
      forces = document.querySelector(".contact-content");
    expect(battery.querySelector(".battery-main strong").textContent).toBe(
      "86%",
    );
    expect(within(forces).getAllByText("APOYO")).toHaveLength(
      model === "g1" ? 2 : 4,
    );
    capture();
    act(() => MockSocket.instances[0].message(next));
    await flush();
    expect(battery.querySelector(".battery-main strong").textContent).toBe(
      `${fmt(next.bms.soc, 0)}%`,
    );
    expect(within(battery).getByText(fmt(next.bms.corriente, 0))).toBeTruthy();
    expect(within(battery).getByText(fmt(next.bms.temperatura))).toBeTruthy();
    expect(
      [...battery.querySelectorAll(".cell-voltage b")].map(
        (e) => e.textContent,
      ),
    ).toEqual(next.bms.celdas.map((v) => `${fmt(v, 2)} V`));
    expect(within(forces).getAllByText("APOYO")).toHaveLength(
      model === "g1" ? 1 : 2,
    );
    expect(within(forces).getAllByText("AIRE")).toHaveLength(
      model === "g1" ? 1 : 2,
    );
    expect(screen.getAllByRole("row")).toHaveLength(model === "g1" ? 30 : 13);
    capture();
    fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect(downloadSamples).toHaveBeenLastCalledWith([
      normalizeTelemetry(first),
      normalizeTelemetry(next),
    ]);
    expect(MockSocket.instances).toHaveLength(1);
  });
}
