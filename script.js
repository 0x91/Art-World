let scene, camera, renderer, model, controls;
const container = document.getElementById('container');
const loadingScreen = document.getElementById('loadingScreen');
const loadingPercentage = document.getElementById('loadingPercentage');
let audioLoader, listener, sound;
let audioFiles = [
    './assets/audio/11_WIP_.mp3',
    './assets/audio/86_WIP_.mp3',
    './assets/audio/90 V1_WIP_.mp3',
    './assets/audio/91_WIP_.mp3'
];
let currentAudioIndex = 0;
let shaderMaterial;
let loadStartTime = Date.now();

init();
animate();

function init() {
    console.log('Initializing scene...');
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Set background to completely black
    console.log('Scene created.');

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 50, 20); // Move the camera closer to the model
    console.log('Camera initialized.');

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000); // Set background to completely black
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    console.log('Renderer initialized.');

    // Controls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 1000;
    controls.maxPolarAngle = Math.PI / 2;
    console.log('Controls initialized.');

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2); // Increase intensity of ambient light
    scene.add(ambientLight);
    console.log('Ambient light added.');

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    console.log('Hemisphere light added.');

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5); // Increase intensity to 1.5
    directionalLight1.position.set(1, 1, 1).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.2); // Increase intensity to 1.2
    directionalLight2.position.set(-1, -1, -1).normalize();
    scene.add(directionalLight2);

    // Load environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new THREE.RGBELoader()
        .setDataType(THREE.UnsignedByteType)
        .load('assets/little_paris_under_tower_1k.hdr', function (texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap;
            scene.background = envMap;

            // Adjust envMap intensity for all materials
            scene.traverse((child) => {
                if (child.isMesh) {
                    child.material.envMapIntensity = 2.0; // Increase intensity
                }
            });

            texture.dispose();
            pmremGenerator.dispose();
        });

    // Model loading
    const loader = new THREE.GLTFLoader();
    loader.load(
        './assets/model/Buttons2.gltf', 
        function (gltf) {
            model = gltf.scene;
            scene.add(model);
            console.log('Model loaded:', model);

            // Hide the loading screen
            loadingScreen.style.display = 'none';
        },
        function (xhr) {
            const percentage = (xhr.loaded / xhr.total) * 100;
            loadingPercentage.textContent = Math.round(percentage) + '%';
            console.log('Model loading progress:', percentage + '%');
        },
        function (error) {
            console.error('An error happened', error);
        }
    );

    // Define shaderMaterial
    shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            iTime: { value: 0.0 }
        },
        vertexShader: `your vertex shader code here`,
        fragmentShader: `your fragment shader code here`
    });

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousedown', onDocumentMouseDown);
}

// Define onDocumentMouseDown
function onDocumentMouseDown(event) {
    event.preventDefault();
    console.log('Mouse down event detected.');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (shaderMaterial && shaderMaterial.uniforms && shaderMaterial.uniforms.iResolution) {
        shaderMaterial.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
    if (shaderMaterial && shaderMaterial.uniforms && shaderMaterial.uniforms.iTime) {
        shaderMaterial.uniforms.iTime.value += 0.05; // Update time uniform
    }
    renderer.render(scene, camera);
}

function playAudio(url) {
    if (!sound) {
        sound = new THREE.Audio(listener);
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(0.5);
            sound.play();
        });
    } else {
        if (sound.isPlaying) {
            sound.stop();
        }
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.play();
        });
    }
}

function pauseAudio() {
    if (sound && sound.isPlaying) {
        sound.pause();
    }
}

function nextAudio() {
    currentAudioIndex = (currentAudioIndex + 1) % audioFiles.length;
    playAudio(audioFiles[currentAudioIndex]);
}

function previousAudio() {
    currentAudioIndex = (currentAudioIndex - 1 + audioFiles.length) % audioFiles.length;
    playAudio(audioFiles[currentAudioIndex]);
}
