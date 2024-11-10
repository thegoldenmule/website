import { Application, Graphics } from "./pixi.mjs";

const createShip = () => {
  // tiangle ship, like asteroids
  const size = 10;
  const ship = new Graphics()
    .setStrokeStyle({ color: 0xffffff, width: 1 })
    .moveTo(size, 0)
    .lineTo(-size, 10)
    .lineTo(-size / 2, 0)
    .lineTo(-size, -size)
    .lineTo(size, 0)
    .stroke();

  return ship;
};

const addShipMovement = (app, ship, targetPosition) => {
  const velocity = { x: 0, y: 0 };
  const acceleration = 0.1;
  const friction = 0.9;
  const rotationSpeed = 0.05;

  app.ticker.add(() => {
    // slerp the ship's rotation
    const targetRotation = Math.atan2(
      targetPosition.y - ship.y,
      targetPosition.x - ship.x
    );
    ship.rotation += rotationSpeed * Math.sin(targetRotation - ship.rotation);

    // accelerate in the direction of the rotation
    velocity.x += Math.cos(ship.rotation) * acceleration;
    velocity.y += Math.sin(ship.rotation) * acceleration;

    // move the ship
    ship.x += velocity.x;
    ship.y += velocity.y;

    // apply friction
    velocity.x *= friction;
    velocity.y *= friction;
  });
};

const generateBackground = (app, color) => {
  const container = new Graphics();

  // lots of stars on the container, of color
  const stars = 100;
  for (let i = 0; i < stars; i++) {
    const x = Math.random() * app.screen.width * 2;
    const y = Math.random() * app.screen.height * 2;

    container.beginFill(color).drawCircle(x, y, 1).endFill();
  }

  return container;
};

const addParallaxBackgrounds = (app, ship) => {
  const layers = [];
  const background = new Graphics();
  app.stage.addChild(background);

  const colors = [0x333333, 0x444444, 0x555555, 0x666666, 0x777777];
  const speeds = [0.1, 0.2, 0.3, 0.4, 0.5];

  for (let i = 0; i < 5; i++) {
    const color = colors[i % colors.length];
    const speed = speeds[i % speeds.length];

    const layer = generateBackground(app, color);
    layer.color = color;
    background.addChild(layer);

    app.ticker.add(() => {
      layer.x = -ship.x * speed;
      layer.y = -ship.y * speed;
    });

    layers.push(layer);
  }

  return layers;
};

(async () => {
  const app = new Application();
  await app.init({ background: "#222222", resizeTo: window });
  document.body.appendChild(app.canvas);

  const ship = createShip();
  ship.x = app.screen.width / 2;
  ship.y = app.screen.height / 2;
  app.stage.addChild(ship);

  // follow the mouse
  app.stage.eventMode = "dynamic";
  const targetPosition = { x: 0, y: 0 };
  const updateTargetPosition = (e) => {
    targetPosition.x = e.data.global.x;
    targetPosition.y = e.data.global.y;
  };
  app.stage.on("globalmousemove", updateTargetPosition);
  app.stage.on("globaltouchmove", updateTargetPosition);

  // ship movement
  addShipMovement(app, ship, targetPosition);

  // add parallax background
  const layers = addParallaxBackgrounds(app, ship);

  const res = await fetch("/timeline.json");
  const { events } = await res.json();

  // for each event, create a random, irregular polygon asteroid
  events.forEach((event) => {
    const x = Math.random() * app.screen.width * 1.5;
    const y = Math.random() * app.screen.height * 1.5;
    const size = Math.random() * 10 + 5;
    const points = Math.floor(Math.random() * 5) + 5;

    // pick a random layer to add the asteroid to
    const layer = layers[Math.floor(Math.random() * layers.length)];

    const asteroid = new Graphics()
      .setStrokeStyle({ color: layer.color, width: 1 })
      .moveTo(x, y);

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radius = size + Math.random() * 5;

      if (i === 0) {
        asteroid.moveTo(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius
        );
      } else {
        asteroid.lineTo(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius
        );
      }
    }

    asteroid.closePath().stroke();
    layer.addChild(asteroid);
  });
})();
