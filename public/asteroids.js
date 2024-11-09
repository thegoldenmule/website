import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const shipGeometry = new THREE.ConeGeometry(0.5, 1, 32);
const shipMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const ship = new THREE.Mesh(shipGeometry, shipMaterial);
scene.add(ship);

camera.position.z = 5;

const asteroids = [];

fetch('timeline.json')
  .then(response => response.json())
  .then(data => {
    data.events.forEach(event => {
      const asteroidGeometry = new THREE.Geometry();
      for (let i = 0; i < 12; i++) {
        asteroidGeometry.vertices.push(new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ));
      }
      for (let i = 0; i < 20; i++) {
        const a = Math.floor(Math.random() * 12);
        const b = Math.floor(Math.random() * 12);
        const c = Math.floor(Math.random() * 12);
        if (a !== b && b !== c && c !== a) {
          asteroidGeometry.faces.push(new THREE.Face3(a, b, c));
        }
      }
      asteroidGeometry.computeFaceNormals();
      asteroidGeometry.computeVertexNormals();

      const asteroidMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        map: new THREE.TextureLoader().load(event.imageUrl),
        transparent: true,
        opacity: 0.2
      });
      const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
      asteroid.userData = event;
      asteroid.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
      asteroid.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      );
      asteroid.rotationVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      );
      scene.add(asteroid);
      asteroids.push(asteroid);
    });
  });

let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let INTERSECTED;
let orbitingAsteroid = null;

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

window.addEventListener('mousemove', onMouseMove, false);

const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.pointerEvents = 'none';
document.body.appendChild(overlay);

const gridHelper = new THREE.GridHelper(100, 100, 0x00ff00, 0x00ff00);
scene.add(gridHelper);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
composer.addPass(bloomPass);

const mouseDistortionShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'mouse': { value: new THREE.Vector2(0.5, 0.5) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 mouse;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      vec2 dist = uv - mouse;
      float distLength = length(dist);
      uv += dist * (0.1 / distLength);
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `
};

const mouseDistortionPass = new ShaderPass(mouseDistortionShader);
composer.addPass(mouseDistortionPass);

function animate() {
  requestAnimationFrame(animate);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(asteroids);

  if (intersects.length > 0) {
    if (INTERSECTED != intersects[0].object) {
      if (INTERSECTED) INTERSECTED.material.opacity = 0.2;
      INTERSECTED = intersects[0].object;
      INTERSECTED.material.opacity = 1.0;
      const rect = renderer.domElement.getBoundingClientRect();
      const x = (INTERSECTED.position.x / 10 + 0.5) * rect.width;
      const y = (-INTERSECTED.position.y / 10 + 0.5) * rect.height;
      overlay.innerHTML = `
        <div style="position: absolute; top: ${y}px; left: ${x}px; background: rgba(0, 0, 0, 0.5); color: white; padding: 10px;">
          <h1>${INTERSECTED.userData.title}</h1>
          <h2>${INTERSECTED.userData.subtitle}</h2>
          <p>${INTERSECTED.userData.description}</p>
        </div>
      `;
      orbitingAsteroid = INTERSECTED;
    }
  } else {
    if (INTERSECTED) INTERSECTED.material.opacity = 0.2;
    INTERSECTED = null;
    overlay.innerHTML = '';
    orbitingAsteroid = null;
  }

  if (orbitingAsteroid) {
    const orbitRadius = 1.5;
    const orbitSpeed = 0.02;
    const angle = Date.now() * 0.001 * orbitSpeed;
    const orbitPosition = new THREE.Vector3(
      orbitingAsteroid.position.x + orbitRadius * Math.cos(angle),
      orbitingAsteroid.position.y + orbitRadius * Math.sin(angle),
      orbitingAsteroid.position.z
    );
    ship.position.lerp(orbitPosition, 0.05);
  } else {
    ship.position.lerp(new THREE.Vector3(mouse.x * 5, mouse.y * 5, 0), 0.05);
  }

  asteroids.forEach(asteroid => {
    asteroid.position.add(asteroid.velocity);
    asteroid.rotation.x += asteroid.rotationVelocity.x;
    asteroid.rotation.y += asteroid.rotationVelocity.y;
    asteroid.rotation.z += asteroid.rotationVelocity.z;
  });

  mouseDistortionPass.uniforms.mouse.value.set(mouse.x * 0.5 + 0.5, mouse.y * 0.5 + 0.5);

  composer.render();
}

animate();
