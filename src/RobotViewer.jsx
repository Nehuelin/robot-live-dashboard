import React, { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';

function Model({ url, motors = [] }) {
  const { scene, nodes } = useGLTF(url);
  
  useFrame(() => {
    if (!nodes) return;
    
    // Convertir el array de motores a un diccionario para búsqueda rápida
    const motorDict = {};
    for (let i = 0; i < motors.length; i++) {
      motorDict[motors[i].nombre] = motors[i].angulo;
    }
    
    const deg2rad = Math.PI / 180;

    // Función auxiliar para aplicar la rotación de forma segura
    const applyRot = (nodeName, pitchName, yawName, rollName) => {
      const node = nodes[nodeName];
      if (!node) return; // Ignora si la pieza no existe en el modelo 3D
      
      // Mapeo estándar: Pitch (X), Yaw (Y), Roll (Z)
      // (Si tu modelo tiene los ejes rotados de otra forma, podemos cambiarlos acá)
      if (pitchName && motorDict[pitchName] !== undefined) {
        node.rotation.x = motorDict[pitchName] * deg2rad;
      }
      if (yawName && motorDict[yawName] !== undefined) {
        node.rotation.y = motorDict[yawName] * deg2rad;
      }
      if (rollName && motorDict[rollName] !== undefined) {
        node.rotation.z = motorDict[rollName] * deg2rad;
      }
    };

    // -- MAPEO DE PIEZAS A MOTORES -- //
    
    // Torso central
    applyRot('torso', 'torso_pitch', 'torso_yaw', 'torso_roll');
    
    // Brazo Izquierdo
    applyRot('L_shoulder', 'L_shoulder_pitch', 'L_shoulder_yaw', 'L_shoulder_roll');
    applyRot('L_elbow', 'L_elbow', null, null); // Codo solo necesita un eje
    
    // Brazo Derecho
    applyRot('R_shoulder', 'R_shoulder_pitch', 'R_shoulder_yaw', 'R_shoulder_roll');
    applyRot('R_elbow', 'R_elbow', null, null);
    
    // Pierna Izquierda
    applyRot('L_hip', 'L_hip_pitch', 'L_hip_yaw', 'L_hip_roll');
    applyRot('L_knee', 'L_knee', null, null);
    
    // Pierna Derecha
    applyRot('R_hip', 'R_hip_pitch', 'R_hip_yaw', 'R_hip_roll');
    applyRot('R_knee', 'R_knee', null, null);
  });

  return <primitive object={scene} scale={1.1} />;
}

export default function RobotViewer({ motors = [] }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '350px', flex: 1 }}>
      <Canvas camera={{ position: [2, 1, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <Environment preset="city" />
        <Suspense fallback={null}>
          <Center position={[0, 0.9, 0]}>
            <Model url="/Ottoman.glb" motors={motors} />
          </Center>
        </Suspense>
        <OrbitControls makeDefault target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}
