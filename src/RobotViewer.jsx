import React, { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';

function ModelG1({ motors = [] }) {
  const { scene, nodes } = useGLTF('/Ottoman.glb');
  
  useFrame(() => {
    if (!nodes) return;
    const motorDict = {};
    for (let i = 0; i < motors.length; i++) {
      motorDict[motors[i].nombre] = motors[i].angulo;
    }
    const deg2rad = Math.PI / 180;

    const applyRot = (nodeName, pitchName, yawName, rollName) => {
      const node = nodes[nodeName];
      if (!node) return;
      if (pitchName && motorDict[pitchName] !== undefined) node.rotation.x = motorDict[pitchName] * deg2rad;
      if (yawName && motorDict[yawName] !== undefined) node.rotation.y = motorDict[yawName] * deg2rad;
      if (rollName && motorDict[rollName] !== undefined) node.rotation.z = motorDict[rollName] * deg2rad;
    };

    applyRot('torso', 'torso_pitch', 'torso_yaw', 'torso_roll');
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

    // Función auxiliar para aplicar rotación en un eje específico (x, y o z)
    const applyRot = (nodeName, axis = 'x') => {
      const node = nodes[nodeName];
      if (node && motorDict[nodeName] !== undefined) {
        node.rotation[axis] = motorDict[nodeName] * deg2rad;
      }
    };

    // MAPEO CUADRÚPEDO: Nombre del nodo en Blender coincide con la telemetría
    // ATENCIÓN: Si las patas rotan en una dirección extraña, cambiá la letra 'x' 
    // por 'y' o 'z' según cómo estén orientados los ejes locales en Blender.
    
    // Caderas (Abducción/Aducción) - Suele ser el eje Z o Y dependiendo del export
    ['FL_hip', 'FR_hip', 'RL_hip', 'RR_hip'].forEach(m => applyRot(m, 'z')); 
    
    // Muslos (Adelante/Atrás) - Suele ser el eje X
    ['FL_thigh', 'FR_thigh', 'RL_thigh', 'RR_thigh'].forEach(m => applyRot(m, 'x'));
    
    // Rodillas (Flexión/Extensión) - Suele ser el eje X
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
          <Center position={[0, 0.9, 0]}>
            {modelType === 'g1' ? <ModelG1 motors={motors} /> : <ModelQuadruped motors={motors} />}
          </Center>
        </Suspense>
        <OrbitControls makeDefault target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/Ottoman.glb');
useGLTF.preload('/Perro.glb');
