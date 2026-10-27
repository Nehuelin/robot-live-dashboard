import React, { Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ViewerBoundary } from "./components/ViewerBoundary";
import { cloneRobotScene } from "./robotScene";
import {
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
  Grid,
  useProgress,
  useEnvironment,
} from "@react-three/drei";

//Easter egg
function useDanceMode(active) {
  const [dancing, setDancing] = React.useState(false);
  React.useEffect(() => {
    if (!active) return;
    let keys = "";
    const handleKeyDown = (e) => {
      keys += e.key.toLowerCase();
      if (keys.length > 5) keys = keys.slice(-5);
      if (keys === "dance") setDancing((d) => !d);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active]);
  return dancing;
}

// Three.js poses intentionally mutate cached scene objects inside the frame loop.
/* oxlint-disable react/immutability -- Imperative R3F animation, not React state mutation. */
function ModelG1({ motors = [], imu, neutral, active }) {
  const asset = useGLTF("/Ottoman.glb");
  const { scene, nodes, resetPose } = React.useMemo(
    () => cloneRobotScene(asset.scene),
    [asset.scene],
  );
  const isDancing = useDanceMode(active);
  React.useLayoutEffect(() => {
    if (neutral) resetPose();
  }, [neutral, isDancing, resetPose]);

  useFrame((state) => {
    if (!active || !nodes) return;
    const deg2rad = Math.PI / 180;

    if (isDancing) {
      const t = state.clock.elapsedTime;
      const bpm = 120;
      const beat = ((t * bpm) / 60) * Math.PI * 2;

      scene.position.y = Math.abs(Math.sin(beat)) * 0.04;

      if (nodes["pelvis"]) {
        nodes["pelvis"].rotation.z = Math.sin(beat * 0.5) * 12 * deg2rad;
      }

      if (nodes["torso"]) {
        nodes["torso"].rotation.y = Math.sin(beat * 0.5) * 20 * deg2rad;
      }

      const legPhaseL = Math.sin(beat * 0.5);
      const legPhaseR = Math.sin(beat * 0.5 + Math.PI);

      if (nodes["L_hip"]) {
        nodes["L_hip"].rotation.x = legPhaseL * 50 * deg2rad;
        nodes["L_hip"].rotation.z = Math.sin(beat * 0.5) * 5 * deg2rad;
      }
      if (nodes["R_hip"]) {
        nodes["R_hip"].rotation.x = legPhaseR * 50 * deg2rad;
        nodes["R_hip"].rotation.z =
          Math.sin(beat * 0.5 + Math.PI) * 5 * deg2rad;
      }

      const kneeBase = -15;
      if (nodes["L_knee"])
        nodes["L_knee"].rotation.x =
          (kneeBase + Math.abs(legPhaseL) * -20) * deg2rad;
      if (nodes["R_knee"])
        nodes["R_knee"].rotation.x =
          (kneeBase + Math.abs(legPhaseR) * -20) * deg2rad;

      const armWaveL = Math.sin(beat * 0.5);
      const armWaveR = Math.sin(beat * 0.5 + Math.PI);

      if (nodes["L_shoulder"]) {
        const raise = armWaveL * 0.5 + 0.5;
        nodes["L_shoulder"].rotation.x = (raise * -130 + 10) * deg2rad;
        nodes["L_shoulder"].rotation.z = (20 + raise * 15) * deg2rad;
        nodes["L_shoulder"].rotation.y = Math.sin(beat * 0.25) * 15 * deg2rad;
      }
      if (nodes["R_shoulder"]) {
        const raise = armWaveR * 0.5 + 0.5;
        nodes["R_shoulder"].rotation.x = (raise * -130 + 10) * deg2rad;
        nodes["R_shoulder"].rotation.z = -(20 + raise * 15) * deg2rad;
        nodes["R_shoulder"].rotation.y =
          Math.sin(beat * 0.25 + Math.PI) * 15 * deg2rad;
      }

      if (nodes["L_elbow"])
        nodes["L_elbow"].rotation.x =
          (-30 + Math.sin(beat * 0.5 - 0.4) * -25) * deg2rad;
      if (nodes["R_elbow"])
        nodes["R_elbow"].rotation.x =
          (-30 + Math.sin(beat * 0.5 + Math.PI - 0.4) * -25) * deg2rad;

      return;
    }

    if (neutral) return;
    scene.position.y = 0;
    if (nodes["pelvis"]) nodes["pelvis"].rotation.z = 0;
    if (nodes["torso"]) nodes["torso"].rotation.y = 0;

    const motorDict = {};
    for (let i = 0; i < motors.length; i++) {
      if (Number.isFinite(motors[i].angulo))
        motorDict[motors[i].nombre] = motors[i].angulo;
    }

    if (imu && Number.isFinite(imu.pitch)) {
      scene.rotation.set(
        (imu.pitch || 0) * deg2rad,
        (imu.yaw || 0) * deg2rad,
        (imu.roll || 0) * deg2rad,
      );
    }

    const applyRot = (nodeName, pitchName, yawName, rollName) => {
      const node = nodes[nodeName];
      if (!node) return;
      if (pitchName && motorDict[pitchName] !== undefined)
        node.rotation.x = -motorDict[pitchName] * deg2rad;
      if (yawName && motorDict[yawName] !== undefined)
        node.rotation.y = motorDict[yawName] * deg2rad;
      if (rollName && motorDict[rollName] !== undefined)
        node.rotation.z = motorDict[rollName] * deg2rad;
    };

    applyRot("torso", "torso_pitch", "torso_yaw", "torso_roll");

    applyRot(
      "L_shoulder",
      "L_shoulder_pitch",
      "L_shoulder_yaw",
      "L_shoulder_roll",
    );
    applyRot("L_elbow", "L_elbow", null, null);
    applyRot(
      "R_shoulder",
      "R_shoulder_pitch",
      "R_shoulder_yaw",
      "R_shoulder_roll",
    );
    applyRot("R_elbow", "R_elbow", null, null);
    applyRot("L_hip", "L_hip_pitch", "L_hip_yaw", "L_hip_roll");
    applyRot("L_knee", "L_knee", null, null);
    applyRot("R_hip", "R_hip_pitch", "R_hip_yaw", "R_hip_roll");
    applyRot("R_knee", "R_knee", null, null);
  });

  return <primitive object={scene} scale={1.1} />;
}

function ModelQuadruped({ motors = [], neutral, active }) {
  const asset = useGLTF("/Perro.glb");
  const { scene, nodes, resetPose } = React.useMemo(
    () => cloneRobotScene(asset.scene),
    [asset.scene],
  );
  React.useLayoutEffect(() => {
    if (neutral) resetPose();
  }, [neutral, resetPose]);

  useFrame(() => {
    if (!active || neutral || !nodes) return;
    const motorDict = {};
    for (let i = 0; i < motors.length; i++) {
      if (Number.isFinite(motors[i].angulo))
        motorDict[motors[i].nombre] = motors[i].angulo;
    }
    const deg2rad = Math.PI / 180;

    const applyRot = (nodeName, axis = "x") => {
      const node = nodes[nodeName];
      if (node && motorDict[nodeName] !== undefined) {
        node.rotation[axis] = motorDict[nodeName] * deg2rad;
      }
    };

    ["FL_hip", "FR_hip", "RL_hip", "RR_hip"].forEach((m) => applyRot(m, "z"));
    ["FL_thigh", "FR_thigh", "RL_thigh", "RR_thigh"].forEach((m) =>
      applyRot(m, "x"),
    );
    ["FL_calf", "FR_calf", "RL_calf", "RR_calf"].forEach((m) =>
      applyRot(m, "x"),
    );
  });

  return <primitive object={scene} scale={1.8} />;
}

/* oxlint-enable react/immutability */

function LoadIndicator() {
  const active = useProgress((state) => state.active);
  return active ? (
    <div className="viewer-loader" role="status">
      <span className="loader" />
      Cargando modelo 3D…
    </div>
  ) : null;
}

function ContextMonitor() {
  const { gl } = useThree();
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    const lost = (event) => {
      event.preventDefault();
      setFailed(true);
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl]);
  if (failed) throw new Error("Se perdió el contexto WebGL.");
  return null;
}

function RobotViewer({
  motors = [],
  modelType = "quadruped",
  imu,
  active = true,
  neutral = false,
}) {
  const [version, setVersion] = React.useState(0);
  const retry = () => {
    useGLTF.clear(modelType === "g1" ? "/Ottoman.glb" : "/Perro.glb");
    useEnvironment.clear({ files: "/city.hdr" });
    setVersion((v) => v + 1);
  };
  return (
    <ViewerBoundary key={version} onRetry={retry}>
      <div
        className="robot-viewer"
        data-model={modelType === "g1" ? "g1" : "go2"}
        aria-label={`Visor tridimensional ${modelType === "g1" ? "G1" : "Go2"}`}
      >
        <Canvas
          frameloop={active ? "always" : "never"}
          camera={{ position: [2, 1, 3], fov: 50 }}
          fallback={
            <div className="viewer-message">
              <strong>WebGL no está disponible</strong>
              <span>Los cuatro paneles de telemetría siguen activos.</span>
            </div>
          }
        >
          <ContextMonitor />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <Suspense fallback={null}>
            <Environment files="/city.hdr" />
            <group position={[0, 0, 0]}>
              {modelType === "g1" ? (
                <ModelG1
                  motors={motors}
                  imu={imu}
                  neutral={neutral}
                  active={active}
                />
              ) : (
                <ModelQuadruped
                  motors={motors}
                  neutral={neutral}
                  active={active}
                />
              )}
            </group>
            <ContactShadows
              resolution={1024}
              scale={10}
              blur={2}
              opacity={0.6}
              far={10}
              color="#000000"
              position={[0, 0, 0]}
            />
            <Grid
              infiniteGrid
              fadeDistance={15}
              sectionColor="#42e8e0"
              sectionThickness={1}
              cellColor="#26313b"
              cellThickness={0.6}
              position={[0, -0.01, 0]}
            />
          </Suspense>
          <OrbitControls
            enabled={active}
            makeDefault
            target={[0, 0.6, 0]}
            maxPolarAngle={Math.PI / 2 + 0.1}
          />
        </Canvas>
        <LoadIndicator />
      </div>
    </ViewerBoundary>
  );
}

// Hidden viewers retain camera/dance state without processing further packets.
export default React.memo(
  RobotViewer,
  (previous, next) => previous.active === false && next.active === false,
);
