import * as THREE from 'three';

let scene, camera, renderer, ship, asteroids = [], asteroidData = [];
const loader = new THREE.TextureLoader();

async function init() {
  const response = await fetch('timeline.json');
  const data = await response.json();
  asteroidData = data.events;

  scene = new THREE.Scene();

  // Create a faint green grid background
  const gridHelper = new THREE.GridHelper(1000, 50, 0x00ff00, 0x00ff00);
  scene.add(gridHelper);

  // Set up camera
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(-aspect * 10, aspect * 10, 10, -10, 1, 1000);
  camera.position.z = 10;

  // Set up renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create ship
  const shipGeometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0, 1, 0,
    -1, -1, 0,
    1, -1, 0
  ]);
  shipGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const shipMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  ship = new THREE.Mesh(shipGeometry, shipMaterial);
  scene.add(ship);

  // Create asteroids
  asteroidData.forEach(item => {
    const asteroidGeometry = new THREE.BufferGeometry();
    const asteroidVertices = new Float32Array(generateAsteroidVertices());
    asteroidGeometry.setAttribute('position', new THREE.BufferAttribute(asteroidVertices, 3));
    const asteroidMaterial = new THREE.MeshBasicMaterial({ map: loader.load(item.imageUrl), transparent: true, opacity: 0.5 });
    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    asteroid.userData = item;
    asteroid.position.set(Math.random() * 20 - 10, Math.random() * 20 - 10, 0);
    asteroid.velocity = new THREE.Vector3(Math.random() * 0.01 - 0.005, Math.random() * 0.01 - 0.005, 0);
    asteroid.rotationVelocity = Math.random() * 0.01 - 0.005;
    asteroids.push(asteroid);
    scene.add(asteroid);
  });

  animate();
}

function generateAsteroidVertices() {
  const vertices = [];
  const numSides = Math.floor(Math.random() * 5) + 5;
  for (let i = 0; i < numSides; i++) {
    const angle = (i / numSides) * Math.PI * 2;
    vertices.push(Math.cos(angle), Math.sin(angle), 0);
  }
  return vertices;
}

function animate() {
  requestAnimationFrame(animate);

  // Move ship towards mouse cursor
  const mouse = new THREE.Vector2();
  document.addEventListener('mousemove', event => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
  vector.unproject(camera);
  const dir = vector.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  const pos = camera.position.clone().add(dir.multiplyScalar(distance));
  ship.position.lerp(pos, 0.05);

  // Move asteroids
  asteroids.forEach(asteroid => {
    asteroid.position.add(asteroid.velocity);
    asteroid.rotation.z += asteroid.rotationVelocity;

    // Teleport asteroids if out of view
    if (asteroid.position.x > 10) asteroid.position.x = -10;
    if (asteroid.position.x < -10) asteroid.position.x = 10;
    if (asteroid.position.y > 10) asteroid.position.y = -10;
    if (asteroid.position.y < -10) asteroid.position.y = 10;
  });

  // Teleport ship if out of view
  if (ship.position.x > 10) ship.position.x = -10;
  if (ship.position.x < -10) ship.position.x = 10;
  if (ship.position.y > 10) ship.position.y = -10;
  if (ship.position.y < -10) ship.position.y = 10;

  renderer.render(scene, camera);
}

init();
