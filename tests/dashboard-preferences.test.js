import { beforeEach, it, expect } from "vitest";
import { Group, Mesh, BoxGeometry, MeshBasicMaterial } from "three";
import {
  defaultPanels,
  readPanelPreferences,
  PANEL_PREFERENCES_KEY,
  resolveViewerSelection,
} from "../src/dashboardPreferences";
import { cloneRobotScene } from "../src/robotScene";

beforeEach(() => localStorage.clear());
it("missing or invalid individual flags safely use defaults and ignore unknown keys", () => {
  localStorage.setItem(
    PANEL_PREFERENCES_KEY,
    JSON.stringify({
      version: 1,
      visible: { motors: false, model: "false", unknown: false },
    }),
  );
  expect(readPanelPreferences()).toEqual({ ...defaultPanels(), motors: false });
});
it.each([
  ["auto", "g1", true, "g1", false],
  ["auto", "go2", true, "go2", false],
  ["auto", "", false, "", false],
  ["g1", "go2", true, "g1", true],
  ["go2", "g1", true, "go2", true],
  ["g1", "g1", true, "g1", false],
  ["go2", "", false, "go2", true],
])(
  "viewer selection %s with %s stays independent of telemetry",
  (mode, reported, hasData, model, neutral) => {
    expect(resolveViewerSelection(mode, reported, hasData)).toEqual({
      model,
      neutral,
      manual: mode !== "auto",
    });
  },
);
it("clones transforms while retaining shared geometry/materials and original rest rotations", () => {
  const root = new Group();
  const node = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  node.name = "joint";
  node.rotation.x = 0.3;
  root.add(node);
  const instance = cloneRobotScene(root);
  expect(instance.nodes.joint).not.toBe(node);
  expect(instance.nodes.joint.geometry).toBe(node.geometry);
  expect(instance.nodes.joint.material).toBe(node.material);
  instance.nodes.joint.rotation.x = 1;
  expect(node.rotation.x).toBeCloseTo(0.3);
  instance.resetPose();
  expect(instance.nodes.joint.rotation.x).toBeCloseTo(0.3);
  node.geometry.dispose();
  node.material.dispose();
});
