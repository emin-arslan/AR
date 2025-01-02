import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Stars } from '@react-three/drei';
import { ARButton, XR } from '@react-three/xr';
import './App.css';

function Model() {
  const gltf = useGLTF('./output.gltf');
  return <primitive object={gltf.scene} scale={1} position={[0, 0, 0]} />;
}

function App() {
  const [isAR, setIsAR] = useState(false);

  return (
    <div className="app-container">
      <div className="canvas-container">
        <ARButton className="ar-button" />
        <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
          <XR>
            <Environment preset="sunset" />
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <Suspense fallback={null}>
              <Model />
            </Suspense>
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
            />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          </XR>
        </Canvas>
      </div>
      <div className="controls">
        <h1>3D Model Viewer</h1>
        <p>Interact with the model using mouse/touch controls</p>
        <ul>
          <li>Rotate: Click and drag</li>
          <li>Zoom: Scroll or pinch</li>
          <li>Pan: Right click and drag</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
