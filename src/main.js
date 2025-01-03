import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class ARViewer {
    constructor() {
        // DOM elementleri
        this.container = document.querySelector('#scene-container');
        this.loadingEl = document.querySelector('#loading');
        this.arButton = document.querySelector('#ar-button');

        // Three.js bileşenleri
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        // AR için gerekli değişkenler
        this.reticle = null;
        this.hitTestSource = null;
        this.localSpace = null;
        this.viewerSpace = null;
        this.model = null;

        // Başlangıç ayarları
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
        this.setupControls();
        this.setupAR();
        this.loadModel();
        this.setupEventListeners();
        this.animate();
    }

    setupRenderer() {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.container.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        this.camera.position.set(0, 1.6, 3);
        this.camera.lookAt(0, 0, 0);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
    }

    setupAR() {
        // Reticle oluştur
        const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.reticle = new THREE.Mesh(geometry, material);
        this.reticle.rotation.x = -Math.PI / 2;
        this.reticle.visible = false;
        this.scene.add(this.reticle);

        // AR Button kontrolü
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
                if (supported) {
                    this.arButton.style.display = 'block';
                }
            });
        }
    }

    loadModel() {
        this.loadingEl.style.display = 'block';
        const loader = new GLTFLoader();

        loader.load('/output.gltf',
            (gltf) => {
                this.model = gltf.scene;
                this.model.scale.set(0.5, 0.5, 0.5);
                this.scene.add(this.model);
                this.loadingEl.style.display = 'none';
                console.log('Model yüklendi');
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100);
                this.loadingEl.textContent = `Yükleniyor... ${Math.round(percent)}%`;
            },
            (error) => {
                console.error('Model yüklenemedi:', error);
                this.loadingEl.textContent = 'Model yüklenemedi!';
            }
        );
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.arButton.addEventListener('click', () => this.startAR());
    }

    async startAR() {
        try {
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test']
            });

            this.renderer.xr.setReferenceSpaceType('local');
            await this.renderer.xr.setSession(session);

            this.viewerSpace = await session.requestReferenceSpace('viewer');
            this.localSpace = await session.requestReferenceSpace('local');

            session.addEventListener('end', () => {
                this.renderer.xr.setSession(null);
            });

            session.addEventListener('select', () => {
                if (this.reticle.visible) {
                    const model = this.model.clone();
                    model.position.copy(this.reticle.position);
                    this.scene.add(model);
                }
            });

        } catch (error) {
            console.error('AR başlatılamadı:', error);
            alert('AR başlatılamadı. Tarayıcınız AR\'ı desteklemiyor olabilir.');
        }
    }

    animate() {
        this.renderer.setAnimationLoop((timestamp, frame) => {
            if (frame) {
                const hitTestResults = frame.getHitTestResults(this.hitTestSource);
                
                if (hitTestResults.length > 0) {
                    const hit = hitTestResults[0];
                    const pose = hit.getPose(this.localSpace);
                    
                    this.reticle.visible = true;
                    this.reticle.position.set(
                        pose.transform.position.x,
                        pose.transform.position.y,
                        pose.transform.position.z
                    );
                }
            }

            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        });
    }
}

// Uygulamayı başlat
new ARViewer(); 