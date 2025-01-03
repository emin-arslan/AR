import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class ARViewer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.model = null;
        this.mixer = null;
        this.clock = new THREE.Clock();

        this.init();
        this.setupLights();
        this.setupControls();
        this.loadModel();
        this.animate();
    }

    init() {
        // Renderer ayarları
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // Kamera ayarları
        this.camera.position.set(0, 1, 2);
        this.camera.lookAt(0, 0, 0);

        // Sahne arkaplanı
        this.scene.background = null;
        this.scene.fog = new THREE.Fog(0x000000, 1, 15);

        // Pencere yeniden boyutlandırma
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupLights() {
        // Ambient ışık
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Directional ışık
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // Spot ışık
        const spotLight = new THREE.SpotLight(0xffffff, 0.5);
        spotLight.position.set(-5, 5, 0);
        spotLight.castShadow = true;
        this.scene.add(spotLight);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 5;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    loadModel() {
        // Loading ekranı
        const loadingDiv = document.createElement('div');
        loadingDiv.style.position = 'fixed';
        loadingDiv.style.top = '50%';
        loadingDiv.style.left = '50%';
        loadingDiv.style.transform = 'translate(-50%, -50%)';
        loadingDiv.style.background = 'rgba(0,0,0,0.8)';
        loadingDiv.style.color = 'white';
        loadingDiv.style.padding = '20px';
        loadingDiv.style.borderRadius = '10px';
        loadingDiv.style.zIndex = '1000';
        loadingDiv.textContent = 'Model Yükleniyor...';
        document.body.appendChild(loadingDiv);

        // GLTF Loader
        const loader = new GLTFLoader();
        loader.load(
            '/output.gltf',
            (gltf) => {
                this.model = gltf.scene;
                
                // Model ayarları
                this.model.scale.set(0.5, 0.5, 0.5);
                this.model.position.set(0, 0, 0);
                
                // Gölgeler
                this.model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        // PBR materyal ayarları
                        if (node.material) {
                            node.material.envMapIntensity = 1;
                            node.material.needsUpdate = true;
                        }
                    }
                });

                // Animasyonlar
                if (gltf.animations && gltf.animations.length) {
                    this.mixer = new THREE.AnimationMixer(this.model);
                    const action = this.mixer.clipAction(gltf.animations[0]);
                    action.play();
                }

                this.scene.add(this.model);
                document.body.removeChild(loadingDiv);

                // Kontrol butonları
                this.addControls();
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100);
                loadingDiv.textContent = `Yükleniyor... ${Math.round(percent)}%`;
            },
            (error) => {
                console.error('Model yükleme hatası:', error);
                loadingDiv.textContent = 'Model yüklenemedi!';
            }
        );
    }

    addControls() {
        const controlsDiv = document.createElement('div');
        controlsDiv.style.position = 'fixed';
        controlsDiv.style.bottom = '20px';
        controlsDiv.style.left = '50%';
        controlsDiv.style.transform = 'translateX(-50%)';
        controlsDiv.style.display = 'flex';
        controlsDiv.style.gap = '10px';
        controlsDiv.style.zIndex = '1000';

        // Reset butonu
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Modeli Sıfırla';
        resetButton.className = 'control-button';
        resetButton.onclick = () => this.resetModel();

        // Döndürme butonu
        const rotateButton = document.createElement('button');
        rotateButton.textContent = 'Otomatik Döndür';
        rotateButton.className = 'control-button';
        rotateButton.onclick = () => this.toggleRotation();

        // Buton stilleri
        const buttonStyle = `
            padding: 12px 24px;
            background: #007AFF;
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;

        resetButton.style.cssText = buttonStyle;
        rotateButton.style.cssText = buttonStyle;

        controlsDiv.appendChild(resetButton);
        controlsDiv.appendChild(rotateButton);
        document.body.appendChild(controlsDiv);
    }

    resetModel() {
        if (this.model) {
            this.model.position.set(0, 0, 0);
            this.model.rotation.set(0, 0, 0);
            this.model.scale.set(0.5, 0.5, 0.5);
        }
    }

    toggleRotation() {
        if (this.model) {
            this.isRotating = !this.isRotating;
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Model rotasyonu
        if (this.model && this.isRotating) {
            this.model.rotation.y += 0.01;
        }

        // Animasyonları güncelle
        if (this.mixer) {
            this.mixer.update(this.clock.getDelta());
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Uygulamayı başlat
new ARViewer(); 