import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import './App.css';

const APP_VERSION = "1.0.3";

function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isARSupported, setIsARSupported] = useState(false);
  const [isInAR, setIsInAR] = useState(false);

  // AR desteğini kontrol et
  useEffect(() => {
    const checkARSupport = async () => {
      try {
        if ('xr' in navigator) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setIsARSupported(supported);
        } else {
          setIsARSupported(false);
        }
      } catch (error) {
        console.error('AR kontrol hatası:', error);
        setIsARSupported(false);
      }
    };

    checkARSupport();
  }, []);

  // AR moduna geç
  const startARSession = async () => {
    if (!engineRef.current || !sceneRef.current) return;

    try {
      const xrHelper = await sceneRef.current.createDefaultXRExperienceAsync({
        uiOptions: {
          sessionMode: 'immersive-ar',
          referenceSpaceType: 'local-floor'
        },
        optionalFeatures: true
      });

      if (xrHelper.baseExperience) {
        // AR session başladığında
        xrHelper.baseExperience.onStateChangedObservable.add((state) => {
          if (state === BABYLON.WebXRState.IN_XR) {
            setIsInAR(true);
            console.log('AR modu başladı');
          } else if (state === BABYLON.WebXRState.NOT_IN_XR) {
            setIsInAR(false);
            console.log('AR modu sonlandı');
          }
        });

        // Hit test özelliğini ekle
        const featuresManager = xrHelper.baseExperience.featuresManager;
        const hitTest = featuresManager.enableFeature(BABYLON.WebXRFeatureName.HIT_TEST, 'latest');

        if (hitTest) {
          hitTest.onHitTestResultObservable.add((results) => {
            if (results.length > 0) {
              // Hit test sonucunu kullan
              const hitResult = results[0];
              // Model pozisyonunu güncelle
              if (sceneRef.current.getTransformNodeByName("root")) {
                const rootNode = sceneRef.current.getTransformNodeByName("root");
                rootNode.position = hitResult.position;
                rootNode.rotationQuaternion = hitResult.rotationQuaternion;
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('AR başlatma hatası:', error);
      setError('AR modu başlatılamadı: ' + error.message);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Engine ve Scene oluştur
    engineRef.current = new BABYLON.Engine(canvasRef.current, true);
    sceneRef.current = new BABYLON.Scene(engineRef.current);

    const scene = sceneRef.current;

    // Kamera ayarları
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      0,
      Math.PI / 3,
      10,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.setTarget(BABYLON.Vector3.Zero());

    // Işıklandırma
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    light.intensity = 0.7;

    // Ground mesh ekle
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {
      width: 10,
      height: 10
    }, scene);
    ground.position.y = -1;
    ground.visibility = isInAR ? 0 : 1; // AR modunda ground'u gizle

    // GLTF modelini yükle
    BABYLON.SceneLoader.LoadAssetContainer(
      "",
      "output.gltf",
      scene,
      function (container) {
        console.log("Container yüklendi:", container);
        
        if (container && container.meshes && container.meshes.length > 0) {
          // Tüm meshler sahneye ekle
          container.addAllToScene();
          
          // Tüm meshleri grupla
          const rootNode = new BABYLON.TransformNode("root", scene);
          container.meshes.forEach(mesh => {
            mesh.parent = rootNode;
          });
          
          // Root node'u ölçeklendir ve konumlandır
          rootNode.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
          rootNode.position = new BABYLON.Vector3(0, 0, 0);
          
          // Animasyon (sadece AR modunda değilken)
          scene.registerBeforeRender(() => {
            if (!isInAR && rootNode) {
              rootNode.rotation.y += 0.01;
            }
          });

          setIsLoading(false);
        } else {
          setError("Model yüklenemedi veya boş");
          setIsLoading(false);
        }
      },
      (event) => {
        const loadedPercent = (event.loaded * 100 / event.total).toFixed();
        console.log(`Model yükleniyor: ${loadedPercent}%`);
      },
      (scene, message, exception) => {
        console.error("Model yükleme hatası:", message, exception);
        setError(`Model yükleme hatası: ${message}`);
        setIsLoading(false);
      }
    );

    // Render döngüsü
    const renderLoop = () => {
      if (engineRef.current && sceneRef.current) {
        sceneRef.current.render();
      }
    };
    engineRef.current.runRenderLoop(renderLoop);

    // Pencere boyutu değişikliği
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (engineRef.current) {
        engineRef.current.stopRenderLoop();
      }
      
      if (sceneRef.current) {
        sceneRef.current.dispose();
      }
      
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, [isInAR]); // isInAR değiştiğinde effect'i yeniden çalıştır

  return (
    <div className="app-container">
      {isLoading && (
        <div className="loading-screen">
          <div className="loader"></div>
          <p>3D Model yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="top-controls">
        <div className="controls-header">
          <h1>3D Model Viewer</h1>
          <div className="version-badge">v{APP_VERSION}</div>
        </div>
      </div>

      <button 
        className={`ar-button ${!isARSupported ? 'disabled' : ''} ${isInAR ? 'active' : ''}`}
        onClick={startARSession}
        disabled={!isARSupported}
      >
        <span className="ar-icon">📱</span>
        {isInAR ? 'AR Modundan Çık' : 'AR Moduna Geç'}
        {!isARSupported && <span className="ar-not-supported">AR Desteklenmiyor</span>}
      </button>

      <canvas ref={canvasRef} className="babylon-canvas" />
    </div>
  );
}

export default App;
