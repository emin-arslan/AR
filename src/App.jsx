import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useThree, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Stars, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import './App.css';

extend({ EffectComposer, RenderPass, UnrealBloomPass });

const APP_VERSION = "1.0.3";

// GLTF'yi USDZ'ye dönüştürme fonksiyonu
async function convertToUSDZ(gltfUrl) {
  try {
    // GLTF modelini yükle
    const { scene } = await useGLTF(gltfUrl);
    
    // GLTFExporter ile sahneyi dışa aktar
    const exporter = new GLTFExporter();
    const gltfData = await new Promise((resolve) => {
      exporter.parse(scene, resolve, { binary: true });
    });

    // Blob oluştur
    const blob = new Blob([gltfData], { type: 'model/gltf-binary' });
    
    // FormData oluştur
    const formData = new FormData();
    formData.append('file', blob, 'model.glb');
    
    // Pixelcutlabs API'sini kullan (ücretsiz GLTF -> USDZ dönüştürücü)
    const response = await fetch('https://api.pixelcutlabs.com/convert/gltf-to-usdz', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('USDZ dönüştürme hatası');
    }
    
    const usdzBlob = await response.blob();
    return URL.createObjectURL(usdzBlob);
  } catch (error) {
    console.error('USDZ dönüştürme hatası:', error);
    throw error;
  }
}

function NeonRing({ position, scale = 1, color = "#00ff88" }) {
  const ring = useRef();
  
  useFrame((state) => {
    if (ring.current) {
      ring.current.rotation.z += 0.01;
      ring.current.scale.x = scale * (1 + Math.sin(state.clock.elapsedTime) * 0.1);
      ring.current.scale.y = scale * (1 + Math.sin(state.clock.elapsedTime) * 0.1);
    }
  });

  return (
    <mesh ref={ring} position={position}>
      <torusGeometry args={[1, 0.02, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

function Model() {
  const group = useRef();
  const { scene, animations } = useGLTF('./output.gltf');
  const { actions } = useAnimations(animations, scene);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [showNeonRings, setShowNeonRings] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const { camera } = useThree();

  const handleClick = () => {
    const currentTime = Date.now();
    if (currentTime - lastClickTime < 300) { // Çift tıklama kontrolü
      setShowNeonRings(prev => !prev);
    }
    setLastClickTime(currentTime);
    setClicked(!clicked);
  };

  useEffect(() => {
    if (scene) {
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraZ = Math.abs(maxDim / Math.sin(fov / 2) / 2);
      
      camera.position.z = cameraZ * 1.5;
      camera.updateProjectionMatrix();

      const center = new THREE.Vector3();
      box.getCenter(center);
      scene.position.sub(center);

      // Materyal güncelleme
      scene.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshPhysicalMaterial({
            ...child.material,
            roughness: 0.4,
            metalness: 0.8,
            envMapIntensity: 1.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
          });
        }
      });
    }

    Object.values(actions).forEach(action => action?.play());
  }, [scene, actions, camera]);

  useFrame((state) => {
    if (group.current) {
      if (hovered) {
        group.current.rotation.y += 0.004;
      } else {
        group.current.rotation.y += 0.002;
      }

      if (clicked) {
        group.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });

  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        scale={clicked ? 1.2 : 1}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      />
      {showNeonRings && (
        <>
          <NeonRing position={[0, 0, 0]} scale={2} color="#00ff88" />
          <NeonRing position={[0, 0, 0]} scale={2.5} color="#0088ff" />
          <NeonRing position={[0, 0, 0]} scale={3} color="#ff00ff" />
        </>
      )}
      {hovered && (
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
}

function ParticleField() {
  const count = 1000;
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.8, 0.8);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return [positions, colors];
  }, []);

  const points = useRef();

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y += 0.001;
      points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attachObject={['attributes', 'position']}
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attachObject={['attributes', 'color']}
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Effects() {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef();

  useEffect(() => {
    composer.current.setSize(size.width, size.height);
  }, [size]);

  useFrame(() => {
    composer.current.render();
  }, 1);

  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <unrealBloomPass
        attachArray="passes"
        args={[undefined, 1.5, 1, 0]}
        threshold={0.1}
        strength={0.8}
        radius={0.8}
      />
    </effectComposer>
  );
}

function Scene({ isAR }) {
  return (
    <>
      <Effects />
      <Environment preset="sunset" />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#8b5cf6" />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#60a5fa" />
      <spotLight
        position={[0, 5, 0]}
        intensity={0.8}
        color="#00ff88"
        distance={20}
        angle={0.5}
        penumbra={1}
        decay={2}
      />
      <Suspense fallback={null}>
        <Model />
      </Suspense>
      {!isAR && (
        <>
          <ParticleField />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial
              color="#1e293b"
              transparent
              opacity={0.3}
              roughness={0.4}
              metalness={0.8}
              envMapIntensity={1.5}
            />
          </mesh>
        </>
      )}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [isAR, setIsAR] = useState(false);
  const [arSupported, setARSupported] = useState(false);
  const [arError, setArError] = useState(null);
  const [usdzUrl, setUsdzUrl] = useState(null);
  const canvasRef = useRef();
  const sessionRef = useRef(null);

  // AR desteğini kontrol et
  const checkARSupport = async () => {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      if (isIOS) {
        const link = document.createElement('a');
        if ('relList' in link && link.relList.supports('ar')) {
          setARSupported(true);
        } else {
          setARSupported(false);
          setArError('iOS AR desteklenmiyor');
        }
        return;
      }

      // Android için WebXR kontrolü
      if ('xr' in navigator) {
        const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
        setARSupported(isSupported);
        if (!isSupported) {
          setArError('WebXR AR desteklenmiyor');
        }
      } else {
        setARSupported(false);
        setArError('WebXR API bulunamadı');
      }
    } catch (error) {
      console.error('AR destek kontrolü hatası:', error);
      setARSupported(false);
      setArError('AR destek kontrolü başarısız');
    }
  };

  // Başlangıç yüklemesi
  useEffect(() => {
    // Model yüklemesi için loading state'i ayarla
    setIsLoading(true);

    // AR desteğini arka planda kontrol et
    checkARSupport().catch(console.error);

    // Model yükleme animasyonu için timeout
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => {
      clearTimeout(loadingTimeout);
      if (sessionRef.current) {
        sessionRef.current.end().catch(console.error);
      }
      if (usdzUrl) {
        URL.revokeObjectURL(usdzUrl);
      }
    };
  }, []);

  const startAR = async () => {
    setArError(null);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
      try {
        setIsConverting(true);
        // iOS için USDZ'ye dönüştürme işlemini burada yap
        if (!usdzUrl) {
          const url = await convertToUSDZ('./output.gltf');
          setUsdzUrl(url);
        }

        const anchor = document.createElement('a');
        anchor.setAttribute('rel', 'ar');
        anchor.setAttribute('href', usdzUrl);
        anchor.setAttribute('data-usdzscale', '1');
        anchor.setAttribute('data-usdztitle', '3D Model');
        anchor.setAttribute('data-usdzanimated', 'true');
        
        const img = document.createElement('img');
        img.style.display = 'none';
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        anchor.appendChild(img);
        
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } catch (error) {
        console.error('iOS AR başlatma hatası:', error);
        setArError('AR başlatma hatası: ' + error.message);
      } finally {
        setIsConverting(false);
      }
      return;
    }

    // Android ve diğer cihazlar için WebXR
    if (!canvasRef.current) {
      setArError('Canvas referansı bulunamadı');
      return;
    }

    try {
      if (sessionRef.current) {
        await sessionRef.current.end();
        sessionRef.current = null;
        setIsAR(false);
        return;
      }

      // WebXR session'ı başlat
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local', 'hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });

      sessionRef.current = session;

      // WebGL context'i al ve XR için hazırla
      const gl = canvasRef.current.getContext('webgl', {
        xrCompatible: true,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        depth: true,
        stencil: true
      });

      if (!gl) {
        throw new Error('WebGL context oluşturulamadı');
      }

      await gl.makeXRCompatible();

      // XR session için gerekli alanları ayarla
      const referenceSpace = await session.requestReferenceSpace('local');
      const viewerSpace = await session.requestReferenceSpace('viewer');
      const hitTestSource = await session.requestHitTestSource({
        space: viewerSpace
      });

      // Session sonlandığında temizlik yap
      session.addEventListener('end', () => {
        hitTestSource?.cancel();
        sessionRef.current = null;
        setIsAR(false);
      });

      // Render state'i güncelle
      const glLayer = new XRWebGLLayer(session, gl);
      session.updateRenderState({
        baseLayer: glLayer,
        depthFar: 1000,
        depthNear: 0.1
      });

      setIsAR(true);

      // XR render döngüsü
      const onXRFrame = (time, frame) => {
        if (!sessionRef.current) return;

        session.requestAnimationFrame(onXRFrame);

        const pose = frame.getViewerPose(referenceSpace);
        if (!pose) return;

        // Hit test sonuçlarını al
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
          const hitPose = hitTestResults[0].getPose(referenceSpace);
          if (hitPose) {
            // Modeli hit test pozisyonuna yerleştir
            const position = hitPose.transform.position;
            // Burada modelin pozisyonunu güncelleyebilirsiniz
          }
        }

        // Her frame'de görünümü güncelle
        const view = pose.views[0];
        const viewport = glLayer.getViewport(view);
        gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
      };

      session.requestAnimationFrame(onXRFrame);
    } catch (error) {
      console.error('AR başlatılamadı:', error);
      if (error.name === 'SecurityError') {
        setArError('AR için gerekli izinler verilmedi. Lütfen kamera izni verin.');
      } else if (error.name === 'NotSupportedError') {
        setArError('Cihazınız AR özelliğini desteklemiyor.');
      } else {
        setArError('AR başlatılırken bir hata oluştu: ' + error.message);
      }
      setIsAR(false);
    }
  };

  return (
    <div className="app-container">
      {(isLoading || isConverting) && (
        <div className="loading-screen">
          <div className="loader"></div>
          <p>{isConverting ? "AR ortamı hazırlanıyor..." : "3D Model yükleniyor..."}</p>
        </div>
      )}
      <div className="top-controls">
        <div className="controls-header">
          <h1>3D Model Viewer</h1>
          <div className="version-badge">v{APP_VERSION}</div>
        </div>
        <div className="controls-content">
          <div className="feature-list">
            <ul>
              <li>
                <span className="icon">🔄</span>
                Döndür
              </li>
              <li>
                <span className="icon">🔍</span>
                Yakınlaştır
              </li>
              {arSupported && (
                <li>
                  <span className="icon">📱</span>
                  AR Destekleniyor
                </li>
              )}
            </ul>
          </div>
          {arError && !isLoading && (
            <div className="ar-error">
              <span className="icon">ℹ️</span>
              {arError}
            </div>
          )}
        </div>
      </div>
      <div className="canvas-container">
        <Canvas 
          ref={canvasRef}
          camera={{ position: [0, 1, 5], fov: 45 }}
          gl={{ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true
          }}
          dpr={[1, 2]}
          shadows
        >
          <Scene isAR={isAR} />
        </Canvas>
        {arSupported && (
          <button 
            onClick={startAR} 
            className={`ar-floating-button ${isAR ? 'active' : ''}`} 
            title={isAR ? "AR'dan Çık" : "AR'da Görüntüle"}
          >
            <span className="ar-icon">{isAR ? '✕' : '📱'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
