import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class ARViewer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            logarithmicDepthBuffer: true
        });
        this.model = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        this.isInAR = false;

        this.init();
        this.setupLights();
        this.setupControls();
        this.loadModel();
        this.setupAR();
        this.animate();
    }

    init() {
        // Renderer ayarları
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // Kamera ayarları
        this.camera.position.set(0, 1.6, 3);
        this.camera.lookAt(0, 0, 0);

        // Sahne arkaplanı
        this.scene.background = null;

        // Pencere yeniden boyutlandırma
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupLights() {
        // Ambient ışık
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        // Directional ışık
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 5, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Hemisphere ışık
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
        this.scene.add(hemiLight);
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

    async setupAR() {
        const arButton = document.createElement('button');
        arButton.className = 'control-button';
        arButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #007AFF;
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;

        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isAndroid = /android/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        // AR desteğini kontrol et
        let arSupported = false;

        if ('xr' in navigator) {
            arSupported = await navigator.xr.isSessionSupported('immersive-ar');
        }

        // iOS Quick Look desteği
        if (isIOS && document.createElement('a').relList.supports('ar')) {
            arSupported = true;
        }

        // Android Scene Viewer desteği
        if (isAndroid && navigator.userAgent.includes('Chrome')) {
            arSupported = true;
        }

        // WebVR desteği (eski cihazlar için)
        if ('getVRDisplays' in navigator) {
            try {
                const displays = await navigator.getVRDisplays();
                if (displays.length > 0) {
                    arSupported = true;
                }
            } catch (e) {
                console.log('WebVR kontrol hatası:', e);
            }
        }

        if (arSupported) {
            arButton.textContent = 'AR Moduna Geç';
            arButton.addEventListener('click', () => this.startAR());
        } else {
            arButton.textContent = 'AR Desteklenmiyor';
            arButton.style.background = '#999';
            arButton.style.cursor = 'not-allowed';
            arButton.addEventListener('click', () => {
                alert('Bu cihaz veya tarayıcı AR\'ı desteklemiyor. Lütfen AR destekli bir mobil cihaz kullanın.');
            });
        }

        document.body.appendChild(arButton);
    }

    async startAR() {
        try {
            const modelUrl = window.location.origin + '/output.gltf';
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isAndroid = /android/i.test(navigator.userAgent);

            if (isIOS) {
                // iOS için Quick Look
                // Model-viewer'ın USDZ dönüştürme servisi yerine alternatif servis kullan
                const usdzUrl = `https://api.3dviewer.net/v1/models/convert?input=${encodeURIComponent(modelUrl)}&output=usdz&key=free`;

                // iOS için AR Quick Look başlatma
                const anchor = document.createElement('a');
                anchor.setAttribute('rel', 'ar');
                anchor.setAttribute('href', usdzUrl);
                
                // iOS 12+ için ek özellikler
                anchor.setAttribute('data-ar', '');
                anchor.setAttribute('data-hide-if-not-supported', 'true');
                anchor.setAttribute('data-title', 'View in AR');
                anchor.setAttribute('data-scale', 'auto');
                anchor.setAttribute('data-allow-scale-control', 'true');

                // iOS 13+ için ek özellikler
                if (parseInt(navigator.userAgent.match(/OS (\d+)_/)[1]) >= 13) {
                    anchor.setAttribute('data-ar-scale', 'fixed');
                    anchor.setAttribute('data-ar-plane-detection', 'true');
                    anchor.setAttribute('data-ar-image-detection', 'true');
                }

                // Görünmez iframe oluştur
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.onload = () => {
                    anchor.click();
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                    }, 1000);
                };
                
                document.body.appendChild(iframe);
                iframe.contentDocument.body.appendChild(anchor);

            } else if (isAndroid) {
                // Android için gelişmiş Scene Viewer ve fallback mekanizması
                const fallbackUrl = encodeURIComponent(window.location.href);
                const modelTitle = encodeURIComponent('3D Model');
                
                // Farklı Android sürümleri ve tarayıcılar için URL'ler
                const sceneViewerUrls = [
                    // Modern Scene Viewer
                    `intent://arvr.google.com/scene-viewer/1.0?file=${modelUrl}&mode=ar_preferred&title=${modelTitle}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fallbackUrl};end;`,
                    
                    // Alternatif Scene Viewer
                    `intent://arvr.google.com/scene-viewer/1.0?file=${modelUrl}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${fallbackUrl};end;`,
                    
                    // Doğrudan AR Core
                    `market://details?id=com.google.ar.core`,
                    
                    // WebXR fallback
                    modelUrl
                ];

                // Her URL'i sırayla dene
                const trySceneViewer = async (urls) => {
                    if (urls.length === 0) {
                        // Hiçbir yöntem çalışmazsa WebXR'ı dene
                        if ('xr' in navigator) {
                            const supported = await navigator.xr.isSessionSupported('immersive-ar');
                            if (supported) {
                                this.startWebXR();
                                return;
                            }
                        }
                        alert('AR görüntüleyici başlatılamadı. Lütfen ARCore\'u yükleyin veya güncelleyin.');
                        return;
                    }

                    const currentUrl = urls[0];
                    const remainingUrls = urls.slice(1);

                    try {
                        if (currentUrl.startsWith('market://')) {
                            window.location.href = currentUrl;
                        } else {
                            const link = document.createElement('a');
                            link.href = currentUrl;
                            link.click();
                            
                            // URL çalışmazsa 1 saniye sonra diğerini dene
                            setTimeout(() => {
                                if (!document.hidden) {
                                    trySceneViewer(remainingUrls);
                                }
                            }, 1000);
                        }
                    } catch (e) {
                        console.error('Scene Viewer hatası:', e);
                        trySceneViewer(remainingUrls);
                    }
                };

                trySceneViewer(sceneViewerUrls);

            } else {
                await this.startWebXR();
            }
        } catch (error) {
            console.error('AR başlatma hatası:', error);
            alert('AR başlatılamadı. Lütfen desteklenen bir mobil cihaz kullanın.');
        }
    }

    async startWebXR() {
        if (!('xr' in navigator)) {
            throw new Error('WebXR not supported');
        }

        const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay', 'light-estimation']
        });

        this.renderer.xr.enabled = true;
        await this.renderer.xr.setSession(session);
        this.isInAR = true;

        if (this.model) {
            this.model.position.set(0, 0, -1);
            const box = new THREE.Box3().setFromObject(this.model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 0.5 / maxDim;
            this.model.scale.set(scale, scale, scale);
        }

        session.addEventListener('end', () => {
            this.renderer.xr.enabled = false;
            this.isInAR = false;
            this.resetModel();
        });
    }

    loadModel() {
        // Loading ekranı
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1000;
        `;
        loadingDiv.textContent = 'Model Yükleniyor...';
        document.body.appendChild(loadingDiv);

        // GLTF Loader
        const loader = new GLTFLoader();
        loader.load(
            '/output.gltf',
            (gltf) => {
                this.model = gltf.scene;
                
                // Model boyutunu otomatik ayarla
                const box = new THREE.Box3().setFromObject(this.model);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 1 / maxDim;
                this.model.scale.multiplyScalar(scale);

                // Model pozisyonu
                this.model.position.set(0, 0, -2);
                
                // Gölgeler ve materyal
                this.model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
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
        controlsDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 1000;
        `;

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

        // Reset butonu
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Modeli Sıfırla';
        resetButton.className = 'control-button';
        resetButton.style.cssText = buttonStyle;
        resetButton.onclick = () => this.resetModel();

        // Döndürme butonu
        const rotateButton = document.createElement('button');
        rotateButton.textContent = 'Otomatik Döndür';
        rotateButton.className = 'control-button';
        rotateButton.style.cssText = buttonStyle;
        rotateButton.onclick = () => this.toggleRotation();

        controlsDiv.appendChild(resetButton);
        controlsDiv.appendChild(rotateButton);
        document.body.appendChild(controlsDiv);
    }

    resetModel() {
        if (this.model) {
            if (this.isInAR) {
                this.model.position.set(0, 0, -1);
                this.model.scale.set(0.2, 0.2, 0.2);
            } else {
                this.model.position.set(0, 0, -2);
                const box = new THREE.Box3().setFromObject(this.model);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 1 / maxDim;
                this.model.scale.set(scale, scale, scale);
            }
            this.model.rotation.set(0, 0, 0);
        }
    }

    toggleRotation() {
        if (this.model) {
            this.isRotating = !this.isRotating;
        }
    }

    animate() {
        if (this.isInAR) {
            this.renderer.setAnimationLoop(this.render.bind(this));
        } else {
            requestAnimationFrame(this.animate.bind(this));
            this.render();
        }
    }

    render() {
        if (this.model && this.isRotating && !this.isInAR) {
            this.model.rotation.y += 0.01;
        }

        if (this.mixer) {
            this.mixer.update(this.clock.getDelta());
        }

        if (!this.isInAR) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Uygulamayı başlat
new ARViewer(); 