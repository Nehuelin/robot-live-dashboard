import React, { StrictMode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { MotorTable } from "../src/components/MotorTable";
import { OrientationPanel } from "../src/components/OrientationPanel";
import { BatteryPanel } from "../src/components/BatteryPanel";
import { FootForces } from "../src/components/FootForces";
import { temperatureClass, normalizeTelemetry } from "../src/utils";
import { telemetry } from "./fixtures";
const chart = vi.hoisted(() => ({ latest: null }));
vi.mock("react-chartjs-2", () => ({
  Line: ({ data }) => {
    chart.latest = data;
    return <div data-testid="chart" />;
  },
}));

it.each([
  [39.99, "temp-green"],
  [40, "temp-yellow"],
  [60, "temp-yellow"],
  [60.01, "temp-red"],
  [null, "temp-unknown"],
])("temperature %s uses %s", (value, css) =>
  expect(temperatureClass(value)).toBe(css),
);
it.each(["go2", "g1"])(
  "motor table displays and filters all %s motors",
  (model) => {
    render(<MotorTable motors={telemetry(model).motores} />);
    expect(screen.getAllByRole("row")).toHaveLength(
      (model === "g1" ? 29 : 12) + 1,
    );
    fireEvent.change(screen.getByLabelText("Filtrar motores"), {
      target: { value: "not-a-joint" },
    });
    expect(screen.getByText(/No hay articulaciones/)).toBeTruthy();
  },
);
it("IMU starts empty and keeps a 60-sample buffer without inserting idle rerenders", () => {
  const empty = render(<OrientationPanel imu={{}} valid={false} />);
  expect(screen.queryByTestId("chart")).toBeNull();
  empty.unmount();
  const view = render(
    <StrictMode>
      <OrientationPanel
        imu={{ roll: 1, pitch: 2, yaw: 3 }}
        valid
        sequence={1}
        timestamp={1}
      />
    </StrictMode>,
  );
  expect(chart.latest.labels).toHaveLength(1);
  for (let i = 2; i <= 305; i++)
    view.rerender(
      <StrictMode>
        <OrientationPanel
          imu={{ roll: i, pitch: null, yaw: i }}
          valid
          sequence={i}
          timestamp={i / 10}
        />
      </StrictMode>,
    );
  expect(chart.latest.labels).toHaveLength(60);
  expect(chart.latest.labels[0]).toBe("24.60");
  expect(chart.latest.datasets[1].data.every((value) => value === null)).toBe(
    true,
  );
  view.rerender(
    <StrictMode>
      <OrientationPanel
        imu={{ roll: 999 }}
        valid
        sequence={305}
        timestamp={31}
      />
    </StrictMode>,
  );
  expect(chart.latest.labels.at(-1)).toBe("30.50");
});
it("BMS preserves zero, negative current and cell balance", () => {
  render(
    <BatteryPanel
      bms={{ soc: 0, corriente: -1200, temperatura: 32, celdas: [3.7, 3.72] }}
    />,
  );
  expect(screen.getByText("-1200")).toBeTruthy();
  expect(screen.getByText("20")).toBeTruthy();
  expect(screen.getByText("3.70")).toBeTruthy();
  expect(screen.getByText("3.72")).toBeTruthy();
});
it("unknown battery and contact data remain unavailable", () => {
  render(
    <>
      <BatteryPanel />
      <FootForces model="go2" />
    </>,
  );
  expect(screen.getAllByText("SIN DATOS")).toHaveLength(4);
  expect(screen.queryByText("AIRE")).toBeNull();
});
it.each(["go2", "g1"])("contacts follow received %s keys", (model) => {
  const data = normalizeTelemetry(telemetry(model));
  render(<FootForces forces={data.fuerzas} model={model} />);
  expect(screen.getAllByText("APOYO")).toHaveLength(model === "g1" ? 1 : 2);
  expect(screen.getAllByText("AIRE")).toHaveLength(model === "g1" ? 1 : 2);
});
