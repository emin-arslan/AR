import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

class ModelViewer {
    constructor() {
        this.container = document.getElementById('scene-container');
        this.loadingScreen = document.getElementById('loadingScreen');
        
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.setupControls();
        this.setupEventListeners();
        
        this.loadModel();
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 5);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.container.appendChild(this.renderer.domElement);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, -5, -5);
        this.scene.add(pointLight);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 1.5;
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));

        document.getElementById('resetCamera').addEventListener('click', () => {
            this.resetCamera();
        });

        document.getElementById('rotationSpeed').addEventListener('input', (event) => {
            this.rotationSpeed = parseFloat(event.target.value);
        });

        document.getElementById('bgColor').addEventListener('change', (event) => {
            this.changeBackground(event.target.value);
        });
    }

    async loadModel() {
        try {
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

            const loader = new GLTFLoader();
            loader.setDRACOLoader(dracoLoader);

            const gltf = await loader.loadAsync('./output.gltf');
            this.model = gltf.scene;

            // Model yüklendikten sonra boyutunu ve pozisyonunu ayarla
            const box = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = this.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
            
            this.camera.position.z = cameraZ * 1.5;
            this.controls.target.copy(center);
            
            // Materyal iyileştirmeleri
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.material.envMapIntensity = 1;
                    child.material.needsUpdate = true;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.scene.add(this.model);
            this.hideLoadingScreen();

        } catch (error) {
            console.error('Model yüklenirken hata:', error);
            this.showErrorMessage();
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        if (this.model && this.rotationSpeed) {
            this.model.rotation.y += this.rotationSpeed * 0.01;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    resetCamera() {
        this.camera.position.set(0, 0, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    changeBackground(value) {
        switch(value) {
            case 'dark':
                this.scene.background = new THREE.Color(0x1a1a1a);
                break;
            case 'light':
                this.scene.background = new THREE.Color(0xffffff);
                break;
            case 'custom':
                this.scene.background = new THREE.Color(0x2c3e50);
                break;
        }
    }

    hideLoadingScreen() {
        this.loadingScreen.style.display = 'none';
    }

    showErrorMessage() {
        this.loadingScreen.innerHTML = `
            <div class="loading-text" style="color: red;">
                Error loading model. Please try again.
            </div>
        `;
    }
}

// Uygulamayı başlat
new ModelViewer(); 