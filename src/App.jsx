import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Stars, useAnimations } from '@react-three/drei';
import './App.css';

function Model() {
  const { scene, animations } = useGLTF('./output.gltf');
  const { actions } = useAnimations(animations, scene);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    // Tüm animasyonları başlat
    Object.values(actions).forEach(action => action?.play());
  }, [actions]);

  return (
    <primitive 
      object={scene} 
      scale={0.5}
      position={[0, 0, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {hovered && (
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.2} />
        </mesh>
      )}
    </primitive>
  );
}

function Particles() {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attachObject={['attributes', 'position']}
          count={1000}
          array={new Float32Array(3000).map(() => (Math.random() - 0.5) * 10)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#60a5fa" transparent opacity={0.6} />
    </points>
  );
}

function Scene() {
  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#8b5cf6" />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#60a5fa" />
      <Suspense fallback={null}>
        <Model />
      </Suspense>
      <Particles />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.3} wireframe />
      </mesh>
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
      />
    </>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 3000);
  }, []);

  return (
    <div className="app-container">
      {isLoading && (
        <div className="loading-screen">
          <div className="loader"></div>
          <p>Loading 3D Experience...</p>
        </div>
      )}
      <div className="canvas-container">
        <Canvas 
          camera={{ position: [0, 1, 5], fov: 50 }}
          gl={{ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
        >
          <Scene />
        </Canvas>
      </div>
      <div className="controls">
        <div className="controls-header">
          <h1>Interactive 3D Viewer</h1>
        </div>
        <div className="controls-content">
          <div className="feature-list">
            <h2>Features</h2>
            <ul>
              <li>
                <span className="icon">🔄</span>
                Rotate: Left click and drag
              </li>
              <li>
                <span className="icon">🔍</span>
                Zoom: Mouse wheel or pinch
              </li>
              <li>
                <span className="icon">✋</span>
                Pan: Right click and drag
              </li>
            </ul>
          </div>
          <div className="interaction-tips">
            <h2>Interaction Tips</h2>
            <p>Hover over the model to see special effects!</p>
            <p>The model animates automatically if it has animations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
