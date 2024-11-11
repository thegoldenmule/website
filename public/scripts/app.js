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
let events = [];

const selectAsteroid = (asteroid) => {
  if (selectedAsteroid === asteroid) {
    return;
  }

  if (selectedAsteroid) {
    selectedAsteroid.titleText.style.fill =
      selectedAsteroid.titleText.previousFill;
    selectedAsteroid.titleText.alpha = selectedAsteroid.titleText.previousAlpha;
    selectedAsteroid.redraw();
  }

  selectedAsteroid = asteroid;
  selectedAsteroid.titleText.previousFill =
    selectedAsteroid.titleText.style.fill;
  selectedAsteroid.titleText.previousAlpha = selectedAsteroid.titleText.alpha;

  selectedAsteroid.titleText.style.fill = 0xffffff;
  selectedAsteroid.titleText.alpha = 1;
  selectedAsteroid.redraw(0xffffff);
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
  const speeds = [0.2, 0.4, 0.6, 0.8, 1];

  const len = 5;
  for (let i = 0; i < len; i++) {
    const color = colors[i % colors.length];
    const speed = speeds[i % speeds.length];

    const layer = generateBackground(app, color);
    layer.color = color;
    layer.opacity = (i - 2 + 4) / 9;
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
    const { subtitle, date, description } = asteroid.event;
    const { sprite } = asteroid;

    subtitleText.text = subtitle || "";
    dateText.text = date || "";
    descriptionText.text = description || "";

    if (sprite) {
      imageContainer.removeChildren();
      imageContainer.addChild(sprite);
    }
  };

  app.stage.addChild(popout);
  popout.visible = false;
};

const categoryToAsteroidColor = (category) => {
  switch (category) {
    case "career":
      // gold
      return "#d0961a";
    case "publications":
      // purple
      return "#b145c5";
    case "products":
      // green
      return "#1ab145";
    case "code":
      // blue
      return "#1a6ed0";
  }

  return "#ffffff";
};

const createAsteroid = (event) => {
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
    x,
    y,
    layerIndex,
  } = event;
  const numPoints = Math.floor(Math.random() * 5) + 5;
  const layer = layers[layerIndex];

  const categoryColor = categoryToAsteroidColor(category);
  const asteroid = new Graphics();

  asteroid.generatePoints = () => {
    asteroid.points = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = size / 4 + (3 * (Math.random() * size)) / 4;

      asteroid.points.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
      });
    }
  };

  asteroid.redraw = (color = categoryColor) => {
    asteroid
      .clear()
      .setStrokeStyle({ color, width: 1, alpha: layer.opacity })
      .setFillStyle({ color: backgroundColor });

    const points = asteroid.points;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (i === 0) {
        asteroid.moveTo(point.x, point.y);
      } else {
        asteroid.lineTo(point.x, point.y);
      }
    }

    asteroid.closePath().stroke().fill();
  };
  asteroid.generatePoints();
  asteroid.redraw(categoryColor);
  layer.addChild(asteroid);

  // add the title
  if (title) {
    const titleText = new Text({
      text: title,
      style: {
        fill: categoryColor,
        fontSize: 12,
      },
    });
    titleText.alpha = layer.opacity;
    titleText.x = x - titleText.width / 2;
    titleText.y = y + size + 5;

    asteroid.titleText = titleText;
    asteroid.addChild(titleText);
  }

  // load image
  if (imageUrl) {
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

    asteroid.sprite = spriteContainer;
  }

  // mouseover
  asteroid.interactive = true;
  asteroid.buttonMode = true;
  asteroid.event = event;
  asteroid.on("mouseover", () => selectAsteroid(asteroid));
  asteroid.on("touchmove", () => selectAsteroid(asteroid));
  asteroid.on("touchstart", () => selectAsteroid(asteroid));
};

const createAsteroids = (filteredEvents) => {
  // generate random x,y positions for events
  const bufferX = app.screen.width / 2;
  const bufferY = app.screen.height / 2;
  const positions = filteredEvents.map(() => ({
    x: bufferX + Math.random() * app.screen.width,
    y: bufferY + Math.random() * app.screen.height,
  }));

  // now iteratively space out intersecting asteroids
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < filteredEvents.length; j++) {
      for (let k = j + 1; k < filteredEvents.length; k++) {
        if (
          Math.abs(positions[j].x - positions[k].x) < 50 &&
          Math.abs(positions[j].y - positions[k].y) < 50
        ) {
          positions[j].x += 50;
          positions[j].y += 50;
        }
      }
    }
  }

  // for each event, create a random, irregular polygon asteroid
  filteredEvents.forEach((event, i) =>
    createAsteroid({
      ...event,
      ...positions[i],
      layerIndex: layers.length - 1,
    })
  );
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
  const json = await res.json();
  events = json.events;

  createAsteroids(events);
})();
