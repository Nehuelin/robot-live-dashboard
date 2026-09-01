import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';

function Model({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.1} />;
}

export default function RobotViewer() {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '350px', flex: 1 }}>
      <Canvas camera={{ position: [2, 1, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <Environment preset="city" />
        <Suspense fallback={null}>
          <Center position={[0, 0.9, 0]}>
            <Model url="/Ottoman.glb" />
          </Center>
        </Suspense>
        <OrbitControls makeDefault target={[0, 0, 0]} />
      </Canvas>
    </div>
  );
}
