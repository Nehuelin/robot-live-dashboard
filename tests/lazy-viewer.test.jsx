import React from "react";
import { render, screen, act } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import App from "../src/App";
import { MockSocket, telemetry, response } from "./fixtures";

vi.mock("../src/RobotViewer", () => {
  throw new Error("Simulated viewer chunk download failure");
});
vi.mock("react-chartjs-2", () => ({ Line: () => <div>Historial IMU</div> }));

it("a failed lazy viewer download leaves panels and capture usable", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("WebSocket", MockSocket);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => response(url.endsWith("/info") ? {} : telemetry())),
  );
  const view = render(<App />);
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
  expect(screen.getByText("No se pudo iniciar el visor")).toBeTruthy();
  expect(
    screen.getByRole("region", { name: "Actuadores", exact: true }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: /Capturar muestra/ }).disabled,
  ).toBe(false);
  view.unmount();
  vi.unstubAllGlobals();
});
