import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import './App.css';

const APP_VERSION = "1.0.3";

// AR teknolojilerini kontrol et
const checkARTechnology = async () => {
  const technologies = {
    webxr: false,
    webvr: false,
    arcore: false,
    arkit: false,
    quicklook: false
  };

  // WebXR kontrolü
  if ('xr' in navigator) {
    try {
      technologies.webxr = await Promise.any([
        navigator.xr.isSessionSupported('immersive-ar'),
        navigator.xr.isSessionSupported('ar'),
        navigator.xr.isSessionSupported('inline')
      ]);
    } catch (e) {
      console.log('WebXR desteklenmiyor:', e);
    }
  }

  // WebVR kontrolü (eski cihazlar için)
  if ('getVRDisplays' in navigator) {
    try {
      const displays = await navigator.getVRDisplays();
      technologies.webvr = displays.length > 0;
    } catch (e) {
      console.log('WebVR desteklenmiyor:', e);
    }
  }

  // ARCore kontrolü (Android)
  technologies.arcore = 'arcore' in window || 'ArCore' in window;

  // ARKit kontrolü (iOS)
  technologies.arkit = 'arkit' in window || 'ARKit' in window;

  // Quick Look kontrolü (iOS)
  technologies.quicklook = isIOSDevice() && isQuickLookSupported();

  return technologies;
};

// iOS cihaz kontrolü
const isIOSDevice = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Quick Look desteği kontrolü
const isQuickLookSupported = () => {
  return document.createElement('a').relList.supports('ar');
};

function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const xrHelperRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isARSupported, setIsARSupported] = useState(false);
  const [isInAR, setIsInAR] = useState(false);
  const [arTechnologies, setARTechnologies] = useState(null);
  const [arMode, setARMode] = useState('none'); // 'none', 'webxr', 'webvr', 'quicklook'

  // AR desteğini kontrol et
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const techs = await checkARTechnology();
        console.log('Desteklenen AR teknolojileri:', techs);
        setARTechnologies(techs);
        
        // Herhangi bir AR teknolojisi destekleniyorsa
        const isSupported = Object.values(techs).some(tech => tech);
        setIsARSupported(isSupported);

        // En iyi AR modunu seç
        if (techs.webxr) {
          setARMode('webxr');
        } else if (techs.quicklook) {
          setARMode('quicklook');
        } else if (techs.webvr) {
          setARMode('webvr');
        }
      } catch (error) {
        console.error('AR kontrol hatası:', error);
        setIsARSupported(false);
      }
    };

    checkSupport();
  }, []);

  // Quick Look için USDZ dönüşümü
  const handleQuickLook = async () => {
    try {
      // USDZ dosyası varsa doğrudan aç
      if (isIOSDevice()) {
        const anchor = document.createElement('a');
        anchor.setAttribute('rel', 'ar');
        anchor.setAttribute('href', './model.usdz');
        anchor.click();
      } else {
        setError('Quick Look sadece iOS cihazlarda desteklenir');
      }
    } catch (error) {
      console.error('Quick Look hatası:', error);
      setError('Quick Look başlatılamadı');
    }
  };

  // AR moduna geç
  const startARSession = async () => {
    if (!engineRef.current || !sceneRef.current) return;

    try {
      switch (arMode) {
        case 'webxr':
          await startWebXRSession();
          break;
        case 'quicklook':
          await handleQuickLook();
          break;
        case 'webvr':
          await startWebVRSession();
          break;
        default:
          throw new Error('Desteklenen AR teknolojisi bulunamadı');
      }
    } catch (error) {
      console.error('AR başlatma hatası:', error);
      setError('AR modu başlatılamadı: ' + error.message);
    }
  };

  // WebXR session başlat
  const startWebXRSession = async () => {
    if (!xrHelperRef.current) {
      xrHelperRef.current = await sceneRef.current.createDefaultXRExperienceAsync({
        uiOptions: {
          sessionMode: "immersive-ar",
          referenceSpaceType: "local-floor",
        },
        optionalFeatures: true,
      });

      // AR session başladığında
      xrHelperRef.current.baseExperience.onStateChangedObservable.add((state) => {
        if (state === BABYLON.WebXRState.IN_XR) {
          setIsInAR(true);
          console.log('AR modu başladı');
        } else if (state === BABYLON.WebXRState.NOT_IN_XR) {
          setIsInAR(false);
          console.log('AR modu sonlandı');
        }
      });

      // Hit test ve diğer özellikleri ekle
      const featuresManager = xrHelperRef.current.baseExperience.featuresManager;
      
      // Hit test
      try {
        const hitTest = featuresManager.enableFeature(BABYLON.WebXRFeatureName.HIT_TEST, 'latest');
        if (hitTest) {
          hitTest.onHitTestResultObservable.add((results) => {
            if (results.length > 0) {
              const hitResult = results[0];
              if (sceneRef.current.getTransformNodeByName("root")) {
                const rootNode = sceneRef.current.getTransformNodeByName("root");
                rootNode.position = hitResult.position;
                rootNode.rotationQuaternion = hitResult.rotationQuaternion;
              }
            }
          });
        }
      } catch (e) {
        console.warn('Hit test özelliği etkinleştirilemedi:', e);
      }

      // Anchor sistemi
      try {
        const anchors = featuresManager.enableFeature(BABYLON.WebXRFeatureName.ANCHOR_SYSTEM, 'latest');
        if (anchors) {
          console.log('Anchor sistemi etkinleştirildi');
        }
      } catch (e) {
        console.warn('Anchor sistemi etkinleştirilemedi:', e);
      }

      // DOM Overlay
      try {
        const domOverlay = featuresManager.enableFeature(BABYLON.WebXRFeatureName.DOM_OVERLAY, 'latest', {
          element: document.getElementById('ar-overlay')
        });
        if (domOverlay) {
          console.log('DOM Overlay etkinleştirildi');
        }
      } catch (e) {
        console.warn('DOM Overlay etkinleştirilemedi:', e);
      }
    }

    await xrHelperRef.current.baseExperience.enterXRAsync("immersive-ar", "local-floor");
  };

  // WebVR session başlat (eski cihazlar için)
  const startWebVRSession = async () => {
    try {
      const displays = await navigator.getVRDisplays();
      if (displays.length > 0) {
        const vrDisplay = displays[0];
        await vrDisplay.requestPresent([{ source: canvasRef.current }]);
        setIsInAR(true);
      }
    } catch (error) {
      console.error('WebVR başlatma hatası:', error);
      throw error;
    }
  };

  // AR modundan çık
  const exitARSession = async () => {
    try {
      switch (arMode) {
        case 'webxr':
          if (xrHelperRef.current && xrHelperRef.current.baseExperience) {
            await xrHelperRef.current.baseExperience.exitXRAsync();
          }
          break;
        case 'webvr':
          const displays = await navigator.getVRDisplays();
          if (displays.length > 0) {
            await displays[0].exitPresent();
          }
          break;
        case 'quicklook':
          // Quick Look için özel bir çıkış işlemi gerekmez
          break;
      }
      setIsInAR(false);
    } catch (error) {
      console.error('AR çıkış hatası:', error);
    }
  };

  // Scene setup
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
    ground.visibility = isInAR ? 0 : 1;

    // GLTF modelini yükle
    BABYLON.SceneLoader.LoadAssetContainer(
      "",
      "output.gltf",
      scene,
      function (container) {
        console.log("Container yüklendi:", container);
        
        if (container && container.meshes && container.meshes.length > 0) {
          container.addAllToScene();
          
          const rootNode = new BABYLON.TransformNode("root", scene);
          container.meshes.forEach(mesh => {
            mesh.parent = rootNode;
          });
          
          rootNode.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
          rootNode.position = new BABYLON.Vector3(0, 0, 0);
          
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
  }, [isInAR]);

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

      <div id="ar-overlay" className="ar-overlay">
        {/* AR modu için ek kontroller buraya eklenebilir */}
      </div>

      <button 
        className={`ar-button ${!isARSupported ? 'disabled' : ''} ${isInAR ? 'active' : ''}`}
        onClick={isInAR ? exitARSession : startARSession}
        disabled={!isARSupported}
      >
        <span className="ar-icon">📱</span>
        {isInAR ? 'AR Modundan Çık' : 'AR Moduna Geç'}
        {!isARSupported && <span className="ar-not-supported">AR Desteklenmiyor</span>}
        {arTechnologies && (
          <span className="ar-tech-badge">
            {arMode === 'webxr' ? 'WebXR' : 
             arMode === 'quicklook' ? 'Quick Look' : 
             arMode === 'webvr' ? 'WebVR' : 'Standart'}
          </span>
        )}
      </button>

      <canvas ref={canvasRef} className="babylon-canvas" />
    </div>
  );
}

export default App;
