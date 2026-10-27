import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { it, expect, vi, beforeEach } from "vitest";
import RobotViewer from "../src/RobotViewer";
import { useEnvironment } from "@react-three/drei";
import { Group } from "three";
const rig = vi.hoisted(() => ({
  nodes: {},
  scene: null,
  frames: [],
  fail: false,
  gl: null,
  loads: [],
  clear: null,
  source: null,
  canvasMounts: 0,
  canvasUnmounts: 0,
  frameloop: null,
  orbit: null,
}));
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, frameloop }) => {
    React.useEffect(() => {
      rig.canvasMounts++;
      return () => {
        rig.canvasUnmounts++;
      };
    }, []);
    rig.frameloop = frameloop;
    if (rig.fail) throw new Error("WebGL unavailable");
    return <div>{children}</div>;
  },
  useFrame: (fn) => rig.frames.push(fn),
  useThree: () => ({ gl: rig.gl }),
}));
vi.mock("@react-three/drei", () => {
  const load = (path) => {
    rig.loads.push(path);
    return { scene: rig.source };
  };
  load.clear = (path) => rig.clear(path);
  return {
    useEnvironment: { clear: vi.fn() },
    useGLTF: load,
    useProgress: (selector) => selector({ active: false }),
    Environment: () => null,
    OrbitControls: (props) => {
      rig.orbit = props;
      return null;
    },
    ContactShadows: () => null,
    Grid: () => null,
  };
});
beforeEach(() => {
  const sourceNodes = Object.fromEntries(
    [
      "FL_hip",
      "FR_thigh",
      "RL_calf",
      "L_hip",
      "L_shoulder",
      "pelvis",
      "torso",
    ].map((name) => {
      const node = new Group();
      node.name = name;
      return [name, node];
    }),
  );
  rig.source = new Group();
  Object.values(sourceNodes).forEach((node) => rig.source.add(node));
  const clone = rig.source.clone.bind(rig.source);
  vi.spyOn(rig.source, "clone").mockImplementation((recursive) => {
    const instance = clone(recursive);
    rig.scene = instance;
    rig.nodes = {};
    instance.traverse((node) => {
      if (node.name) rig.nodes[node.name] = node;
    });
    vi.spyOn(instance.rotation, "set");
    return instance;
  });
  rig.canvasMounts = 0;
  rig.canvasUnmounts = 0;
  rig.frames = [];
  rig.loads = [];
  rig.fail = false;
  rig.clear = vi.fn();
  rig.gl = { domElement: document.createElement("canvas") };
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
it("only loads the selected quadruped and preserves its axes", () => {
  render(
    <RobotViewer
      motors={[
        { nombre: "FL_hip", angulo: 90 },
        { nombre: "FR_thigh", angulo: 45 },
      ]}
    />,
  );
  rig.frames.at(-1)();
  expect(rig.loads).toEqual(["/Perro.glb"]);
  expect(rig.nodes.FL_hip.rotation.z).toBeCloseTo(Math.PI / 2);
  expect(rig.nodes.FR_thigh.rotation.x).toBeCloseTo(Math.PI / 4);
});
it("preserves G1 signs, IMU and the hidden dance toggle", () => {
  const remove = vi.spyOn(window, "removeEventListener");
  const view = render(
    <RobotViewer
      modelType="g1"
      motors={[{ nombre: "L_hip_pitch", angulo: 90 }]}
      imu={{ pitch: 10, yaw: 20, roll: 30 }}
    />,
  );
  rig.frames.at(-1)({ clock: { elapsedTime: 0.125 } });
  expect(rig.nodes.L_hip.rotation.x).toBeCloseTo(-Math.PI / 2);
  expect(rig.scene.rotation.set).toHaveBeenCalledWith(
    (10 * Math.PI) / 180,
    (20 * Math.PI) / 180,
    (30 * Math.PI) / 180,
  );
  for (const key of "dance") fireEvent.keyDown(window, { key });
  rig.frames.at(-1)({ clock: { elapsedTime: 0.125 } });
  expect(rig.scene.position.y).toBeGreaterThan(0);
  for (const key of "dance") fireEvent.keyDown(window, { key });
  rig.frames.at(-1)({ clock: { elapsedTime: 0.125 } });
  expect(rig.scene.position.y).toBe(0);
  expect(rig.loads.every((path) => path === "/Ottoman.glb")).toBe(true);
  view.unmount();
  expect(remove.mock.calls.some((call) => call[0] === "keydown")).toBe(true);
});
it("isolates renderer failure and retries only the selected asset", () => {
  rig.fail = true;
  render(<RobotViewer />);
  expect(screen.getByText("No se pudo iniciar el visor")).toBeTruthy();
  rig.fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Reintentar visor" }));
  expect(rig.clear).toHaveBeenCalledWith("/Perro.glb");
  expect(useEnvironment.clear).toHaveBeenCalledWith({ files: "/city.hdr" });
  expect(screen.queryByText("No se pudo iniciar el visor")).toBeNull();
});
it("handles context loss and removes its listener when unmounted", () => {
  const remove = vi.spyOn(rig.gl.domElement, "removeEventListener");
  render(<RobotViewer />);
  act(() =>
    rig.gl.domElement.dispatchEvent(
      new Event("webglcontextlost", { cancelable: true }),
    ),
  );
  expect(screen.getByText("No se pudo iniciar el visor")).toBeTruthy();
  expect(remove.mock.calls.some((call) => call[0] === "webglcontextlost")).toBe(
    true,
  );
});

it("switches models repeatedly without replacing Canvas or removing OrbitControls", () => {
  const view = render(<RobotViewer modelType="quadruped" />);
  for (let i = 0; i < 10; i++)
    view.rerender(<RobotViewer modelType={i % 2 ? "quadruped" : "g1"} />);
  expect(rig.canvasMounts).toBe(1);
  expect(rig.canvasUnmounts).toBe(0);
  expect(rig.orbit).toMatchObject({
    enabled: true,
    makeDefault: true,
    target: [0, 0.6, 0],
  });
  view.unmount();
  expect(rig.canvasUnmounts).toBe(1);
});

it.each(["g1", "quadruped"])(
  "neutral %s resets transform state without mutating the cached GLB",
  (type) => {
    const motor =
      type === "g1"
        ? { nombre: "L_hip_pitch", angulo: 60 }
        : { nombre: "FL_hip", angulo: 60 };
    const view = render(<RobotViewer modelType={type} motors={[motor]} />);
    rig.frames.at(-1)({ clock: { elapsedTime: 1 } });
    const node = type === "g1" ? "L_hip" : "FL_hip";
    const axis = type === "g1" ? "x" : "z";
    expect(rig.nodes[node].rotation[axis]).not.toBe(0);
    expect(rig.source.getObjectByName(node).rotation[axis]).toBe(0);
    view.rerender(<RobotViewer modelType={type} motors={[motor]} neutral />);
    rig.frames.at(-1)({ clock: { elapsedTime: 1 } });
    expect(rig.nodes[node].rotation[axis]).toBeCloseTo(0);
    expect(rig.canvasMounts).toBe(1);
  },
);

it("pauses a hidden viewer, defers hidden model changes and retains G1 dance state", () => {
  const view = render(<RobotViewer modelType="g1" active />);
  for (const key of "dance") fireEvent.keyDown(window, { key });
  rig.frames.at(-1)({ clock: { elapsedTime: 0.125 } });
  expect(rig.scene.position.y).toBeGreaterThan(0);
  view.rerender(<RobotViewer modelType="g1" active={false} />);
  const loads = rig.loads.length;
  const y = rig.scene.position.y;
  expect(rig.frameloop).toBe("never");
  expect(rig.orbit.enabled).toBe(false);
  rig.frames.at(-1)({ clock: { elapsedTime: 0 } });
  expect(rig.scene.position.y).toBe(y);
  view.rerender(<RobotViewer modelType="quadruped" active={false} />);
  expect(rig.loads).toHaveLength(loads);
  view.rerender(<RobotViewer modelType="g1" active />);
  rig.frames.at(-1)({ clock: { elapsedTime: 0.125 } });
  expect(rig.scene.position.y).toBeGreaterThan(0);
  expect(rig.frameloop).toBe("always");
  expect(rig.canvasMounts).toBe(1);
});

it("manual neutral G1 still permits local dance and restores its resting pose", () => {
  render(<RobotViewer modelType="g1" neutral />);
  for (const key of "dance") fireEvent.keyDown(window, { key });
  rig.frames.at(-1)({ clock: { elapsedTime: 0.125 } });
  expect(rig.scene.position.y).toBeGreaterThan(0);
  for (const key of "dance") fireEvent.keyDown(window, { key });
  rig.frames.at(-1)({ clock: { elapsedTime: 0.125 } });
  expect(rig.scene.position.y).toBe(0);
  expect(rig.nodes.L_shoulder.rotation.x).toBeCloseTo(0);
});
