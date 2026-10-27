import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
  renderHook,
} from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import App from "../src/App";
import { useDashboardView } from "../src/useDashboardView";
import {
  PANEL_DEFINITIONS,
  PANEL_PREFERENCES_KEY,
  defaultPanels,
} from "../src/dashboardPreferences";
import { MockSocket, response, telemetry } from "./fixtures";

const resources = vi.hoisted(() => ({
  viewerMounts: 0,
  viewerUnmounts: 0,
  chartMounts: 0,
  chartUnmounts: 0,
  viewer: null,
  chart: null,
}));
vi.mock("../src/RobotViewer", () => ({
  default: function MockViewer(props) {
    resources.viewer = props;
    React.useEffect(() => {
      resources.viewerMounts++;
      return () => {
        resources.viewerUnmounts++;
      };
    }, []);
    return <div data-testid="retained-viewer">{props.modelType}</div>;
  },
}));
vi.mock("react-chartjs-2", () => ({
  Line: ({ data }) => {
    resources.chart = data;
    React.useEffect(() => {
      resources.chartMounts++;
      return () => {
        resources.chartUnmounts++;
      };
    }, []);
    return <div data-testid="retained-chart" />;
  },
}));

const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 16; i++) await Promise.resolve();
  });
};
const openSettings = () => {
  if (!screen.queryByRole("group", { name: "Personalizar paneles" }))
    fireEvent.click(screen.getByRole("button", { name: /PANELES/ }));
};
const toggle = (label) => {
  openSettings();
  fireEvent.click(screen.getByRole("checkbox", { name: label, exact: true }));
};
const visibleIds = () =>
  [...document.querySelectorAll("[data-panel]")]
    .filter((el) => !el.hidden)
    .map((el) => el.dataset.panel);
const select = (value) =>
  fireEvent.change(screen.getByLabelText("Modelo del visor 3D"), {
    target: { value },
  });
const maximize = (id) =>
  fireEvent.click(
    document.getElementById(`panel-${id}`).querySelector(".panel-control"),
  );

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem("robot-api-url", "http://a.test:8001");
  Object.assign(resources, {
    viewerMounts: 0,
    viewerUnmounts: 0,
    chartMounts: 0,
    chartUnmounts: 0,
    viewer: null,
    chart: null,
  });
  MockSocket.instances = [];
  vi.stubGlobal("WebSocket", MockSocket);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      response(url.endsWith("/info") ? { tipo: "go2" } : telemetry()),
    ),
  );
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.startViewTransition;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("does not initialize an initially hidden 3D viewer until first shown", async () => {
  localStorage.setItem(
    PANEL_PREFERENCES_KEY,
    JSON.stringify({
      version: 1,
      visible: { ...defaultPanels(), model: false },
    }),
  );
  render(<App />);
  await flush();
  expect(resources.viewerMounts).toBe(0);
  toggle("Visor 3D");
  await flush();
  expect(resources.viewerMounts).toBe(1);
});
it("defaults to automatic and preserves server and telemetry under manual selection", async () => {
  render(<App />);
  await flush();
  expect(screen.getByLabelText("Modelo del visor 3D").value).toBe("auto");
  expect(resources.viewer.modelType).toBe("quadruped");
  select("g1");
  await flush();
  expect(resources.viewer).toMatchObject({
    modelType: "g1",
    neutral: true,
    motors: [],
    imu: undefined,
  });
  expect(screen.getByText(/Manual: G1 · Telemetría: GO2/)).toBeTruthy();
  expect(screen.getByText("FR_hip")).toBeTruthy();
  expect(localStorage.getItem("robot-api-url")).toBe("http://a.test:8001");
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(MockSocket.instances).toHaveLength(1);
  select("auto");
  await flush();
  expect(resources.viewer.neutral).toBe(false);
  expect(resources.viewer.motors).toHaveLength(12);
});
it("manual Go2 is neutral for G1 telemetry and resumes compatible movement automatically", async () => {
  render(<App />);
  await flush();
  select("go2");
  act(() => MockSocket.instances[0].message(telemetry("g1", 2)));
  await flush();
  expect(resources.viewer).toMatchObject({
    modelType: "quadruped",
    neutral: true,
    motors: [],
  });
  expect(screen.getAllByRole("row")).toHaveLength(30);
  act(() => MockSocket.instances[0].message(telemetry("go2", 3)));
  await flush();
  expect(resources.viewer.neutral).toBe(false);
  expect(resources.viewer.motors).toHaveLength(12);
});
it.each(["g1", "go2"])(
  "allows manual %s without a connection",
  async (mode) => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<App />);
    await flush();
    expect(resources.viewerMounts).toBe(0);
    select(mode);
    await flush();
    expect(resources.viewer).toMatchObject({
      modelType: mode === "g1" ? "g1" : "quadruped",
      neutral: true,
      motors: [],
    });
    expect(
      screen.getByRole("button", { name: /Capturar muestra/ }).disabled,
    ).toBe(true);
  },
);
it("preserves manual choice when the server changes", async () => {
  render(<App />);
  await flush();
  select("go2");
  fetch.mockImplementation(async (url) =>
    response(url.endsWith("/info") ? { tipo: "g1" } : telemetry("g1")),
  );
  fireEvent.change(screen.getByLabelText("ROBOT API"), {
    target: { value: "http://b.test:8001" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Reconectar/i }));
  await flush();
  expect(screen.getByLabelText("Modelo del visor 3D").value).toBe("go2");
  expect(resources.viewer.neutral).toBe(true);
  expect(MockSocket.instances.filter((ws) => ws.readyState !== 3)).toHaveLength(
    1,
  );
});
it("repeated manual selection keeps the same viewer component and connection", async () => {
  render(<App />);
  await flush();
  for (let i = 0; i < 12; i++) {
    select(i % 2 ? "go2" : "g1");
    await flush();
  }
  expect(resources.viewerMounts).toBe(1);
  expect(MockSocket.instances).toHaveLength(1);
});
it.each(PANEL_DEFINITIONS)(
  "hides and shows $label without removing its DOM instance",
  async ({ id, label }) => {
    render(<App />);
    await flush();
    const panel = document.getElementById(`panel-${id}`);
    toggle(label);
    expect(panel.hidden).toBe(true);
    expect(visibleIds()).not.toContain(id);
    toggle(label);
    expect(panel.hidden).toBe(false);
    expect(document.getElementById(`panel-${id}`)).toBe(panel);
    expect(MockSocket.instances).toHaveLength(1);
  },
);
it.each([1, 2, 3, 4, 5])(
  "supports exactly %i visible panels and persists their mask",
  async (count) => {
    render(<App />);
    await flush();
    for (const { label } of PANEL_DEFINITIONS.slice(count)) toggle(label);
    expect(visibleIds()).toHaveLength(count);
    const saved = JSON.parse(localStorage.getItem(PANEL_PREFERENCES_KEY));
    expect(Object.values(saved.visible).filter(Boolean)).toHaveLength(count);
    expect(saved.version).toBe(1);
  },
);
it("all hidden leaves connection/capture available and offers default restoration", async () => {
  render(<App />);
  await flush();
  for (const { label } of PANEL_DEFINITIONS) toggle(label);
  expect(visibleIds()).toEqual([]);
  expect(screen.getByText("Todos los paneles están ocultos")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: /Capturar muestra/ }).disabled,
  ).toBe(false);
  expect(screen.getByLabelText("ROBOT API")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Restablecer paneles" }));
  expect(visibleIds()).toHaveLength(5);
});
it("recovers saved preferences on reload without touching the API key", async () => {
  const view = render(<App />);
  await flush();
  toggle("Sistema de energía / BMS");
  view.unmount();
  render(<App />);
  await flush();
  expect(visibleIds()).not.toContain("battery");
  expect(localStorage.getItem("robot-api-url")).toBe("http://a.test:8001");
});
it.each([
  "bad JSON",
  "null",
  '{"version":9,"visible":{}}',
  '{"version":1,"visible":[]}',
])("recovers invalid preferences %s", async (saved) => {
  localStorage.setItem(PANEL_PREFERENCES_KEY, saved);
  render(<App />);
  await flush();
  expect(visibleIds()).toHaveLength(5);
});
it("blocked storage leaves all customization usable in memory", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<App />);
  await flush();
  toggle("Visor 3D");
  expect(visibleIds()).toHaveLength(4);
});
it.each(PANEL_DEFINITIONS)("maximizes and restores $label", async ({ id }) => {
  render(<App />);
  await flush();
  const before = visibleIds();
  maximize(id);
  expect(visibleIds()).toEqual([id]);
  expect(
    document.getElementById(`panel-${id}`).classList.contains("is-maximized"),
  ).toBe(true);
  maximize(id);
  expect(visibleIds()).toEqual(before);
  expect(resources.viewerMounts).toBe(1);
  expect(resources.chartMounts).toBe(1);
});
it("restores exactly the three-panel view, filter, capture, model and live IMU history", async () => {
  render(<App />);
  await flush();
  select("g1");
  fireEvent.change(screen.getByLabelText("Filtrar motores"), {
    target: { value: "FR" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Capturar muestra/ }));
  toggle("Sistema de energía / BMS");
  toggle("Contacto con superficie");
  const before = visibleIds();
  const chartNode = screen.getByTestId("retained-chart");
  maximize("motors");
  expect(resources.viewer.active).toBe(false);
  for (let i = 2; i <= 6; i++)
    act(() => MockSocket.instances[0].message(telemetry("go2", i)));
  expect(resources.chart.labels).toHaveLength(1);
  maximize("motors");
  await flush();
  expect(visibleIds()).toEqual(before);
  expect(screen.getByLabelText("Filtrar motores").value).toBe("FR");
  expect(screen.getByLabelText("Modelo del visor 3D").value).toBe("g1");
  expect(
    screen.getByRole("button", { name: /Capturar muestra/ }).textContent,
  ).toContain("(1)");
  expect(screen.getByTestId("retained-chart")).toBe(chartNode);
  expect(resources.chart.labels).toHaveLength(6);
  expect(resources.viewerMounts).toBe(1);
  expect(resources.chartMounts).toBe(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(MockSocket.instances).toHaveLength(1);
});
it("Escape restores the exact mask and keyboard focus", async () => {
  render(<App />);
  await flush();
  toggle("Sistema de energía / BMS");
  const before = visibleIds();
  const button = document.querySelector("#panel-motors .panel-control");
  maximize("motors");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(visibleIds()).toEqual(before);
  expect(document.activeElement).toBe(button);
});
it("rapid repeated focus/visibility changes do not accumulate instances or sockets", async () => {
  const addWindow = vi.spyOn(window, "addEventListener"),
    removeWindow = vi.spyOn(window, "removeEventListener");
  const addDocument = vi.spyOn(document, "addEventListener"),
    removeDocument = vi.spyOn(document, "removeEventListener");
  const view = render(<App />);
  await flush();
  for (let i = 0; i < 12; i++) {
    toggle("Visor 3D");
    toggle("Visor 3D");
    maximize("motors");
    maximize("motors");
  }
  expect(resources.viewerMounts).toBe(1);
  expect(resources.chartMounts).toBe(1);
  expect(MockSocket.instances).toHaveLength(1);
  view.unmount();
  expect(resources.viewerUnmounts).toBe(1);
  expect(resources.chartUnmounts).toBe(1);
  // Drain queued zero-delay UI work; connection/retry timers must already be gone.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(vi.getTimerCount()).toBe(0);
  expect(MockSocket.instances.every((ws) => ws.readyState === 3)).toBe(true);
  expect(
    addWindow.mock.calls.filter((call) => call[0] === "keydown").length,
  ).toBe(
    removeWindow.mock.calls.filter((call) => call[0] === "keydown").length,
  );
  expect(
    addDocument.mock.calls.filter((call) => call[0] === "pointerdown").length,
  ).toBe(
    removeDocument.mock.calls.filter((call) => call[0] === "pointerdown")
      .length,
  );
});
it("overlapping native layout transitions apply each update exactly once", async () => {
  const updates = [];
  document.startViewTransition = vi.fn((update) => {
    updates.push(update);
    return {
      ready: Promise.resolve(),
      finished: new Promise(() => {}),
      skipTransition: vi.fn(),
    };
  });
  const { result } = renderHook(() => useDashboardView());
  await flush();
  // Direct view actions exercise overlapping snapshots; an open menu now suspends them.
  act(() => result.current.toggleVisible("orientation"));
  act(() => result.current.toggleVisible("battery"));
  await act(async () => {
    updates[1]();
    updates[0]();
  });
  expect(
    Object.keys(result.current.visible).filter(
      (id) => result.current.visible[id],
    ),
  ).toEqual(["forces", "motors", "model"]);
});
it("reduced motion bypasses view-transition snapshots without losing functionality", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
  document.startViewTransition = vi.fn();
  render(<App />);
  await flush();
  toggle("Contacto con superficie");
  maximize("motors");
  maximize("motors");
  expect(document.startViewTransition).not.toHaveBeenCalled();
  expect(visibleIds()).not.toContain("forces");
});
it("a browser animation API failure cannot block layout controls", async () => {
  document.startViewTransition = vi.fn(() => {
    throw new Error("snapshot unavailable");
  });
  render(<App />);
  await flush();
  toggle("Contacto con superficie");
  maximize("motors");
  maximize("motors");
  expect(visibleIds()).not.toContain("forces");
  expect(visibleIds()).toHaveLength(4);
});
