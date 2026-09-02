import React, { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center, ContactShadows, Grid } from '@react-three/drei';

function ModelG1({ motors = [], imu }) {
  const { scene, nodes } = useGLTF('/Ottoman.glb');
  
  useFrame(() => {
    if (!nodes) return;
    const motorDict = {};
    for (let i = 0; i < motors.length; i++) {
      motorDict[motors[i].nombre] = motors[i].angulo;
    }
    const deg2rad = Math.PI / 180;

    // Aplicamos la rotacion real del IMU a toda la malla. 
    // Esto es lo que determina si el robot esta parado o acostado en el mundo real.
    if (imu && imu.pitch !== undefined) {
      scene.rotation.set(
        (imu.pitch || 0) * deg2rad,
        (imu.yaw || 0) * deg2rad,
        (imu.roll || 0) * deg2rad
      );
    }

    const applyRot = (nodeName, pitchName, yawName, rollName) => {
      const node = nodes[nodeName];
      if (!node) return;
      // Invertimos el signo del Pitch (X) porque el modelo 3D tiene los ejes invertidos
      if (pitchName && motorDict[pitchName] !== undefined) node.rotation.x = -motorDict[pitchName] * deg2rad;
      if (yawName && motorDict[yawName] !== undefined) node.rotation.y = motorDict[yawName] * deg2rad;
      if (rollName && motorDict[rollName] !== undefined) node.rotation.z = motorDict[rollName] * deg2rad;
    };

    // NO aplicamos rotacion de motores al 'torso'. 
    // En este GLTF, el 'torso' es el hueso ROOT (padre de las piernas). 
    // Si le aplicamos el motor de la cintura, todo el robot (incluidas las piernas) gira hacia arriba.
    // applyRot('torso', 'torso_pitch', 'torso_yaw', 'torso_roll');

    applyRot('L_shoulder', 'L_shoulder_pitch', 'L_shoulder_yaw', 'L_shoulder_roll');
    applyRot('L_elbow', 'L_elbow', null, null);
    applyRot('R_shoulder', 'R_shoulder_pitch', 'R_shoulder_yaw', 'R_shoulder_roll');
    applyRot('R_elbow', 'R_elbow', null, null);
    applyRot('L_hip', 'L_hip_pitch', 'L_hip_yaw', 'L_hip_roll');
    applyRot('L_knee', 'L_knee', null, null);
    applyRot('R_hip', 'R_hip_pitch', 'R_hip_yaw', 'R_hip_roll');
    applyRot('R_knee', 'R_knee', null, null);
  });

  return <primitive object={scene} scale={1.1} />;
}

function ModelQuadruped({ motors = [] }) {
  const { scene, nodes } = useGLTF('/Perro.glb');
  
  useFrame(() => {
    if (!nodes) return;
    const motorDict = {};
    for (let i = 0; i < motors.length; i++) {
      motorDict[motors[i].nombre] = motors[i].angulo;
    }
    const deg2rad = Math.PI / 180;

    const applyRot = (nodeName, axis = 'x') => {
      const node = nodes[nodeName];
      if (node && motorDict[nodeName] !== undefined) {
        node.rotation[axis] = motorDict[nodeName] * deg2rad;
      }
    };

    ['FL_hip', 'FR_hip', 'RL_hip', 'RR_hip'].forEach(m => applyRot(m, 'z')); 
    ['FL_thigh', 'FR_thigh', 'RL_thigh', 'RR_thigh'].forEach(m => applyRot(m, 'x'));
    ['FL_calf', 'FR_calf', 'RL_calf', 'RR_calf'].forEach(m => applyRot(m, 'x'));
  });

  return <primitive object={scene} scale={1.8} />;
}

export default function RobotViewer({ motors = [], modelType = 'quadruped' }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '350px', flex: 1 }}>
      <Canvas camera={{ position: [2, 1, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <Environment preset="city" />
        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            {modelType === 'g1' ? <ModelG1 motors={motors} /> : <ModelQuadruped motors={motors} />}
          </group>
          <ContactShadows resolution={1024} scale={10} blur={2} opacity={0.6} far={10} color="#000000" position={[0, 0, 0]} />
          <Grid infiniteGrid fadeDistance={15} sectionColor="#42e8e0" sectionThickness={1} cellColor="#26313b" cellThickness={0.6} position={[0, -0.01, 0]} />
        </Suspense>
        <OrbitControls makeDefault target={[0, 0.6, 0]} maxPolarAngle={Math.PI / 2 + 0.1} />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/Ottoman.glb');
useGLTF.preload('/Perro.glb');
