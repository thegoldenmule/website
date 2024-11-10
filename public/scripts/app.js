import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
} from "./pixi.mjs";

const backgroundColor = "#222222";

let app = null;
let ship = null;
let layers = null;
let popout = null;
let selectedAsteroid = null;

const selectAsteroid = (asteroid) => {
  if (selectedAsteroid === asteroid) {
    return;
  }

  if (selectedAsteroid) {
    selectedAsteroid.titleText.style.fill =
      selectedAsteroid.titleText.previousFill;
  }

  selectedAsteroid = asteroid;
  selectedAsteroid.titleText.previousFill =
    selectedAsteroid.titleText.style.fill;
  selectedAsteroid.titleText.style.fill = 0xffffff;
  popout.populate(selectedAsteroid);
};

const createShip = () => {
  // tiangle ship, like asteroids
  const size = 10;
  const halfSize = size / 2;
  const color = 0xffffff;

  ship = new Graphics()
    .setStrokeStyle({ color, width: 1 })
    .setFillStyle({ color })
    .moveTo(size + halfSize, 0)
    .lineTo(-size + halfSize, 10)
    .lineTo(0, 0)
    .lineTo(-size + halfSize, -size)
    .lineTo(size + halfSize, 0)
    .stroke()
    .fill();

  ship.x = app.screen.width / 2;
  ship.y = app.screen.height / 2;

  app.stage.addChild(ship);
};

const addShipMovement = () => {
  app.stage.eventMode = "dynamic";
  const targetPosition = { x: 0, y: 0 };
  const updateTargetPosition = (e) => {
    targetPosition.x = e.data.global.x;
    targetPosition.y = e.data.global.y;
  };
  app.stage.on("globalmousemove", updateTargetPosition);
  app.stage.on("globaltouchmove", updateTargetPosition);

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

const createShipMotionTrails = () => {
  const shipPositions = [];
  const trailLength = 70;
  const trailColor = 0xffffff;

  const trail = new Graphics();
  ship.parent.addChild(trail);

  app.ticker.add(() => {
    shipPositions.push({ x: ship.x, y: ship.y });

    if (shipPositions.length > trailLength) {
      shipPositions.shift();
    }

    trail
      .clear()
      .moveTo(ship.x, ship.y)
      .setStrokeStyle({ color: trailColor, width: 1, alpha: 1 });

    for (let i = shipPositions.length - 1; i >= 0; i--) {
      const position = shipPositions[i];
      trail
        .lineTo(position.x, position.y)
        .stroke()
        .setStrokeStyle({
          color: trailColor,
          width: 1,
          alpha: i / trailLength,
        });
    }

    trail.stroke();
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

const createParallaxBackgrounds = () => {
  layers = [];

  const background = new Graphics();
  app.stage.addChild(background);

  const colors = [0x333333, 0x444444, 0x555555, 0x666666, 0x777777];
  const speeds = [0.1, 0.2, 0.3, 0.4, 0.5];

  for (let i = 0; i < 5; i++) {
    const color = colors[i % colors.length];
    const speed = speeds[i % speeds.length];

    const layer = generateBackground(app, color);
    layer.color = color;
    layer.opacity = 1 - i / 5;
    background.addChild(layer);

    app.ticker.add(() => {
      layer.x = -ship.x * speed;
      layer.y = -ship.y * speed;
    });

    layers.push(layer);
  }

  return layers;
};

const createPopout = () => {
  popout = new Container();

  // add the subtitle
  const subtitleText = new Text({
    text: "",
    style: {
      fill: 0xffffff,
      fontSize: 8,
    },
  });
  subtitleText.x = -subtitleText.width / 2;
  subtitleText.y = 0;
  popout.addChild(subtitleText);

  // add the date
  const dateText = new Text({
    text: "",
    style: {
      fill: 0xffffff,
      fontSize: 8,
    },
  });
  dateText.x = subtitleText.x;
  dateText.y = 10;
  popout.addChild(dateText);

  // add the description
  const descriptionText = new Text({
    text: "",
    style: {
      fill: 0xffffff,
      fontSize: 8,
    },
  });
  descriptionText.x = subtitleText.x;
  descriptionText.y = 20;
  popout.addChild(descriptionText);

  // load the image
  const imageContainer = new Container();
  imageContainer.x = subtitleText.x;
  imageContainer.y = 30;
  popout.addChild(imageContainer);

  popout.populate = (asteroid) => {
    const { subtitle, date, description, imageUrl } = asteroid.event;
    const { sprite } = asteroid;

    subtitleText.text = subtitle || "";
    dateText.text = date || "";
    descriptionText.text = description || "";
    imageContainer.removeChildren();
    imageContainer.addChild(sprite);
  };

  app.stage.addChild(popout);
};

(async () => {
  app = new Application();

  await app.init({
    background: backgroundColor,
    resizeTo: window,
    preference: "webgl",
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    powerPreference: "high-performance",
  });
  document.body.appendChild(app.canvas);

  createParallaxBackgrounds();
  createShip();
  createShipMotionTrails();
  createPopout();

  addShipMovement();

  const res = await fetch("/timeline.json");
  const { events } = await res.json();

  // for each event, create a random, irregular polygon asteroid
  events.forEach((event) => {
    const {
      category,
      title,
      subtitle,
      type,
      date,
      description,
      url,
      imageUrl,
      tech,
      size = Math.random() * 10 + 5,
    } = event;
    // todo: pull x, y, size from the event
    const x = Math.random() * app.screen.width * 1.5;
    const y = Math.random() * app.screen.height * 1.5;
    const points = Math.floor(Math.random() * 5) + 5;

    // pick a random layer to add the asteroid to
    let layerIndex = Math.floor(Math.random() * layers.length);
    if (event.hasOwnProperty("layer")) {
      layerIndex = layers.length - event.layer - 1;
    }
    const layer = layers[layerIndex];

    const asteroid = new Graphics()
      .setStrokeStyle({ color: layer.color, width: 1 })
      .setFillStyle({ color: backgroundColor })
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

    asteroid.closePath().stroke().fill();
    layer.addChild(asteroid);

    // add the title
    const titleText = new Text({
      text: title,
      style: {
        fill: layer.color,
        fontSize: 12,
      },
    });
    titleText.x = x - titleText.width / 2;
    titleText.y = y + size + 5;
    asteroid.addChild(titleText);

    // load image
    const spriteContainer = new Container();
    Assets.load(imageUrl)
      .then((tex) => {
        const aspectRatio = tex.width / tex.height;

        const sprite = new Sprite(tex);
        sprite.width = 100;
        sprite.height = 100 / aspectRatio;
        spriteContainer.addChild(sprite);
      })
      .catch((err) => {
        //
      });

    // mouseover
    asteroid.interactive = true;
    asteroid.buttonMode = true;
    asteroid.titleText = titleText;
    asteroid.event = event;
    asteroid.sprite = spriteContainer;
    asteroid.on("mouseover", () => selectAsteroid(asteroid));
    asteroid.on("touchmove", () => selectAsteroid(asteroid));
    asteroid.on("touchstart", () => selectAsteroid(asteroid));
  });
})();
