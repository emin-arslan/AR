import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ARButton, XR, Controllers, useGLTF } from '@react-three/xr';
import { OrbitControls, Environment, useProgress } from '@react-three/drei';
import './App.css';

function Model() {
  const { scene } = useGLTF('/output.gltf', true);
  console.log('Model loaded:', scene);
  
  return (
    <primitive 
      object={scene} 
      scale={[0.5, 0.5, 0.5]} 
      position={[0, 0, -1]}
      rotation={[0, 0, 0]}
    />
  );
}

function Loader() {
  const { progress } = useProgress();
  return <div className="loading">Loading... {progress.toFixed()}%</div>;
}

function App() {
  const [isARMode, setIsARMode] = useState(false);

  return (
    <div className="ar-container">
      <ARButton
        onClick={() => {
          setIsARMode(true);
          console.log('AR mode activated');
        }}
      />
      <Canvas
        camera={{
          fov: 75,
          near: 0.1,
          far: 1000,
          position: [0, 1.5, 3]
        }}
        onCreated={({ gl }) => {
          console.log('Canvas created');
          gl.setClearColor('#000000', 0);
        }}
      >
        <XR>
          <Suspense fallback={<Loader />}>
            <Environment preset="sunset" />
            <ambientLight intensity={0.8} />
            <spotLight 
              position={[5, 5, 5]} 
              angle={0.15} 
              penumbra={1} 
              intensity={1}
              castShadow
            />
            <Model />
            <Controllers />
            <OrbitControls 
              enableDamping
              dampingFactor={0.05}
              minDistance={1}
              maxDistance={10}
            />
          </Suspense>
        </XR>
      </Canvas>
    </div>
  );
}

export default App;
