import React, { StrictMode } from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import App from "../src/App";
import { telemetry, MockSocket, response, deferred } from "./fixtures";
import {
  STALE_MS,
  RETRY_MS,
  REQUEST_TIMEOUT_MS,
} from "../src/useTelemetryConnection";

vi.mock("../src/RobotViewer", () => ({
  default: ({ modelType }) => <div data-testid="viewer">{modelType}</div>,
}));
vi.mock("react-chartjs-2", () => ({ Line: () => <div>Historial IMU</div> }));

const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 12; i++) await Promise.resolve();
  });
};
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.setItem("robot-api-url", "http://a.test:8001");
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("StrictMode leaves only one active socket", async () => {
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  await flush();
  expect(MockSocket.instances.filter((ws) => ws.readyState !== 3)).toHaveLength(
    1,
  );
});

it("unmount invalidates pending requests, even when the transport ignores abort", async () => {
  const pending = deferred();
  fetch.mockReturnValue(pending.promise);
  const view = render(<App />);
  view.unmount();
  pending.resolve(response(telemetry()));
  await flush();
  expect(MockSocket.instances.filter((ws) => ws.readyState !== 3)).toHaveLength(
    0,
  );
});

it("an open socket alone does not indicate live telemetry", async () => {
  fetch.mockResolvedValue(response({}, false));
  render(<App />);
  await flush();
  act(() => MockSocket.instances.at(-1).open());
  expect(screen.queryByText("EN VIVO")).toBeNull();
});

it("does not capture the empty initial state", () => {
  fetch.mockReturnValue(new Promise(() => {}));
  render(<App />);
  expect(screen.getByRole("button", { name: /capturar/i }).disabled).toBe(true);
});

it("a hanging info request does not block telemetry or WebSocket", async () => {
  fetch.mockImplementation((url) =>
    url.endsWith("/info")
      ? new Promise(() => {})
      : Promise.resolve(response(telemetry())),
  );
  render(<App />);
  await flush();
  expect(MockSocket.instances.filter((ws) => ws.readyState !== 3)).toHaveLength(
    1,
  );
  expect(screen.getByText("EN VIVO")).toBeTruthy();
});

it("telemetry model takes precedence over conflicting info", async () => {
  fetch.mockImplementation(async (url) =>
    response(url.endsWith("/info") ? { tipo: "go2" } : telemetry("g1")),
  );
  render(<App />);
  await flush();
  expect(screen.getByTestId("viewer").textContent).toBe("g1");
});

it("old server responses cannot replace the new session", async () => {
  const pending = deferred();
  fetch.mockImplementation((url) =>
    url.startsWith("http://a.test")
      ? pending.promise
      : Promise.resolve(
          response(url.endsWith("/info") ? { tipo: "g1" } : telemetry("g1")),
        ),
  );
  render(<App />);
  fireEvent.change(screen.getByLabelText("ROBOT API"), {
    target: { value: "http://b.test:8001" },
  });
  fireEvent.click(screen.getByRole("button", { name: /conectar/i }));
  await flush();
  pending.resolve(response(telemetry("go2")));
  await flush();
  expect(screen.getByTestId("viewer").textContent).toBe("g1");
  expect(
    MockSocket.instances
      .filter((ws) => ws.readyState !== 3)
      .every((ws) => ws.url.startsWith("ws://b.test")),
  ).toBe(true);
});

it("silent WebSocket expires freshness and blocks capture without losing data", async () => {
  render(<App />);
  await flush();
  act(() => MockSocket.instances.at(-1).open());
  act(() => vi.advanceTimersByTime(STALE_MS));
  expect(screen.getByText("DATOS DESACTUALIZADOS")).toBeTruthy();
  expect(screen.getByRole("button", { name: /capturar/i }).disabled).toBe(true);
  expect(screen.getByText("FR_hip")).toBeTruthy();
});

it("automatic retry uses the committed server rather than an unsubmitted edit", async () => {
  render(<App />);
  await flush();
  fireEvent.change(screen.getByLabelText("ROBOT API"), {
    target: { value: "http://b.test:8001" },
  });
  act(() => MockSocket.instances.at(-1).close());
  await act(async () => vi.advanceTimersByTime(RETRY_MS));
  expect(MockSocket.instances.at(-1).url).toBe("ws://a.test:8001/ws");
});

it("a REST result cannot overwrite newer WebSocket data in the same session", async () => {
  const pending = deferred();
  fetch.mockImplementation((url) =>
    url.endsWith("/info") ? Promise.resolve(response({})) : pending.promise,
  );
  render(<App />);
  act(() => MockSocket.instances.at(-1).message(telemetry("g1", 20)));
  pending.resolve(response(telemetry("go2", 1)));
  await flush();
  expect(screen.getByTestId("viewer").textContent).toBe("g1");
});

it("callbacks already queued by an old socket cannot update the new session", async () => {
  render(<App />);
  await flush();
  const late = MockSocket.instances.at(-1).onmessage;
  fireEvent.change(screen.getByLabelText("ROBOT API"), {
    target: { value: "http://b.test:8001" },
  });
  fetch.mockResolvedValue(response(telemetry("g1")));
  fireEvent.click(screen.getByRole("button", { name: /conectar/i }));
  await flush();
  act(() => late({ data: JSON.stringify(telemetry("go2")) }));
  expect(screen.getByTestId("viewer").textContent).toBe("g1");
});

it("cleans timers, listeners and request signals when unmounted", async () => {
  const view = render(<App />);
  await flush();
  const socket = MockSocket.instances.at(-1);
  view.unmount();
  expect(socket.onmessage).toBeNull();
  expect(socket.onclose).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

it("ignores malformed JSON and empty messages, retaining the valid sample", async () => {
  render(<App />);
  await flush();
  act(() => MockSocket.instances.at(-1).onmessage({ data: "{broken" }));
  act(() => MockSocket.instances.at(-1).message({}));
  expect(screen.getByText("FR_hip")).toBeTruthy();
  act(() => vi.advanceTimersByTime(STALE_MS));
  expect(screen.queryByText("EN VIVO")).toBeNull();
});

it("receives valid telemetry again after automatic retry", async () => {
  render(<App />);
  await flush();
  act(() => MockSocket.instances.at(-1).close());
  await act(async () => vi.advanceTimersByTime(RETRY_MS));
  await flush();
  act(() => MockSocket.instances.at(-1).message(telemetry("go2", 30)));
  expect(screen.getByText("EN VIVO")).toBeTruthy();
  expect(screen.getByRole("button", { name: /capturar/i }).disabled).toBe(
    false,
  );
});

it("times out an entirely silent server and aborts its requests", async () => {
  fetch.mockReturnValue(new Promise(() => {}));
  render(<App />);
  const signals = fetch.mock.calls.map((call) => call[1].signal);
  act(() => vi.advanceTimersByTime(REQUEST_TIMEOUT_MS));
  expect(signals.every((signal) => signal.aborted)).toBe(true);
  expect(screen.getByText("SIN SEÑAL")).toBeTruthy();
});

it("storage failures do not prevent telemetry", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<App />);
  await flush();
  expect(screen.getByText("EN VIVO")).toBeTruthy();
});

it("clears previous info when the new server has no info endpoint", async () => {
  fetch.mockImplementation(async (url) =>
    response(
      url.endsWith("/info")
        ? { tipo: "g1" }
        : { ...telemetry("g1"), modelo: "" },
    ),
  );
  render(<App />);
  await flush();
  expect(screen.getByTestId("viewer").textContent).toBe("g1");
  fetch.mockImplementation(async (url) =>
    url.endsWith("/info") ? response({}, false) : response(telemetry("go2")),
  );
  fireEvent.change(screen.getByLabelText("ROBOT API"), {
    target: { value: "http://b.test:8001" },
  });
  fireEvent.click(screen.getByRole("button", { name: /conectar/i }));
  await flush();
  expect(screen.getByTestId("viewer").textContent).toBe("quadruped");
});

it("captures the received timestamp and keeps samples across reconnects", async () => {
  render(<App />);
  await flush();
  fireEvent.click(screen.getByRole("button", { name: /capturar/i }));
  act(() => MockSocket.instances.at(-1).message(telemetry("g1", 30)));
  fireEvent.click(screen.getByRole("button", { name: /capturar/i }));
  fireEvent.click(screen.getByRole("button", { name: /conectar/i }));
  await flush();
  expect(
    screen.getByRole("button", { name: /capturar/i }).textContent,
  ).toContain("2");
});
