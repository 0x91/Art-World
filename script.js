let scene, camera, renderer, model, controls, videoTexture, shaderMaterial;
const container = document.getElementById('container');
const loadingScreen = document.getElementById('loadingScreen');

// Create and append loading text
const loadingText = document.createElement('div');
loadingText.innerText = 'Use the walkman buttons to play audio...';
loadingText.style.textAlign = 'center';
loadingScreen.appendChild(loadingText);

// Create and append loading percentage text
const loadingPercentage = document.createElement('div');
loadingScreen.appendChild(loadingPercentage);

let audioLoader, listener, sound;
let audioFiles = [
    'assets/audio/11_WIP_.mp3',
    'assets/audio/86_WIP_.mp3',
    'assets/audio/90 V1_WIP_.mp3',
    'assets/audio/91_WIP_.mp3'
];
let currentAudioIndex = 0;
let video;

init();
animate();

function init() {
    console.log('Initializing scene...');
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Set background to black
    console.log('Scene created.');

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 50, 20); // Move the camera closer to the model
    console.log('Camera initialized.');

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000); // Set background to black
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMappingExposure = 1.5; // Increase the exposure
    container.appendChild(renderer.domElement);
    console.log('Renderer initialized.');

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 3); // Increase intensity of ambient light
    scene.add(ambientLight);
    console.log('Ambient light added.');

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2); // Increase intensity of hemisphere light
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    console.log('Hemisphere light added.');

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2); // Increase intensity of directional light 1
    directionalLight1.position.set(1, 1, 1).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 2); // Increase intensity of directional light 2
    directionalLight2.position.set(-1, -1, -1).normalize();
    scene.add(directionalLight2);
    console.log('Directional lights added.');

    // Load HDRI environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new THREE.RGBELoader()
        .setDataType(THREE.UnsignedByteType) // set data type
        .load('assets/little_paris_under_tower_1k.hdr', function(texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap; // Use the HDR for environment lighting only
            texture.dispose();
            pmremGenerator.dispose();
            console.log('Environment map loaded.');
        });

    // OrbitControls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = true; // Enable auto-rotate
    controls.autoRotateSpeed = 1.0; // Adjust the speed as needed

    // Add event listeners to manage auto-rotate
    renderer.domElement.addEventListener('mousedown', onUserInteractionStart, false);
    renderer.domElement.addEventListener('mousemove', onUserInteractionStart, false);
    renderer.domElement.addEventListener('mouseup', onUserInteractionEnd, false);
    renderer.domElement.addEventListener('wheel', onUserInteractionStart, false);

    // Load model
    const loader = new THREE.GLTFLoader();
    loader.load(
        'assets/model/Buttons2.gltf',
        function(gltf) {
            console.log('Model loaded successfully.');
            model = gltf.scene;
            model.position.set(0, 0, 0);
            model.scale.set(200, 200, 200); // Scale the model up
            scene.add(model);
            controls.target.set(0, 0, 0); // Ensure the controls target the center of the model
            controls.update();

            setupModelControls();
            loadingScreen.style.display = 'none';
            container.style.display = 'block';
        },
        function(xhr) {
            // Calculate and display percentage
            const percentComplete = Math.min((xhr.loaded / xhr.total) * 100, 100);
            loadingPercentage.innerText = `${Math.round(percentComplete)}%`;
        },
        function (error) {
            console.error('Error loading model:', error);
        }
    );

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Create audio listener and loader
    listener = new THREE.AudioListener();
    camera.add(listener);
    audioLoader = new THREE.AudioLoader();

    // Create video texture
    createVideoTexture();
}

function createVideoTexture() {
    video = document.createElement('video');
    video.src = 'assets/Body Scan Short.mp4'; // Path to your video file
    video.setAttribute('playsinline', ''); // Ensures video plays inline on iOS
    video.load();

    video.addEventListener('loadeddata', () => {
        console.log('Video loaded successfully');
        video.play();
        video.loop = true;

        videoTexture = new THREE.VideoTexture(video);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;

        // Create a custom shader material using the video texture
shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
        texture1: { value: videoTexture },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        iAspectRatio: { value: video.videoWidth / video.videoHeight },  // Added to manage aspect ratio
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D texture1;
        uniform vec2 iResolution;
        uniform float iAspectRatio;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;
            
            // Correct aspect ratio
            float screenAspectRatio = iResolution.x / iResolution.y;
            if (screenAspectRatio > iAspectRatio) {
                uv.x = (uv.x - 0.5) * screenAspectRatio / iAspectRatio + 0.5;
            } else {
                uv.y = (uv.y - 0.5) * iAspectRatio / screenAspectRatio + 0.5;
            }

            uv.y = 1.0 - uv.y; // Flip Y coordinate for correct orientation
            vec4 color = texture2D(texture1, uv);
            gl_FragColor = color;
        }
    `
});


    });

    video.addEventListener('error', (e) => {
        console.error('Error loading video:', e);
    });
}

function setupModelControls() {
    if (!model) {
        console.error('Model is not loaded.');
        return;
    }
    const playButton = model.getObjectByName('PlayButton');
    const pauseButton = model.getObjectByName('PauseButton');
    const forwardButton = model.getObjectByName('ForwardButton');
    const backwardButton = model.getObjectByName('BackwardButton');
    const glass2 = model.getObjectByName('Glass2');
    const glass2Glass1_0 = model.getObjectByName('Glass2_Glass1_0');

    console.log("Buttons and Screens:", {
        playButton,
        pauseButton,
        forwardButton,
        backwardButton,
        glass2,
        glass2Glass1_0
    });

    if (!playButton || !pauseButton || !forwardButton || !backwardButton || !glass2 || !glass2Glass1_0) {
        console.error('One or more buttons or the screen textures are not found on the model.');
        return;
    }

    playButton.userData = { 
        action: () => { 
            console.log('Play button pressed.'); 
            playAudio(audioFiles[currentAudioIndex]); 
            if (shaderMaterial) {
                // Apply the custom shader material with the video texture to the glass screens
                glass2.material = shaderMaterial;
                glass2Glass1_0.material = shaderMaterial;
            } else {
                console.error('Shader material is not available.');
            }
        }
    };

    pauseButton.userData = { action: () => { console.log('Pause button pressed.'); pauseAudio(); } };
    forwardButton.userData = { action: () => { console.log('Forward button pressed.'); nextAudio(); } };
    backwardButton.userData = { action: () => { console.log('Backward button pressed.'); previousAudio(); } };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onDocumentMouseDown(event) {
        event.preventDefault();
        console.log('Mouse down event detected.');
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(model.children, true);
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.action) {
                console.log('Executing action for:', object.name);
                object.userData.action();
            } else {
                console.log('No action found for:', object.name);
            }
        } else {
            console.log('No intersections found.');
        }
    }

    window.addEventListener('mousedown', onDocumentMouseDown, false);
}

function onUserInteractionStart() {
    userInteracting = true;
    controls.autoRotate = false;
}

function onUserInteractionEnd() {
    userInteracting = false;
    controls.autoRotate = true;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (shaderMaterial && shaderMaterial.uniforms.iResolution) {
        shaderMaterial.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
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
