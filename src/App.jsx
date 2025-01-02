import React, { useEffect, useRef, useState } from 'react';
import { Engine, Scene } from '@babylonjs/core';
import {
  Vector3,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  SceneLoader,
  StandardMaterial,
  Color3,
  WebXRState,
  Animation,
  HighlightLayer,
  PointLight,
  ParticleSystem,
  Color4,
  Texture
} from '@babylonjs/core';
import '@babylonjs/loaders';
import './App.css';

const onSceneReady = (scene) => {
  // Camera
  const camera = new ArcRotateCamera(
    'camera',
    0,
    Math.PI / 3,
    10,
    Vector3.Zero(),
    scene
  );
  camera.attachControl(true);
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 20;

  // Lights
  const mainLight = new HemisphericLight('mainLight', new Vector3(0, 1, 0), scene);
  mainLight.intensity = 0.7;

  // Accent lights for dramatic effect
  const pointLight1 = new PointLight('pointLight1', new Vector3(5, 3, 0), scene);
  pointLight1.intensity = 0.5;
  pointLight1.diffuse = new Color3(0.5, 0.2, 1); // Purple tint

  const pointLight2 = new PointLight('pointLight2', new Vector3(-5, 3, 0), scene);
  pointLight2.intensity = 0.5;
  pointLight2.diffuse = new Color3(0.2, 0.5, 1); // Blue tint

  // Ground with grid texture
  const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene);
  const groundMaterial = new StandardMaterial('groundMaterial', scene);
  groundMaterial.diffuseColor = new Color3(0.1, 0.1, 0.15);
  groundMaterial.alpha = 0.5;
  groundMaterial.wireframe = true;
  ground.material = groundMaterial;

  // Highlight layer for model interaction
  const highlightLayer = new HighlightLayer('highlightLayer', scene);

  // Particle system for model interaction
  const particleSystem = new ParticleSystem('particles', 2000, scene);
  particleSystem.particleTexture = new Texture('/sparkle.png', scene);
  particleSystem.emitter = Vector3.Zero();
  particleSystem.minEmitBox = new Vector3(-1, 0, -1);
  particleSystem.maxEmitBox = new Vector3(1, 2, 1);
  particleSystem.color1 = new Color4(0.7, 0.8, 1.0, 1.0);
  particleSystem.color2 = new Color4(0.2, 0.5, 1.0, 1.0);
  particleSystem.colorDead = new Color4(0, 0, 0.2, 0.0);
  particleSystem.minSize = 0.1;
  particleSystem.maxSize = 0.3;
  particleSystem.minLifeTime = 0.3;
  particleSystem.maxLifeTime = 1.5;
  particleSystem.emitRate = 100;
  particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;
  particleSystem.gravity = new Vector3(0, -1, 0);
  particleSystem.direction1 = new Vector3(-1, 8, 1);
  particleSystem.direction2 = new Vector3(1, 8, -1);
  particleSystem.minAngularSpeed = 0;
  particleSystem.maxAngularSpeed = Math.PI;
  particleSystem.minEmitPower = 1;
  particleSystem.maxEmitPower = 3;
  particleSystem.updateSpeed = 0.005;

  // Load GLTF model
  SceneLoader.ImportMesh(
    '',
    '/',
    'output.gltf',
    scene,
    (meshes) => {
      console.log('Model loaded successfully:', meshes);
      if (meshes.length > 0) {
        const model = meshes[0];
        model.scaling = new Vector3(0.5, 0.5, 0.5);
        model.position = new Vector3(0, 0, 0);

        // Model rotation animation
        const rotationAnimation = new Animation(
          'modelRotation',
          'rotation.y',
          30,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const keyFrames = [];
        keyFrames.push({
          frame: 0,
          value: 0
        });
        keyFrames.push({
          frame: 300,
          value: 2 * Math.PI
        });

        rotationAnimation.setKeys(keyFrames);
        model.animations = [rotationAnimation];
        scene.beginAnimation(model, 0, 300, true);

        // Model interaction
        let isHighlighted = false;
        model.actionManager = scene.actionManager;
        scene.actionManager = scene.actionManager || new BABYLON.ActionManager(scene);
        
        model.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            () => {
              if (!isHighlighted) {
                highlightLayer.addMesh(model, Color3.FromHexString('#00ff00'));
                particleSystem.emitter = model.position;
                particleSystem.start();
                isHighlighted = true;
              }
            }
          )
        );

        model.actionManager.registerAction(
          new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            () => {
              highlightLayer.removeMesh(model);
              particleSystem.stop();
              isHighlighted = false;
            }
          )
        );

        // AR özelliğini kontrol et ve ekle
        if (navigator.xr) {
          scene.createDefaultXRExperienceAsync({
            uiOptions: {
              sessionMode: 'immersive-ar'
            }
          }).then((xrHelper) => {
            xrHelper.baseExperience.onStateChangedObservable.add((state) => {
              if (state === WebXRState.IN_XR) {
                model.position = new Vector3(0, 0, -1);
                scene.stopAnimation(model);
              } else {
                scene.beginAnimation(model, 0, 300, true);
              }
            });
          });
        }
      } else {
        console.error('No meshes were loaded');
      }
    },
    (evt) => {
      const loadedPercent = (evt.loaded * 100 / evt.total).toFixed();
      console.log(`Loading: ${loadedPercent}%`);
    },
    (error) => {
      console.error('Model loading failed:', error);
    }
  );

  scene.onPointerDown = (evt) => {
    if (evt.button === 0) {
      scene.pick(scene.pointerX, scene.pointerY);
    }
  };
};

function App() {
  const [isARSupported, setIsARSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar')
        .then(supported => setIsARSupported(supported))
        .catch(() => setIsARSupported(false));
    }

    // 3 saniye sonra loading'i kaldır
    setTimeout(() => setIsLoading(false), 3000);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    engineRef.current = new Engine(canvasRef.current, true);
    const scene = new Scene(engineRef.current);
    
    onSceneReady(scene);

    engineRef.current.runRenderLoop(() => {
      scene.render();
    });

    return () => {
      scene.dispose();
      engineRef.current.dispose();
    };
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
        <canvas ref={canvasRef} id="babylon-canvas" />
      </div>
      <div className="controls">
        <div className="controls-header">
          <h1>Interactive 3D Viewer</h1>
          <div className="status-badge">
            {isARSupported ? 'AR Ready' : 'AR Not Available'}
          </div>
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
              {isARSupported && (
                <li>
                  <span className="icon">📱</span>
                  AR Mode: Click AR button
                </li>
              )}
            </ul>
          </div>
          <div className="interaction-tips">
            <h2>Interaction Tips</h2>
            <p>Hover over the model to see special effects!</p>
            <p>The model rotates automatically in desktop mode.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
