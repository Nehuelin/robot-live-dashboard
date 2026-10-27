import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import App from "../src/App";
import {
  PROFILES_KEY,
  DEMO_URLS,
  readProfiles,
  saveProfiles,
} from "../src/connectionProfiles";
import {
  PANEL_DEFINITIONS,
  PANEL_PREFERENCES_KEY,
} from "../src/dashboardPreferences";
import { deferred, MockSocket, response, telemetry } from "./fixtures";
import { REQUEST_TIMEOUT_MS } from "../src/useTelemetryConnection";
const resources = vi.hoisted(() => ({
  viewer: null,
  charts: null,
  mounts: 0,
  unmounts: 0,
}));
vi.mock("../src/RobotViewer", () => ({
  default: function MockViewer(props) {
    resources.viewer = props;
    React.useEffect(() => {
      resources.mounts++;
      return () => resources.unmounts++;
    }, []);
    return <div data-testid="viewer-instance" />;
  },
}));
vi.mock("react-chartjs-2", () => ({
  Line: ({ data }) => {
    resources.charts = data;
    return <div data-testid="chart-instance" />;
  },
}));
const flush = async () =>
  act(async () => {
    for (let i = 0; i < 18; i++) await Promise.resolve();
  });
const choose = (id) =>
  fireEvent.change(screen.getByLabelText("Fuente de telemetría"), {
    target: { value: id },
  });
const setUrl = (value) =>
  fireEvent.change(screen.getByLabelText("ROBOT API"), { target: { value } });
const connect = () =>
  fireEvent.click(
    screen.getByRole("button", { name: /^Reconectar$|^Conectar$/i }),
  );
const open = () => {
  if (!screen.queryByRole("group", { name: "Personalizar paneles" }))
    fireEvent.click(screen.getByRole("button", { name: "PANELES" }));
};
const visible = () =>
  [...document.querySelectorAll("[data-panel]")]
    .filter((p) => !p.hidden)
    .map((p) => p.dataset.panel);
const seed = () =>
  saveProfiles({
    version: 1,
    selected: "custom",
    urls: {
      go2: "http://go2.test:8001",
      g1: "http://g1.test:8001",
      custom: "http://a.test:8001",
    },
  });
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem("robot-api-url", "http://a.test:8001");
  MockSocket.instances = [];
  Object.assign(resources, {
    viewer: null,
    charts: null,
    mounts: 0,
    unmounts: 0,
  });
  vi.stubGlobal("WebSocket", MockSocket);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      const model = url.includes("g1.test") ? "g1" : "go2";
      return response(
        url.endsWith("/info") ? { tipo: model } : telemetry(model),
      );
    }),
  );
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.startViewTransition;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("keeps the existing API URL and leaves unknown robot addresses unconfigured", () => {
  expect(readProfiles()).toMatchObject({
    selected: "custom",
    urls: { go2: "", g1: "", custom: "http://a.test:8001" },
  });
});
it.each([
  "broken JSON",
  "null",
  '{"version":9}',
  '{"version":1,"urls":{"g1":"https://user:secret@example.com"}}',
])("recovers profile storage %s", (saved) => {
  localStorage.setItem(PROFILES_KEY, saved);
  expect(readProfiles().urls.g1).toBe("");
  expect(readProfiles().urls.custom).toBe("http://a.test:8001");
});
it("blocked storage leaves profile defaults usable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("blocked");
  });
  expect(readProfiles().selected).toBe("custom");
  expect(() => saveProfiles(readProfiles())).not.toThrow();
});
it("an empty profile keeps the current socket and explains one-time configuration", async () => {
  render(<App />);
  await flush();
  choose("g1");
  expect(screen.getByLabelText("ROBOT API").value).toBe("");
  expect(screen.getByText(/Perfil G1 sin dirección/)).toBeTruthy();
  expect(screen.getByText("http://a.test:8001")).toBeTruthy();
  expect(MockSocket.instances).toHaveLength(1);
});
it("saves a configured profile once and reconnects by selecting it later", async () => {
  render(<App />);
  await flush();
  choose("g1");
  setUrl("http://g1.test:8001/path");
  connect();
  await flush();
  expect(JSON.parse(localStorage.getItem(PROFILES_KEY)).urls.g1).toBe(
    "http://g1.test:8001",
  );
  choose("custom");
  await flush();
  expect(screen.getByLabelText("ROBOT API").value).toBe("http://a.test:8001");
  choose("g1");
  await flush();
  expect(MockSocket.instances.at(-1).url).toBe("ws://g1.test:8001/ws");
  expect(MockSocket.instances.filter((ws) => ws.readyState !== 3)).toHaveLength(
    1,
  );
});
it("rapid profile changes invalidate pending data and retain captures and visual choice", async () => {
  seed();
  const pending = deferred();
  render(<App />);
  await flush();
  fireEvent.click(screen.getByRole("button", { name: /Capturar muestra/ }));
  fireEvent.change(screen.getByLabelText("Modelo del visor 3D"), {
    target: { value: "go2" },
  });
  fetch.mockImplementation((url) =>
    url.includes("g1.test")
      ? pending.promise
      : Promise.resolve(
          response(url.endsWith("/info") ? { tipo: "go2" } : telemetry()),
        ),
  );
  choose("g1");
  choose("go2");
  await flush();
  pending.resolve(response(telemetry("g1", 90)));
  await flush();
  expect(screen.getByText("FR_hip")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Capturar muestra (1)" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Modelo del visor 3D").value).toBe("go2");
  expect(MockSocket.instances.filter((ws) => ws.readyState !== 3)).toHaveLength(
    1,
  );
});
it("reports a profile mismatch without changing real rows or the visual selector", async () => {
  seed();
  fetch.mockImplementation(async (url) =>
    response(url.endsWith("/info") ? { tipo: "go2" } : telemetry()),
  );
  render(<App />);
  await flush();
  choose("g1");
  await flush();
  expect(screen.getByText(/El perfil G1 recibió un modelo GO2/)).toBeTruthy();
  expect(screen.getAllByRole("row")).toHaveLength(13);
  expect(screen.getByLabelText("Modelo del visor 3D").value).toBe("auto");
});
it("shows which URL is active while an unsent draft is edited", async () => {
  render(<App />);
  await flush();
  setUrl("http://other.test:9000");
  expect(screen.getByText("http://a.test:8001")).toBeTruthy();
  expect(MockSocket.instances).toHaveLength(1);
  connect();
  await flush();
  expect(screen.getByText("http://other.test:9000")).toBeTruthy();
});
it("a saved profile survives reload through the existing URL key", async () => {
  seed();
  const view = render(<App />);
  await flush();
  choose("g1");
  await flush();
  view.unmount();
  render(<App />);
  await flush();
  expect(screen.getByLabelText("Fuente de telemetría").value).toBe("g1");
  expect(localStorage.getItem("robot-api-url")).toBe("http://g1.test:8001");
});
it("local demo addresses require an explicit choice and do not claim physical data", async () => {
  render(<App />);
  await flush();
  choose("g1");
  fireEvent.click(screen.getByRole("button", { name: "Usar demo local G1" }));
  await flush();
  expect(screen.getByLabelText("ROBOT API").value).toBe(DEMO_URLS.g1);
  expect(screen.getByText("ORIGEN NO VERIFICADO")).toBeTruthy();
});
it("only a backend declaration labels the session as simulation", async () => {
  fetch.mockImplementation(async (url) =>
    response(
      url.endsWith("/info") ? { tipo: "go2", simulation: true } : telemetry(),
    ),
  );
  render(<App />);
  await flush();
  expect(screen.getByText("SIMULACIÓN DECLARADA")).toBeTruthy();
});
it("unavailable profile keeps capture disabled and describes how to start a backend", async () => {
  seed();
  render(<App />);
  await flush();
  fetch.mockReturnValue(new Promise(() => {}));
  choose("g1");
  act(() => vi.advanceTimersByTime(REQUEST_TIMEOUT_MS));
  expect(screen.getByText("SIN SEÑAL")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: /Capturar muestra/ }).disabled,
  ).toBe(true);
  expect(
    screen.getByText(/Verificá la dirección y que el backend esté iniciado/),
  ).toBeTruthy();
});
it("navigation preserves connection, filter, captures, model, mask, focus view and history", async () => {
  render(<App />);
  await flush();
  fireEvent.change(screen.getByLabelText("Filtrar motores"), {
    target: { value: "FR" },
  });
  fireEvent.change(screen.getByLabelText("Modelo del visor 3D"), {
    target: { value: "g1" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Capturar muestra/ }));
  open();
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Sistema de energía / BMS" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "PANELES" }));
  const before = visible(),
    canvas = screen.getByTestId("viewer-instance"),
    chart = screen.getByTestId("chart-instance");
  fireEvent.click(screen.getByRole("tab", { name: /Información/ }));
  expect(resources.viewer.active).toBe(false);
  for (let t = 2; t <= 8; t++)
    act(() => MockSocket.instances[0].message(telemetry("go2", t)));
  expect(resources.charts.labels).toHaveLength(1);
  fireEvent.click(screen.getByRole("tab", { name: /Dashboard/ }));
  await flush();
  expect(visible()).toEqual(before);
  expect(screen.getByLabelText("Filtrar motores").value).toBe("FR");
  expect(screen.getByLabelText("Modelo del visor 3D").value).toBe("g1");
  expect(
    screen.getByRole("button", { name: "Capturar muestra (1)" }),
  ).toBeTruthy();
  expect(screen.getByTestId("viewer-instance")).toBe(canvas);
  expect(screen.getByTestId("chart-instance")).toBe(chart);
  expect(resources.charts.labels).toHaveLength(8);
  expect(resources.mounts).toBe(1);
  expect(resources.viewer.active).toBe(true);
  expect(MockSocket.instances).toHaveLength(1);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("tab arrow keys select the section and place keyboard focus correctly", async () => {
  render(<App />);
  await flush();
  fireEvent.keyDown(screen.getByRole("tab", { name: /Dashboard/ }), {
    key: "ArrowRight",
  });
  expect(document.activeElement).toBe(
    screen.getByRole("tab", { name: /Información/ }),
  );
  expect(screen.getByRole("heading", { name: "Unitree G1" })).toBeTruthy();
  fireEvent.keyDown(document.activeElement, { key: "Home" });
  expect(document.activeElement).toBe(
    screen.getByRole("tab", { name: /Dashboard/ }),
  );
  expect(screen.getByLabelText("ROBOT API")).toBeTruthy();
});
it("Information does not clear a maximized dashboard, even when Escape is pressed there", async () => {
  render(<App />);
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "Maximizar Actuadores" }));
  fireEvent.click(screen.getByRole("tab", { name: /Información/ }));
  fireEvent.keyDown(window, { key: "Escape" });
  fireEvent.click(screen.getByRole("tab", { name: /Dashboard/ }));
  expect(visible()).toEqual(["motors"]);
  fireEvent.click(screen.getByRole("button", { name: "Restaurar Actuadores" }));
  expect(visible()).toHaveLength(5);
  expect(MockSocket.instances).toHaveLength(1);
});
it("menu is portaled, focuses its first option and restores trigger with Escape", async () => {
  render(<App />);
  await flush();
  open();
  const group = screen.getByRole("group", { name: "Personalizar paneles" });
  expect(group.parentElement).toBe(document.body);
  expect(document.activeElement).toBe(
    screen.getByRole("checkbox", { name: "Orientación / IMU" }),
  );
  fireEvent.keyDown(document.activeElement, { key: "Escape" });
  expect(
    screen.queryByRole("group", { name: "Personalizar paneles" }),
  ).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "PANELES" }),
  );
});
it("keeps the menu inside the viewport when its trigger scrolls off-screen", async () => {
  render(<App />);
  await flush();
  const trigger = screen.getByRole("button", { name: "PANELES" });
  vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
    top: -240,
    bottom: -210,
    right: 500,
  });
  open();
  const menu = screen.getByRole("group", { name: "Personalizar paneles" });
  Object.defineProperty(menu, "scrollHeight", { value: 245 });
  fireEvent.scroll(window);
  expect(parseFloat(menu.style.top)).toBeGreaterThanOrEqual(12);
  vi.stubGlobal("innerWidth", 320);
  vi.stubGlobal("innerHeight", 400);
  fireEvent(window, new Event("resize"));
  expect(parseFloat(menu.style.top) + 245).toBeLessThanOrEqual(400 - 12);
  expect(parseFloat(menu.style.left)).toBeGreaterThanOrEqual(12);
  expect(
    parseFloat(menu.style.left) + parseFloat(menu.style.width),
  ).toBeLessThanOrEqual(320 - 12);
});
it("removes resize, scroll, menu listeners and layout observers on unmount", async () => {
  const observers = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor() {
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observers.push(this);
      }
    },
  );
  const add = vi.spyOn(window, "addEventListener");
  const remove = vi.spyOn(window, "removeEventListener");
  const view = render(<App />);
  await flush();
  for (let i = 0; i < 5; i++) {
    open();
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
  }
  view.unmount();
  for (const type of ["resize", "scroll"])
    for (const call of add.mock.calls.filter((args) => args[0] === type))
      expect(
        remove.mock.calls.some(
          (args) =>
            args[0] === type && args[1] === call[1] && args[2] === call[2],
        ),
      ).toBe(true);
  expect(observers.length).toBeGreaterThan(0);
  expect(
    observers.every((observer) => observer.disconnect.mock.calls.length === 1),
  ).toBe(true);
});
it("opening a menu skips a pending transition and suppresses snapshots while open", async () => {
  const pending = [],
    skipped = vi.fn();
  document.startViewTransition = vi.fn((update) => {
    pending.push(update);
    return {
      ready: Promise.resolve(),
      finished: new Promise(() => {}),
      skipTransition: skipped,
    };
  });
  render(<App />);
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "Maximizar Actuadores" }));
  act(() => pending[0]());
  fireEvent.click(screen.getByRole("button", { name: "Restaurar Actuadores" }));
  act(() => pending[1]());
  open();
  expect(skipped).toHaveBeenCalled();
  const calls = document.startViewTransition.mock.calls.length;
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Sistema de energía / BMS" }),
  );
  expect(document.startViewTransition).toHaveBeenCalledTimes(calls);
  expect(document.getElementById("panel-battery").hidden).toBe(true);
});
it.each(Array.from({ length: 32 }, (_, mask) => mask))(
  "restores mask %i after all available maximizations",
  async (mask) => {
    const flags = Object.fromEntries(
      PANEL_DEFINITIONS.map(({ id }, i) => [id, Boolean(mask & (1 << i))]),
    );
    localStorage.setItem(
      PANEL_PREFERENCES_KEY,
      JSON.stringify({ version: 1, visible: flags }),
    );
    render(<App />);
    await flush();
    const before = visible();
    for (const id of before) {
      const panel = document.getElementById(`panel-${id}`),
        button = panel.querySelector(".panel-control");
      fireEvent.click(button);
      expect(visible()).toEqual([id]);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(visible()).toEqual(before);
      expect(document.activeElement).toBe(button);
    }
    expect(MockSocket.instances).toHaveLength(1);
  },
);
