import Phaser from 'phaser';
import { AVATAR_OPTIONS } from '../avatarOptions';
import type { ChatMessage, Direction, PlayerState } from '../types';

type SpriteBundle = {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Sprite;
  nameTag: Phaser.GameObjects.Text;
  bubble: Phaser.GameObjects.Text;
  aura: Phaser.GameObjects.Ellipse;
};

type SceneCallbacks = {
  onMove: (payload: { x: number; y: number; direction: Direction; isMoving: boolean }) => void;
};

type Point = {
  x: number;
  y: number;
};

const ROOM_WIDTH = 2200;
const ROOM_HEIGHT = 1400;
const ROOM_BOUNDS = {
  minX: 300,
  maxX: 1760,
  minY: 410,
  maxY: 980,
};
const MOVE_SPEED = 180;

const FRAME_GROUPS: Record<
  Direction,
  {
    idle: number[];
    run: number[];
  }
> = {
  right: {
    idle: [56, 57, 58, 59, 60, 61],
    run: [112, 113, 114, 115, 116, 117],
  },
  up: {
    idle: [62, 63, 64, 65, 66, 67],
    run: [118, 119, 120, 121, 122, 123],
  },
  left: {
    idle: [68, 69, 70, 71, 72, 73],
    run: [124, 125, 126, 127, 128, 129],
  },
  down: {
    idle: [74, 75, 76, 77, 78, 79],
    run: [130, 131, 132, 133, 134, 135],
  },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hexToColor = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class PixelScene extends Phaser.Scene {
  private readonly callbacks: SceneCallbacks;

  private localPlayerId: string | null = null;

  private players = new Map<string, PlayerState>();

  private sprites = new Map<string, SpriteBundle>();

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  private lastSent = 0;

  private bubbleTimers = new Map<string, Phaser.Time.TimerEvent>();

  constructor(callbacks: SceneCallbacks) {
    super('pixel-room');
    this.callbacks = callbacks;
  }

  preload() {
    AVATAR_OPTIONS.forEach((avatar) => {
      this.load.spritesheet(`avatar-sheet-${avatar.id}`, `/assets/microverse/avatars/${avatar.sheet}`, {
        frameWidth: 32,
        frameHeight: 64,
      });
    });

    this.load.spritesheet('oga-buildings-1', '/assets/open-source/oga-isometric-buildings-1.png', {
      frameWidth: 64,
      frameHeight: 96,
    });
    this.load.spritesheet('oga-roofs', '/assets/open-source/oga-isometric-roofs.png', {
      frameWidth: 143,
      frameHeight: 92,
    });
  }

  create() {
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.cameras.main.setBackgroundColor('#c9d4e6');
    this.cameras.main.roundPixels = true;

    this.createBackdrop();
    this.createCityBlock();
    this.createAnimations();
    this.createViewportHud();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  }

  update(time: number, delta: number) {
    if (!this.localPlayerId || !this.cursors || !this.wasd) {
      return;
    }

    const player = this.players.get(this.localPlayerId);
    if (!player) {
      return;
    }

    const gridVelocity = new Phaser.Math.Vector2(0, 0);
    let direction: Direction = player.direction;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      gridVelocity.x -= 1;
      direction = 'left';
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      gridVelocity.x += 1;
      direction = 'right';
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      gridVelocity.y -= 1;
      direction = 'up';
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      gridVelocity.y += 1;
      direction = 'down';
    }

    const isMoving = gridVelocity.lengthSq() > 0;
    if (isMoving) {
      const screenVelocity = new Phaser.Math.Vector2(
        gridVelocity.x - gridVelocity.y,
        (gridVelocity.x + gridVelocity.y) * 0.55,
      )
        .normalize()
        .scale((MOVE_SPEED * delta) / 1000);

      player.x = clamp(player.x + screenVelocity.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX);
      player.y = clamp(player.y + screenVelocity.y, ROOM_BOUNDS.minY, ROOM_BOUNDS.maxY);
      player.direction = direction;
      player.isMoving = true;
      this.renderPlayer(player);
    } else if (player.isMoving) {
      player.isMoving = false;
      this.renderPlayer(player);
    }

    if (time - this.lastSent > 45) {
      this.lastSent = time;
      this.callbacks.onMove({
        x: Math.round(player.x),
        y: Math.round(player.y),
        direction,
        isMoving,
      });
    }
  }

  setLocalPlayer(id: string) {
    this.localPlayerId = id;
  }

  syncPlayers(nextPlayers: Record<string, PlayerState>) {
    const nextIds = new Set(Object.keys(nextPlayers));

    for (const [id] of this.players) {
      if (!nextIds.has(id)) {
        this.removePlayer(id);
      }
    }

    Object.values(nextPlayers).forEach((player) => {
      this.players.set(player.id, { ...player });

      if (!this.sprites.has(player.id)) {
        this.addPlayerSprite(player);
      }

      this.renderPlayer(player);
    });

    this.updateCameraFollow();
  }

  showMessage(message: ChatMessage) {
    const sprite = this.sprites.get(message.playerId);
    if (!sprite) {
      return;
    }

    sprite.bubble.setText(message.text.slice(0, 42));
    sprite.bubble.setVisible(true);

    this.bubbleTimers.get(message.playerId)?.remove(false);
    const timer = this.time.delayedCall(5000, () => {
      sprite.bubble.setVisible(false);
    });
    this.bubbleTimers.set(message.playerId, timer);
  }

  private createBackdrop() {
    const sky = this.add.graphics();
    sky.setDepth(-100);
    sky.fillGradientStyle(0xcfd8e8, 0xcfd8e8, 0x7e90b1, 0x6d7f9f, 1);
    sky.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    const horizon = this.add.graphics();
    horizon.setDepth(-95);
    const towers = [
      { x: 20, w: 180, h: 300, color: 0x6c7c98 },
      { x: 160, w: 130, h: 360, color: 0x70819e },
      { x: 280, w: 170, h: 330, color: 0x677893 },
      { x: 420, w: 220, h: 420, color: 0x61728c },
      { x: 620, w: 160, h: 300, color: 0x7b89a4 },
      { x: 770, w: 180, h: 390, color: 0x65758e },
      { x: 980, w: 220, h: 450, color: 0x5e6f88 },
      { x: 1180, w: 150, h: 320, color: 0x70809a },
      { x: 1330, w: 240, h: 400, color: 0x687893 },
      { x: 1590, w: 210, h: 360, color: 0x73839f },
      { x: 1810, w: 170, h: 280, color: 0x66758f },
      { x: 1970, w: 190, h: 340, color: 0x72819b },
    ];

    towers.forEach((tower) => {
      horizon.fillStyle(tower.color, 0.95);
      horizon.fillRect(tower.x, 130 + (430 - tower.h), tower.w, tower.h);
      horizon.fillStyle(0xe9effa, 0.2);
      for (let wx = tower.x + 10; wx < tower.x + tower.w - 10; wx += 18) {
        for (let wy = 160 + (430 - tower.h); wy < 120 + (430 - tower.h) + tower.h; wy += 18) {
          horizon.fillRect(wx, wy, 7, 10);
        }
      }
    });

    const fog = this.add.graphics();
    fog.setDepth(-90);
    fog.fillGradientStyle(0xffffff, 0xffffff, 0xcfd8e8, 0xcfd8e8, 0.24, 0.24, 0.02, 0.02);
    fog.fillRect(0, 240, ROOM_WIDTH, 220);
  }

  private createCityBlock() {
    this.drawGroundPlanes();
    this.addBuilding(48, 450, 490, 2.4, 0);
    this.addBuilding(49, 575, 500, 2.4, 0);
    this.addBuilding(50, 700, 510, 2.4, 0);
    this.addRoof(1, 580, 315, 2.15);

    this.addBuilding(42, 925, 485, 2.3, 0);
    this.addBuilding(43, 1040, 492, 2.3, 0);
    this.addBuilding(44, 1160, 500, 2.3, 0);
    this.addRoof(0, 1045, 312, 2.15);

    this.addBuilding(6, 1445, 470, 2.45, -10);
    this.addBuilding(7, 1570, 477, 2.45, -10);
    this.addBuilding(8, 1695, 486, 2.45, -10);
    this.addRoof(4, 1570, 302, 2.1);

    this.addBuilding(108, 1510, 980, 2.05, 10);
    this.addBuilding(109, 1610, 987, 2.05, 10);
    this.addBuilding(110, 1710, 994, 2.05, 10);

    this.addStoreLabel('SUPERMARKET', 515, 408, '#e24c3d');
    this.addStoreLabel('FRUIT HALL', 1036, 404, '#4761d9');
    this.addStoreLabel('MARKET', 1575, 388, '#ef8f25');

    this.addMarketStand(820, 615, '#f2f2f2');
    this.addMarketStand(905, 657, '#f7d24a');
    this.addMarketStand(997, 705, '#f39a39');

    this.addStreetLamp(760, 612);
    this.addStreetLamp(960, 710);
    this.addStreetLamp(1220, 836);

    this.addBench(1360, 903);
    this.addBench(1270, 860);

    this.addDecorTree(950, 1030);
    this.addDecorTree(1180, 1110);

    this.addCar(1245, 655, 0xd84f45);
    this.addCar(1425, 730, 0xf1cb42, 'TAXI');
    this.addVan(985, 840, 0x4ab1e0);
    this.addUtilityCart(760, 805, 0x93b362);

    this.addCrateStack(865, 590);
    this.addCrateStack(930, 628);
    this.addBin(1775, 890);

    this.addNpc('lea', 700, 540, 'down', '#ffe082');
    this.addNpc('jack', 812, 580, 'down', '#9fd0ff');
    this.addNpc('monica', 1000, 645, 'down', '#f7a1c4');
    this.addNpc('grace', 1520, 865, 'left', '#ffd166');
  }

  private drawGroundPlanes() {
    const graphics = this.add.graphics();
    graphics.setDepth(-10);

    this.fillPolygon(
      graphics,
      [
        { x: 170, y: 420 },
        { x: 1090, y: 420 },
        { x: 1440, y: 595 },
        { x: 520, y: 595 },
      ],
      0xe8eaee,
      1,
    );
    this.fillPolygon(
      graphics,
      [
        { x: 65, y: 595 },
        { x: 1325, y: 595 },
        { x: 1840, y: 852 },
        { x: 575, y: 852 },
      ],
      0x57595d,
      1,
    );
    this.fillPolygon(
      graphics,
      [
        { x: 575, y: 852 },
        { x: 1840, y: 852 },
        { x: 2140, y: 1000 },
        { x: 875, y: 1000 },
      ],
      0xf1f3f6,
      1,
    );

    this.fillPolygon(
      graphics,
      [
        { x: 144, y: 470 },
        { x: 1064, y: 470 },
        { x: 1418, y: 648 },
        { x: 498, y: 648 },
      ],
      0xffffff,
      0.36,
    );

    this.fillPolygon(
      graphics,
      [
        { x: 520, y: 595 },
        { x: 1440, y: 595 },
        { x: 1458, y: 610 },
        { x: 538, y: 610 },
      ],
      0xd4d8de,
      1,
    );

    this.fillPolygon(
      graphics,
      [
        { x: 575, y: 852 },
        { x: 1840, y: 852 },
        { x: 1858, y: 868 },
        { x: 594, y: 868 },
      ],
      0xd8dde3,
      1,
    );

    for (let i = 0; i < 6; i += 1) {
      const offset = i * 180;
      this.fillPolygon(
        graphics,
        [
          { x: 730 + offset, y: 636 + offset * 0.1 },
          { x: 802 + offset, y: 636 + offset * 0.1 },
          { x: 825 + offset, y: 648 + offset * 0.1 },
          { x: 753 + offset, y: 648 + offset * 0.1 },
        ],
        0xf7f2c4,
        1,
      );
    }

    for (let i = 0; i < 7; i += 1) {
      const x = 650 + i * 145;
      const y = 733 + i * 1.5;
      this.fillPolygon(
        graphics,
        [
          { x, y },
          { x: x + 48, y },
          { x: x + 66, y: y + 9 },
          { x: x + 18, y: y + 9 },
        ],
        0xffd94b,
        0.75,
      );
    }

    this.fillPolygon(
      graphics,
      [
        { x: 1010, y: 858 },
        { x: 1210, y: 858 },
        { x: 1290, y: 899 },
        { x: 1090, y: 899 },
      ],
      0xffffff,
      0.96,
    );
    this.fillPolygon(
      graphics,
      [
        { x: 1088, y: 790 },
        { x: 1146, y: 790 },
        { x: 1270, y: 852 },
        { x: 1211, y: 852 },
      ],
      0xffffff,
      1,
    );
  }

  private fillPolygon(graphics: Phaser.GameObjects.Graphics, points: Point[], color: number, alpha: number) {
    graphics.fillStyle(color, alpha);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath();
    graphics.fillPath();
  }

  private addBuilding(frame: number, x: number, y: number, scale: number, depthOffset: number) {
    this.add.sprite(x, y, 'oga-buildings-1', frame).setOrigin(0.5, 1).setScale(scale).setDepth(y + depthOffset);
  }

  private addRoof(frame: number, x: number, y: number, scale: number) {
    this.add.sprite(x, y, 'oga-roofs', frame).setOrigin(0.5, 1).setScale(scale).setDepth(y - 120);
  }

  private addStoreLabel(text: string, x: number, y: number, color: string) {
    this.add
      .text(x, y, text, {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color,
        backgroundColor: '#ffffffdd',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
      })
      .setOrigin(0.5, 0.5)
      .setRotation(-0.42)
      .setDepth(y + 4);
  }

  private addMarketStand(x: number, y: number, canopyColor: string) {
    const stand = this.add.graphics();
    stand.setDepth(y);
    this.fillPolygon(
      stand,
      [
        { x: x - 68, y: y - 22 },
        { x: x - 8, y: y - 22 },
        { x: x + 34, y: y },
        { x: x - 27, y: y },
      ],
      hexToColor(canopyColor),
      1,
    );
    this.fillPolygon(
      stand,
      [
        { x: x - 42, y: y },
        { x: x + 24, y: y },
        { x: x + 46, y: y + 12 },
        { x: x - 21, y: y + 12 },
      ],
      0x8b5a34,
      1,
    );
    this.fillPolygon(
      stand,
      [
        { x: x - 35, y: y + 14 },
        { x: x + 30, y: y + 14 },
        { x: x + 50, y: y + 24 },
        { x: x - 15, y: y + 24 },
      ],
      0xd39b59,
      1,
    );
    stand.fillStyle(0xa2cb63, 1);
    stand.fillEllipse(x - 12, y + 1, 22, 10);
    stand.fillStyle(0xf7a544, 1);
    stand.fillEllipse(x + 12, y + 7, 18, 8);
  }

  private addStreetLamp(x: number, y: number) {
    const lamp = this.add.graphics();
    lamp.setDepth(y);
    lamp.fillStyle(0x11151d, 0.22);
    lamp.fillEllipse(x - 5, y + 12, 26, 12);
    lamp.fillStyle(0x697080, 1);
    lamp.fillRect(x - 2, y - 90, 4, 92);
    lamp.fillStyle(0xf7f7f8, 1);
    lamp.fillEllipse(x - 8, y - 102, 18, 12);
    lamp.fillStyle(0xeff0f2, 0.55);
    lamp.fillEllipse(x - 18, y - 74, 38, 20);
  }

  private addBench(x: number, y: number) {
    const bench = this.add.graphics();
    bench.setDepth(y);
    this.fillPolygon(
      bench,
      [
        { x: x - 36, y: y - 12 },
        { x: x + 8, y: y - 12 },
        { x: x + 30, y: y },
        { x: x - 14, y },
      ],
      0x7a5637,
      1,
    );
    bench.fillStyle(0x4f6179, 1);
    bench.fillRect(x - 24, y - 6, 4, 22);
    bench.fillRect(x + 8, y + 8, 4, 22);
  }

  private addDecorTree(x: number, y: number) {
    const tree = this.add.graphics();
    tree.setDepth(y);
    tree.fillStyle(0x0c1220, 0.15);
    tree.fillEllipse(x - 5, y + 18, 86, 26);
    tree.fillStyle(0x7c4f3d, 1);
    tree.fillRect(x + 2, y - 12, 10, 42);
    tree.fillStyle(0x1fb267, 1);
    tree.fillEllipse(x - 14, y - 26, 42, 26);
    tree.fillStyle(0x36d685, 1);
    tree.fillEllipse(x + 10, y - 42, 46, 30);
    tree.fillStyle(0x0f9862, 1);
    tree.fillEllipse(x + 27, y - 18, 38, 24);
  }

  private addCar(x: number, y: number, bodyColor: number, label?: string) {
    const car = this.add.graphics();
    car.setDepth(y);
    car.fillStyle(0x11151c, 0.18);
    car.fillEllipse(x - 28, y + 20, 124, 28);
    this.fillPolygon(
      car,
      [
        { x: x - 54, y: y + 4 },
        { x: x + 4, y: y - 24 },
        { x: x + 60, y: y + 3 },
        { x: x + 2, y: y + 32 },
      ],
      bodyColor,
      1,
    );
    this.fillPolygon(
      car,
      [
        { x: x - 25, y: y - 7 },
        { x: x + 5, y: y - 22 },
        { x: x + 37, y: y - 6 },
        { x: x + 5, y: y + 9 },
      ],
      0xd8edf7,
      1,
    );
    this.fillPolygon(
      car,
      [
        { x: x - 44, y: y + 8 },
        { x: x + 4, y: y - 15 },
        { x: x + 49, y: y + 7 },
        { x: x + 1, y: y + 29 },
      ],
      0xffffff,
      0.1,
    );
    car.fillStyle(0x25272b, 1);
    car.fillEllipse(x - 28, y + 21, 28, 14);
    car.fillEllipse(x + 30, y + 21, 28, 14);

    if (label) {
      this.add
        .text(x + 18, y - 19, label, {
          fontFamily: 'Consolas, Monaco, monospace',
          fontSize: '12px',
          color: '#332400',
          backgroundColor: '#fff3b4',
          padding: { left: 4, right: 4, top: 2, bottom: 2 },
        })
        .setOrigin(0.5)
        .setRotation(-0.48)
        .setDepth(y + 2);
    }
  }

  private addVan(x: number, y: number, bodyColor: number) {
    const van = this.add.graphics();
    van.setDepth(y);
    van.fillStyle(0x11151c, 0.16);
    van.fillEllipse(x - 5, y + 26, 150, 32);
    this.fillPolygon(
      van,
      [
        { x: x - 76, y: y - 8 },
        { x: x + 4, y: y - 47 },
        { x: x + 88, y: y - 5 },
        { x: x + 10, y: y + 34 },
      ],
      bodyColor,
      1,
    );
    this.fillPolygon(
      van,
      [
        { x: x - 18, y: y - 35 },
        { x: x + 15, y: y - 51 },
        { x: x + 70, y: y - 23 },
        { x: x + 38, y: y - 7 },
      ],
      0xe9f6ff,
      1,
    );
    this.fillPolygon(
      van,
      [
        { x: x + 18, y: y - 3 },
        { x: x + 55, y: y - 22 },
        { x: x + 79, y: y - 10 },
        { x: x + 41, y: y + 8 },
      ],
      0xffefc8,
      1,
    );
    van.fillStyle(0x25272b, 1);
    van.fillEllipse(x - 40, y + 24, 28, 14);
    van.fillEllipse(x + 36, y + 24, 28, 14);
  }

  private addUtilityCart(x: number, y: number, bodyColor: number) {
    const cart = this.add.graphics();
    cart.setDepth(y);
    cart.fillStyle(0x11151c, 0.14);
    cart.fillEllipse(x - 4, y + 18, 78, 20);
    this.fillPolygon(
      cart,
      [
        { x: x - 34, y: y },
        { x: x - 4, y: y - 14 },
        { x: x + 36, y: y + 6 },
        { x: x + 6, y: y + 21 },
      ],
      bodyColor,
      1,
    );
    cart.fillStyle(0x8d9095, 1);
    cart.fillRect(x - 2, y - 24, 8, 24);
    cart.fillRect(x + 16, y - 20, 8, 20);
    cart.fillStyle(0x25272b, 1);
    cart.fillEllipse(x - 22, y + 16, 18, 10);
    cart.fillEllipse(x + 20, y + 16, 18, 10);
  }

  private addCrateStack(x: number, y: number) {
    const stack = this.add.graphics();
    stack.setDepth(y);
    this.fillPolygon(
      stack,
      [
        { x: x - 30, y: y - 12 },
        { x: x - 4, y: y - 24 },
        { x: x + 18, y: y - 12 },
        { x: x - 8, y: y },
      ],
      0xcf9e60,
      1,
    );
    this.fillPolygon(
      stack,
      [
        { x: x - 8, y },
        { x: x + 18, y: y - 12 },
        { x: x + 18, y: y + 16 },
        { x: x - 8, y: y + 28 },
      ],
      0xb67f41,
      1,
    );
    this.fillPolygon(
      stack,
      [
        { x: x - 30, y: y - 12 },
        { x: x - 8, y },
        { x: x - 8, y: y + 28 },
        { x: x - 30, y: y + 16 },
      ],
      0x946738,
      1,
    );
  }

  private addBin(x: number, y: number) {
    const bin = this.add.graphics();
    bin.setDepth(y);
    this.fillPolygon(
      bin,
      [
        { x: x - 16, y: y - 12 },
        { x: x + 4, y: y - 22 },
        { x: x + 18, y: y - 14 },
        { x: x - 2, y: y - 4 },
      ],
      0xd74646,
      1,
    );
    this.fillPolygon(
      bin,
      [
        { x: x - 2, y: y - 4 },
        { x: x + 18, y: y - 14 },
        { x: x + 18, y: y + 18 },
        { x: x - 2, y: y + 28 },
      ],
      0xbd3232,
      1,
    );
    this.fillPolygon(
      bin,
      [
        { x: x - 16, y: y - 12 },
        { x: x - 2, y: y - 4 },
        { x: x - 2, y: y + 28 },
        { x: x - 16, y: y + 20 },
      ],
      0xa62c2c,
      1,
    );
  }

  private addNpc(avatar: string, x: number, y: number, direction: Direction, color: string) {
    const shadow = this.add.ellipse(x, y + 3, 22, 8, 0x0b1018, 0.22).setDepth(y - 1);
    shadow.setOrigin(0.5);

    const sprite = this.add
      .sprite(x, y, `avatar-sheet-${avatar}`, FRAME_GROUPS[direction].idle[0])
      .setOrigin(0.5, 1)
      .setScale(1.25)
      .setDepth(y);
    sprite.play(`${avatar}-idle-${direction}`, true);
    sprite.setTint(hexToColor(color));
  }

  private createViewportHud() {
    this.add
      .text(24, 18, 'PIXEL ROOM // ISO CITY BLOCK', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '18px',
        color: '#f7fbff',
      })
      .setScrollFactor(0)
      .setDepth(2000);

    this.add
      .text(24, 42, 'Supermarket / Fruit Hall / Market / Taxi Lane / Public Plaza', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '12px',
        color: '#dbe4ef',
      })
      .setScrollFactor(0)
      .setDepth(2000);
  }

  private addPlayerSprite(player: PlayerState) {
    const body = this.add.sprite(0, 0, `avatar-sheet-${player.avatar}`, FRAME_GROUPS.down.idle[0]).setOrigin(0.5, 1);
    body.setScale(1.35);

    const shadow = this.add.ellipse(0, 2, 24, 8, 0x071018, 0.3).setOrigin(0.5, 0.5);
    const aura = this.add
      .ellipse(0, -7, 34, 14, hexToColor(player.color), 0.16)
      .setOrigin(0.5, 0.5);
    const nameTag = this.add
      .text(0, -37, player.name, {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '12px',
        color: '#f8f3df',
        backgroundColor: '#0f1620cc',
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      })
      .setOrigin(0.5);
    const bubble = this.add
      .text(0, -70, '', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '11px',
        color: '#1d2330',
        backgroundColor: '#f7f4e8',
        wordWrap: { width: 180 },
        padding: { left: 6, right: 6, top: 5, bottom: 5 },
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    const container = this.add.container(player.x, player.y, [shadow, aura, body, nameTag, bubble]);
    container.setDepth(player.y);
    this.sprites.set(player.id, { container, body, nameTag, bubble, aura });
  }

  private renderPlayer(player: PlayerState) {
    const sprite = this.sprites.get(player.id);
    if (!sprite) {
      return;
    }

    sprite.container.setPosition(player.x, player.y);
    sprite.container.setDepth(player.y);
    sprite.nameTag.setText(player.name);
    sprite.aura.setVisible(player.id === this.localPlayerId);

    const animKey = `${player.avatar}-${player.isMoving ? 'run' : 'idle'}-${player.direction}`;
    if (sprite.body.anims.currentAnim?.key !== animKey) {
      sprite.body.play(animKey, true);
    }
  }

  private removePlayer(id: string) {
    this.players.delete(id);
    this.bubbleTimers.get(id)?.remove(false);
    this.bubbleTimers.delete(id);

    const sprite = this.sprites.get(id);
    if (sprite) {
      sprite.container.destroy(true);
      this.sprites.delete(id);
    }
  }

  private updateCameraFollow() {
    if (!this.localPlayerId) {
      return;
    }

    const localSprite = this.sprites.get(this.localPlayerId);
    if (!localSprite) {
      return;
    }

    this.cameras.main.startFollow(localSprite.container, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(180, 120);
  }

  private createAnimations() {
    AVATAR_OPTIONS.forEach((avatar) => {
      (Object.keys(FRAME_GROUPS) as Direction[]).forEach((direction) => {
        const groups = FRAME_GROUPS[direction];
        const idleKey = `${avatar.id}-idle-${direction}`;
        const runKey = `${avatar.id}-run-${direction}`;

        if (!this.anims.exists(idleKey)) {
          this.anims.create({
            key: idleKey,
            frames: groups.idle.map((frame) => ({
              key: `avatar-sheet-${avatar.id}`,
              frame,
            })),
            frameRate: 5,
            repeat: -1,
          });
        }

        if (!this.anims.exists(runKey)) {
          this.anims.create({
            key: runKey,
            frames: groups.run.map((frame) => ({
              key: `avatar-sheet-${avatar.id}`,
              frame,
            })),
            frameRate: 10,
            repeat: -1,
          });
        }
      });
    });
  }
}
