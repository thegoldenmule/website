import {
  Application,
  Assets,
  Bounds,
  Container,
  Graphics,
  Sprite,
  Text,
} from "./pixi.mjs";

const backgroundColor = "#222222";
const colors = [0x333333, 0x444444, 0x555555, 0x666666, 0x777777];
const speeds = [0.2, 0.4, 0.6, 0.8, 1];

let app = null;
let mainContainer = null;
let ship = null,
  trail = null,
  shipPointer = null;
let layers = null;
let popout = null;
let mainAsteroids = null;
let reticle = null;
let connectedLines = null;
let childLines = null;
let selectedAsteroid = null;
let events = [];

const redrawConnectedLines = () => {
  connectedLines.clear().setStrokeStyle({ color: 0x444444, width: 1 });

  for (let i = 0; i < mainAsteroids.length; i++) {
    const asteroid = mainAsteroids[i];
    if (asteroid.event.connectedLines === false) {
      continue;
    }

    // get next asteroid
    let nextAsteroid = null;
    if (i < mainAsteroids.length - 1) {
      nextAsteroid = mainAsteroids[i + 1];
    } else {
      break;
    }

    connectedLines
      .moveTo(asteroid.x, asteroid.y)
      .lineTo(nextAsteroid.x, nextAsteroid.y);

    // draw an arrow every 50 pixels along the vector
    const arrowDistance = 50;
    const dx = nextAsteroid.x - asteroid.x;
    const dy = nextAsteroid.y - asteroid.y;

    const angle = Math.atan2(dy, dx);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const numArrows = Math.floor(distance / arrowDistance);

    // calculate the angles of the two arrow lines along the vector
    const angle1 = angle + Math.PI / 6;
    const angle2 = angle - Math.PI / 6;

    for (let i = 1; i < numArrows; i++) {
      const x = asteroid.x + (dx * i) / numArrows;
      const y = asteroid.y + (dy * i) / numArrows;

      const arrowLength = 10;

      connectedLines
        .moveTo(x, y)
        .lineTo(
          x + Math.cos(angle1) * arrowLength,
          y + Math.sin(angle1) * arrowLength
        )
        .moveTo(x, y)
        .lineTo(
          x + Math.cos(angle2) * arrowLength,
          y + Math.sin(angle2) * arrowLength
        );
    }

    connectedLines.stroke();
  }
};

const redrawChildLines = (mainLayer) => () => {
  childLines.clear();

  if (selectedAsteroid) {
    const { childAsteroids } = selectedAsteroid;
    if (!childAsteroids) {
      return;
    }

    const globalPos = selectedAsteroid.getGlobalPosition();
    const position = mainLayer.toLocal(globalPos);

    for (const child of childAsteroids) {
      const childGlobalPos = child.getGlobalPosition();
      const childPosition = mainLayer.toLocal(childGlobalPos);
      const lineColor = child === selectedAsteroid ? 0xffffff : 0x444444;

      childLines
        .setStrokeStyle({ color: lineColor, width: 1 })
        .moveTo(position.x, position.y)
        .lineTo(childPosition.x, childPosition.y)
        .stroke();
    }
  }
};

const selectAsteroid = (asteroid) => {
  if (!mainAsteroids.includes(asteroid)) {
    if (asteroid.isActivated) {
      popout.populate(asteroid);
      popout.visible = true;
    }

    return;
  }

  if (selectedAsteroid) {
    if (selectedAsteroid === asteroid) {
      selectedAsteroid.titleText.style.fill =
        selectedAsteroid.titleText.previousFill;
      selectedAsteroid.titleText.alpha =
        selectedAsteroid.titleText.previousAlpha;
      selectedAsteroid.redraw();

      for (const child of selectedAsteroid.childAsteroids || []) {
        child.deactivate();
      }

      selectedAsteroid = null;
      connectedLines.visible = true;

      // un-dim all main asteroids
      for (const mainAsteroid of mainAsteroids) {
        mainAsteroid.visible = true;
      }

      ship.alpha = 1;
      trail.visible = true;
      updateReticle();
      popout.visible = false;

      return;
    }

    return;
  }

  selectedAsteroid = asteroid;

  // hide all other main asteroids
  for (const mainAsteroid of mainAsteroids) {
    if (mainAsteroid !== asteroid) {
      mainAsteroid.visible = false;
    }
  }

  // hide connecting lines
  connectedLines.visible = false;

  // turn on text
  selectedAsteroid.titleText.previousFill =
    selectedAsteroid.titleText.style.fill;
  selectedAsteroid.titleText.previousAlpha = selectedAsteroid.titleText.alpha;
  selectedAsteroid.titleText.style.fill = 0xffffff;
  selectedAsteroid.titleText.alpha = 1;
  selectedAsteroid.redraw(0xffffff);
  popout.populate(selectedAsteroid);

  for (const child of selectedAsteroid.childAsteroids || []) {
    child.activate();
  }

  redrawConnectedLines();
  updateReticle();
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

  // create the ship pointer
  shipPointer = new Graphics().setStrokeStyle({ color, width: 1 });

  mainContainer.addChild(shipPointer);
  mainContainer.addChild(ship);
};

const addShipMovement = () => {
  app.stage.eventMode = "dynamic";
  const targetPosition = { x: app.stage.width / 4, y: app.stage.height / 4 };

  let lastUpdated = 0;
  const updateTargetPosition = (e) => {
    if (selectedAsteroid) {
      return;
    }

    targetPosition.x = Math.max(0, Math.min(app.screen.width, e.data.global.x));
    targetPosition.y = Math.max(
      0,
      Math.min(app.screen.height, e.data.global.y)
    );

    // draw circle around target position
    shipPointer.clear().circle(targetPosition.x, targetPosition.y, 50).stroke();
    lastUpdated = Date.now();
  };
  app.stage.on("globalmousemove", updateTargetPosition);
  app.stage.on("globaltouchmove", updateTargetPosition);

  const velocity = { x: 0, y: 0 };
  const acceleration = 0.2;
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

    // alpha + visibility of pointer
    const alpha = Math.max(0, 1 - (Date.now() - lastUpdated) / 1000);
    shipPointer.alpha = alpha;
    shipPointer.visible = selectedAsteroid ? false : true;
  });
};

const createShipMotionTrails = () => {
  const shipPositions = [];
  const trailLength = 20;
  const trailColor = 0xffa500;
  const width = 15;

  trail = new Graphics();
  /*
  ship.parent.addChildAt(trail, ship.parent.getChildIndex(ship));

  app.ticker.add(() => {
    shipPositions.push({ x: ship.x, y: ship.y });

    if (shipPositions.length > trailLength) {
      shipPositions.shift();
    }

    trail
      .clear()
      .moveTo(ship.x, ship.y)
      .setStrokeStyle({ color: trailColor, width, alpha: 1 });

    for (let i = shipPositions.length - 1; i >= 0; i--) {
      const position = shipPositions[i];
      trail
        .lineTo(position.x, position.y)
        .stroke()
        .setStrokeStyle({
          color: trailColor,
          width,
          alpha: i / trailLength,
        });
    }

    trail.stroke();
  });*/
};

const generateBackground = (app, color) => {
  const container = new Graphics();

  // lots of stars on the container, of color
  const stars = 100;
  for (let i = 0; i < stars; i++) {
    const x = Math.random() * app.screen.width * 2;
    const y = Math.random() * app.screen.height * 2;

    container.setFillStyle({ color }).circle(x, y, 1).fill();
  }

  return container;
};

const createParallaxBackgrounds = () => {
  layers = [];

  const background = new Graphics();
  mainContainer.addChild(background);

  const len = 5;
  for (let i = 0; i < len; i++) {
    const color = colors[i % colors.length];

    const layer = generateBackground(app, color);
    layer.color = color;
    layer.opacity = i === len - 1 ? 1 : (i - 2 + 4) / 9;
    background.addChild(layer);

    layers.push(layer);
  }

  app.ticker.add(() => {
    // move main layer based on ship position
    if (!selectedAsteroid) {
      const mainLayer = layers[len - 1];
      const speed = speeds[len - 1];
      const targetX = -ship.x * speed;
      const targetY = -ship.y * speed;

      mainLayer.x += (targetX - mainLayer.x) * 0.05;
      mainLayer.y += (targetY - mainLayer.y) * 0.05;
    }

    // move the rest of the layers based on the main layer
    for (let i = 0; i < len - 1; i++) {
      const layer = layers[i];
      const speed = speeds[i % speeds.length];

      const targetX = layers[len - 1].x * speed;
      const targetY = layers[len - 1].y * speed;

      layer.x += targetX - layer.x;
      layer.y += targetY - layer.y;
    }
  });

  return layers;
};

let currentUrl = "";
const createPopout = () => {
  popout = new Container();

  // add background
  const bgBuffer = 50;
  const background = new Graphics()
    .setFillStyle({ color: 0x222222, alpha: 1 })
    .setStrokeStyle({ color: 0xffffff, width: 1 })
    .rect(-bgBuffer, -bgBuffer, bgBuffer, bgBuffer)
    .stroke()
    .fill();
  popout.addChild(background);

  // add the title
  const maxW = screen.width > 500 ? 400 : screen.width - 2 * bgBuffer;
  const titleText = new Text({
    text: "",
    style: {
      fill: 0xffffff,
      fontSize: 24,
      fontFamily: "Robotomono Semibold",
      wordWrap: true,
      wordWrapWidth: maxW,
    },
  });
  titleText.x = -titleText.width / 2;
  titleText.y = -titleText.height / 2;
  popout.addChild(titleText);

  // add the subtitle
  const subtitleText = new Text({
    text: "",
    style: {
      fill: 0xffffff,
      fontSize: 20,
      fontFamily: "Robotomono Semibold",
      wordWrap: true,
      wordWrapWidth: maxW,
    },
  });
  subtitleText.x = -subtitleText.width / 2;
  popout.addChild(subtitleText);

  // add the date
  const dateText = new Text({
    text: "",
    style: {
      fill: 0xcccccc,
      fontSize: 16,
      fontFamily: "Robotomono Semibold",
      wordWrap: true,
      wordWrapWidth: maxW,
    },
  });
  dateText.x = subtitleText.x;
  popout.addChild(dateText);

  // add the description
  const descriptionText = new Text({
    text: "",
    style: {
      fill: 0xffffff,
      fontSize: 18,
      fontFamily: "Robotomono Semibold",
      wordWrap: true,
      wordWrapWidth: maxW,
    },
  });
  descriptionText.x = subtitleText.x;
  popout.addChild(descriptionText);

  // add close text
  const closeText = new Text({
    text: "(x) Close ",
    style: {
      fill: 0xffffff,
      fontSize: 20,
      fontFamily: "Robotomono Semibold",
    },
  });
  closeText.interactive = true;
  closeText.buttonMode = true;
  closeText.cursor = "pointer";
  closeText.on("mousedown", () => (popout.visible = false));
  closeText.on("touchstart", () => (popout.visible = false));
  popout.addChild(closeText);

  // add goto text
  const gotoText = new Text({
    text: "Go to -->",
    style: {
      fill: 0xffffff,
      fontSize: 20,
      fontFamily: "Robotomono Semibold",
    },
  });
  gotoText.interactive = true;
  gotoText.buttonMode = true;
  gotoText.cursor = "pointer";
  gotoText.on("mousedown", () => window.open(currentUrl, "_blank"));
  gotoText.on("touchstart", () => window.open(currentUrl, "_blank"));
  popout.addChild(gotoText);

  // load the image
  const imageContainer = new Container();
  imageContainer.x = subtitleText.x;
  popout.addChild(imageContainer);

  const reLayout = (asteroid) => {
    const { title, subtitle, date, description, url } = asteroid.event;
    let y = 0;

    closeText.y = y;

    if (url) {
      gotoText.y = closeText.y;
      gotoText.x = maxW - gotoText.width;
    }

    y += closeText.height + 10;

    // image
    imageContainer.y = y;
    y += imageContainer.height + 10;

    // title
    if (title) {
      titleText.y = y;
      y += titleText.height + 20;
    }

    // subtitle
    if (subtitle) {
      subtitleText.y = y;
      y += subtitleText.height + 10;
    }

    // date
    if (date) {
      dateText.y = y;
      y += dateText.height + 10;
    }

    // description
    if (description) {
      descriptionText.y = y;
      y += descriptionText.height + 10;
    }

    // scale background
    const h = y;
    background
      .clear()
      .setFillStyle({ color: 0x222222, alpha: 1 })
      .setStrokeStyle({ color: 0xffffff, width: 8 })
      .rect(-bgBuffer, -bgBuffer, maxW + bgBuffer * 2, h + bgBuffer * 2)
      .stroke()
      .fill();

    // center on screen
    popout.x = bgBuffer + app.screen.width / 2 - (maxW + bgBuffer * 2) / 2;
    popout.y = Math.max(
      0,
      bgBuffer + app.screen.height / 2 - popout.height / 2
    );
  };

  popout.populate = (asteroid) => {
    const { title, subtitle, date, description, url, imageUrl } =
      asteroid.event;

    if (imageUrl) {
      imageContainer.removeChildren();

      Assets.load(imageUrl)
        .then((tex) => {
          const aspectRatio = tex.width / tex.height;

          const sprite = new Sprite(tex);
          if (aspectRatio > 1) {
            const maxW = screen.width > 500 ? 400 : screen.width - 100;
            sprite.width = maxW;
            sprite.height = maxW / aspectRatio;
          } else {
            sprite.height = 300;
            sprite.width = sprite.height * aspectRatio;
          }

          imageContainer.addChild(sprite);

          reLayout(asteroid);
        })
        .catch((err) => {
          //
        });
    } else {
      imageContainer.removeChildren();
    }

    if (title) {
      titleText.text = title;
    } else {
      titleText.text = "";
    }

    if (subtitle) {
      subtitleText.text = subtitle;
    } else {
      subtitleText.text = "";
    }

    if (date) {
      dateText.text = date;
    } else {
      dateText.text = "";
    }

    if (description) {
      descriptionText.text = description;
    } else {
      descriptionText.text = "";
    }

    // add goto text
    if (url) {
      currentUrl = url;
      gotoText.visible = true;
    } else {
      gotoText.visible = false;
    }

    reLayout(asteroid);
  };

  app.stage.addChild(popout);
  popout.visible = false;
};

const createReticle = () => {
  reticle = new Graphics();
  layers[layers.length - 1].addChild(reticle);
};

const updateReticle = () => {
  if (!selectedAsteroid) {
    reticle.clear();
    return;
  }

  const bounds = selectedAsteroid.bounds;
  const maxSize = Math.max(bounds.width, bounds.height);

  reticle
    .clear()
    // outer circle
    .setStrokeStyle({ color: 0xffffff, width: 10, alpha: 0.1 })
    .circle(0, 0, maxSize / 2 + 20)
    .stroke()
    // inner circle
    .setStrokeStyle({ color: 0xffffff, width: 1, alpha: 0.5 })
    .circle(0, 0, maxSize / 2 + 5)
    // crosshairs
    .moveTo(-maxSize / 2 - 20, 0)
    .lineTo(maxSize / 2 + 20, 0)
    .moveTo(0, -maxSize / 2 - 20)
    .lineTo(0, maxSize / 2 + 20)
    .stroke();

  const mainLayer = layers[layers.length - 1];
  const x = mainLayer.toLocal(selectedAsteroid.getGlobalPosition()).x;
  const y = mainLayer.toLocal(selectedAsteroid.getGlobalPosition()).y;

  reticle.x = x;
  reticle.y = y;
  reticle.visible = true;
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
  asteroid.x = x;
  asteroid.y = y;

  asteroid.generatePoints = () => {
    asteroid.points = [];
    const bounds = new Bounds();
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = size / 4 + (3 * (Math.random() * size)) / 4;

      asteroid.points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });

      bounds.set(
        Math.min(bounds.left, asteroid.points[i].x),
        Math.min(bounds.top, asteroid.points[i].y),
        Math.max(bounds.right, asteroid.points[i].x),
        Math.max(bounds.bottom, asteroid.points[i].y)
      );
    }
  };

  asteroid.redraw = (color = categoryColor, fill = backgroundColor) => {
    asteroid
      .clear()
      .setStrokeStyle({ color, width: 1 })
      .setFillStyle({ color: fill });

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

  asteroid.activate = () => {
    if (asteroid.titleText) {
      asteroid.titleText.visible = true;
      asteroid.alpha = 1;
      asteroid.redraw(categoryColor, categoryColor);
    }

    asteroid.isActivated = true;
  };

  asteroid.deactivate = () => {
    if (asteroid.titleText) {
      asteroid.titleText.visible = false;
      asteroid.alpha = layer.opacity;
      asteroid.redraw();
    }

    asteroid.isActivated = false;
  };

  // add the title
  if (title) {
    const titleText = new Text({
      text: title,
      style: {
        fill: categoryColor,
        fontSize: 12,
        fontFamily: "Robotomono Semibold",
        wordWrap: true,
        wordWrapWidth: 100,
      },
    });
    titleText.x = -size / 2 - titleText.width / 2;
    titleText.y = size;

    // add click handler
    asteroid.titleText = titleText;
    asteroid.addChild(titleText);
  }

  // mouseover
  asteroid.interactive = true;
  asteroid.buttonMode = true;
  asteroid.cursor = "pointer";
  asteroid.event = event;
  asteroid.alpha = layer.opacity;
  asteroid.on("mousedown", () => selectAsteroid(asteroid));
  asteroid.on("touchstart", () => selectAsteroid(asteroid));

  return asteroid;
};

const createAsteroids = (filteredEvents, layerIndex) => {
  // generate random x,y positions for events
  const bufferX = app.screen.width / 2;
  const bufferY = app.screen.height / 2;
  const layerScaler = speeds[layerIndex];
  const width = app.screen.width * layerScaler;
  const height = app.screen.height * layerScaler;
  const positions = filteredEvents.map(() => ({
    x: bufferX + Math.random() * width,
    y: bufferY + Math.random() * height,
  }));

  // now iteratively space out intersecting asteroids
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < filteredEvents.length; j++) {
      for (let k = j + 1; k < filteredEvents.length; k++) {
        const dx = positions[j].x - positions[k].x;
        const dy = positions[j].y - positions[k].y;
        const minDist = 100;
        if (Math.abs(dx) < minDist && Math.abs(dy) < minDist) {
          // push apart j and k along the dx/dy vector
          positions[j].x += dx * 0.25;
          positions[j].y += dy * 0.25;
          positions[k].x -= dx * 0.25;
          positions[k].y -= dy * 0.25;
        }
      }
    }
  }

  // for each event, create a random, irregular polygon asteroid
  const asteroids = filteredEvents.map((event, i) =>
    createAsteroid({
      ...event,
      ...positions[i],
      layerIndex,
    })
  );

  return asteroids;
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

  mainContainer = new Container();
  mainContainer.pivot.set(app.screen.width / 2, app.screen.height / 2);
  mainContainer.x = app.screen.width / 2;
  mainContainer.y = app.screen.height / 2;
  app.stage.addChild(mainContainer);

  Assets.addBundle("fonts", [
    { alias: "Roboto", src: "fonts/RobotoMono-SemiBold.ttf" },
  ]);
  await Assets.loadBundle("fonts");

  createParallaxBackgrounds();
  createShip();
  createShipMotionTrails();
  createPopout();
  createReticle();

  addShipMovement();

  const res = await fetch("/timeline.json");
  const json = await res.json();
  events = json.events;

  const mainLayerIndex = layers.length - 1;
  mainAsteroids = createAsteroids(events, mainLayerIndex);

  // connect main asteroids with lines
  connectedLines = new Graphics();
  layers[mainLayerIndex].addChildAt(connectedLines, 0);
  redrawConnectedLines();

  // create child asteroids
  for (const asteroid of mainAsteroids) {
    const { event } = asteroid;
    const { children } = event;
    if (!children) {
      continue;
    }

    // random index between 0 and mainLayerIndex - 1
    const layerIndex = Math.floor(Math.random() * mainLayerIndex);
    asteroid.childAsteroids = createAsteroids(children, layerIndex);

    for (const child of asteroid.childAsteroids) {
      child.deactivate();
    }
  }

  // prep for child asteroids
  childLines = new Graphics();
  layers[mainLayerIndex].addChildAt(childLines, 0);

  app.ticker.add(redrawChildLines(layers[mainLayerIndex]));

  // add camera control
  app.ticker.add(() => {
    if (selectedAsteroid) {
      // lerp layers so we can see everything in the bounds
      const mainLayer = layers[mainLayerIndex];

      // center on screen
      const bounds = calculateBounds();
      const x = bounds.left + bounds.width / 2 - app.screen.width / 2;
      const y = bounds.top + bounds.height / 2 - app.screen.height / 2;

      const targetX = -x;
      const targetY = -y;

      const dx = (targetX - mainLayer.x) * 0.05;
      const dy = (targetY - mainLayer.y) * 0.05;
      mainLayer.x += dx;
      mainLayer.y += dy;

      // we may need to zoom out for the bounds to fit on screen
      const targetScale =
        bounds.width === 0 || bounds.height === 0
          ? 1
          : Math.min(
              1,
              Math.min(
                app.screen.width / bounds.width,
                app.screen.height / bounds.height
              )
            );

      // lerp the scale
      mainContainer.scale.x += (targetScale - mainContainer.scale.x) * 0.05;
      mainContainer.scale.y += (targetScale - mainContainer.scale.y) * 0.05;

      // move the ship too
      ship.x += dx;
      ship.y += dy;

      // turn stuff on
      ship.alpha = 0.1;
      trail.visible = false;
    } else {
      // lerp scale to 1
      mainContainer.scale.x += (1 - mainContainer.scale.x) * 0.05;
      mainContainer.scale.y += (1 - mainContainer.scale.y) * 0.05;
    }
  });

  // add social links
  const size = 30;
  const padding = 10;
  const socialPanel = new Container();
  const bg = new Graphics()
    .setFillStyle({ color: "#000000" })
    .roundRect(0, 0, size * 3 + padding * 4, size + padding * 2, 4)
    .fill();
  socialPanel.addChild(bg);

  // medium
  const [mediumTex, gitHubTex, linkedInTex] = await Promise.all([
    Assets.load("tex/Medium-Icon-White.png"),
    Assets.load("tex/github-mark-white.png"),
    Assets.load("tex/In-White-40.png"),
  ]);

  // github
  const gitHubSprite = new Sprite(gitHubTex);
  const gitHubAspect = gitHubSprite.width / gitHubSprite.height;
  gitHubSprite.width = size;
  gitHubSprite.height = gitHubSprite.width / gitHubAspect;
  gitHubSprite.interactive = true;
  gitHubSprite.buttonMode = true;
  gitHubSprite.cursor = "pointer";
  gitHubSprite.on("mousedown", () =>
    window.open("https://github.com/thegoldenmule/", "_blank")
  );
  gitHubSprite.on("touchstart", () =>
    window.open("https://github.com/thegoldenmule/", "_blank")
  );
  gitHubSprite.x = padding;
  gitHubSprite.y = padding;
  socialPanel.addChild(gitHubSprite);

  // linkedin
  const linkedInSprite = new Sprite(linkedInTex);
  const linkedInAspect = linkedInSprite.width / linkedInSprite.height;
  linkedInSprite.width = size;
  linkedInSprite.height = linkedInSprite.width / linkedInAspect;
  linkedInSprite.interactive = true;
  linkedInSprite.buttonMode = true;
  linkedInSprite.cursor = "pointer";
  linkedInSprite.on("mousedown", () =>
    window.open("https://www.linkedin.com/in/benjaminmicahj/", "_blank")
  );
  linkedInSprite.on("touchstart", () =>
    window.open("https://www.linkedin.com/in/benjaminmicahj/", "_blank")
  );
  linkedInSprite.x = gitHubSprite.x + gitHubSprite.width + padding;
  linkedInSprite.y = padding;
  socialPanel.addChild(linkedInSprite);

  const mediumSprite = new Sprite(mediumTex);
  const mediumAspect = mediumSprite.width / mediumSprite.height;
  mediumSprite.width = size;
  mediumSprite.height = mediumSprite.width / mediumAspect;
  mediumSprite.interactive = true;
  mediumSprite.buttonMode = true;
  mediumSprite.cursor = "pointer";
  mediumSprite.on("mousedown", () =>
    window.open("https://thegoldenmule.medium.com/", "_blank")
  );
  mediumSprite.on("touchstart", () =>
    window.open("https://thegoldenmule.medium.com/", "_blank")
  );
  mediumSprite.x = linkedInSprite.x + linkedInSprite.width + padding;
  mediumSprite.y = padding;
  socialPanel.addChild(mediumSprite);

  app.stage.addChild(socialPanel);
})();

const calculateBounds = () => {
  // recalculate bounds
  const mainLayer = layers[layers.length - 1];
  const pos = mainLayer.toLocal(selectedAsteroid.getGlobalPosition());
  const bounds = new Bounds(pos.x, pos.y, pos.x, pos.y);

  for (const child of selectedAsteroid.childAsteroids || []) {
    const childPos = mainLayer.toLocal(child.getGlobalPosition());

    bounds.set(
      Math.min(bounds.left, childPos.x),
      Math.min(bounds.top, childPos.y),
      Math.max(bounds.right, childPos.x),
      Math.max(bounds.bottom, childPos.y)
    );
  }

  bounds.pad(100);

  return bounds;
};
