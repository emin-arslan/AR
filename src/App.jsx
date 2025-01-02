import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Stars, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

function Model() {
  const group = useRef();
  const { scene, animations } = useGLTF('./output.gltf');
  const { actions } = useAnimations(animations, scene);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  useEffect(() => {
    if (scene) {
      // Modelin boundingBox'ını hesapla
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      // En büyük boyuta göre kamerayı ayarla
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraZ = Math.abs(maxDim / Math.sin(fov / 2) / 2);
      
      camera.position.z = cameraZ * 1.5; // Biraz daha uzak dur
      camera.updateProjectionMatrix();

      // Modeli merkeze al
      const center = new THREE.Vector3();
      box.getCenter(center);
      scene.position.sub(center);
    }

    // Tüm animasyonları başlat
    Object.values(actions).forEach(action => action?.play());
  }, [scene, actions, camera]);

  // Otomatik döndürme
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        scale={1}
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
    </group>
  );
}

function Particles() {
  const points = useRef();

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y += 0.001;
    }
  });

  return (
    <points ref={points}>
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

function Scene({ isAR }) {
  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#8b5cf6" />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#60a5fa" />
      <Suspense fallback={null}>
        <Model />
      </Suspense>
      {!isAR && (
        <>
          <Particles />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.3} wireframe />
          </mesh>
        </>
      )}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={50}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAR, setIsAR] = useState(false);
  const [arSupported, setARSupported] = useState(false);
  const canvasRef = useRef();

  useEffect(() => {
    // AR desteğini kontrol et
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-ar')
        .then((supported) => {
          setARSupported(supported);
        })
        .catch(() => setARSupported(false));
    }

    setTimeout(() => setIsLoading(false), 3000);
  }, []);

  const startAR = async () => {
    if (!canvasRef.current) return;

    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });

      const gl = canvasRef.current.getContext('webgl', {
        xrCompatible: true
      });

      await gl.makeXRCompatible();
      setIsAR(true);
    } catch (error) {
      console.error('AR başlatılamadı:', error);
    }
  };

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
          ref={canvasRef}
          camera={{ position: [0, 1, 5], fov: 45 }}
          gl={{ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
            xrCompatible: true
          }}
          dpr={[1, 2]}
          shadows
        >
          <Scene isAR={isAR} />
        </Canvas>
        <button onClick={startAR} className="ar-floating-button" title="AR'da Görüntüle">
          <span className="ar-icon">📱</span>
        </button>
      </div>
      <div className="controls controls-mobile">
        <div className="controls-header">
          <h1>3D Viewer</h1>
          <span className="ar-badge">AR Ready</span>
        </div>
        <div className="controls-content">
          <div className="feature-list">
            <ul>
              <li>
                <span className="icon">🔄</span>
                Rotate
              </li>
              <li>
                <span className="icon">🔍</span>
                Zoom
              </li>
              <li>
                <span className="icon">✋</span>
                Pan
              </li>
              <li>
                <span className="icon">📱</span>
                AR Available
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
