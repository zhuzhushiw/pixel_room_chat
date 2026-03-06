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

type TileObjectProperty = {
  name: string;
  type?: string;
  value: boolean | number | string;
};

type TileObject = Phaser.Types.Tilemaps.TiledObject & {
  properties?: TileObjectProperty[];
};

const ROOM_WIDTH = 2048;
const ROOM_HEIGHT = 1024;
const ROOM_BOUNDS = {
  minX: 96,
  maxX: ROOM_WIDTH - 96,
  minY: 128,
  maxY: ROOM_HEIGHT - 88,
};
const MOVE_SPEED = 170;

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

const getObjectProperty = (object: TileObject, name: string) =>
  object.properties?.find((property: TileObjectProperty) => property.name === name)?.value;

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

    this.load.image('merchant-street-tiles', '/assets/tiled/merchant-street-tiles.png');
    this.load.tilemapTiledJSON('merchant-street-map', '/assets/tiled/merchant-street.json');
  }

  create() {
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.cameras.main.setBackgroundColor('#060a14');
    this.createTilemapWorld();
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

    let direction: Direction = player.direction;
    let velocity = new Phaser.Math.Vector2(0, 0);

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocity.x = -1;
      direction = 'left';
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocity.x = 1;
      direction = 'right';
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocity.y = -1;
      direction = 'up';
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocity.y = 1;
      direction = 'down';
    }

    const isMoving = velocity.lengthSq() > 0;
    if (isMoving) {
      velocity = velocity.normalize().scale((MOVE_SPEED * delta) / 1000);
      player.x = clamp(player.x + velocity.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX);
      player.y = clamp(player.y + velocity.y, ROOM_BOUNDS.minY, ROOM_BOUNDS.maxY);
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

  private createTilemapWorld() {
    const map = this.make.tilemap({ key: 'merchant-street-map' });
    const tileset = map.addTilesetImage('merchant-street-tiles', 'merchant-street-tiles');

    if (!tileset) {
      throw new Error('merchant-street tileset failed to load');
    }

    const groundLayer = map.createLayer('Ground', tileset, 0, 0);
    const structuresLayer = map.createLayer('Structures', tileset, 0, 0);
    const decorLayer = map.createLayer('Decor', tileset, 0, 0);

    groundLayer?.setDepth(0);
    structuresLayer?.setDepth(10);
    decorLayer?.setDepth(20);

    this.addSkylineBackdrop();
    this.addStreetAtmosphere();
    this.addShopSigns(map.getObjectLayer('ShopSigns') ?? undefined);
  }

  private addSkylineBackdrop() {
    const skyline = this.add.graphics();
    skyline.setDepth(-20);
    skyline.fillGradientStyle(0x030510, 0x030510, 0x0d1630, 0x15244d, 1);
    skyline.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    const stars = this.add.graphics();
    stars.setDepth(-19);
    for (let i = 0; i < 120; i += 1) {
      stars.fillStyle(0xdce8ff, Phaser.Math.FloatBetween(0.15, 0.65));
      stars.fillCircle(Phaser.Math.Between(10, ROOM_WIDTH - 10), Phaser.Math.Between(4, 180), Phaser.Math.Between(1, 2));
    }

    const towers = this.add.graphics();
    towers.setDepth(-18);
    const towerData = [
      { x: 24, y: 82, w: 118, h: 212, color: 0x12203d, windows: 0x44caff },
      { x: 156, y: 34, w: 96, h: 262, color: 0x17284a, windows: 0xff68d6 },
      { x: 268, y: 58, w: 134, h: 236, color: 0x132340, windows: 0x77dcff },
      { x: 430, y: 24, w: 168, h: 278, color: 0x1a2648, windows: 0x9d77ff },
      { x: 636, y: 72, w: 114, h: 218, color: 0x13203a, windows: 0x39dfff },
      { x: 770, y: 18, w: 186, h: 290, color: 0x18264b, windows: 0xff6bd9 },
      { x: 978, y: 62, w: 126, h: 232, color: 0x12203d, windows: 0x7de9ff },
      { x: 1128, y: 28, w: 172, h: 274, color: 0x16254a, windows: 0x60beff },
      { x: 1344, y: 86, w: 108, h: 208, color: 0x12203d, windows: 0xffa74e },
      { x: 1474, y: 42, w: 142, h: 252, color: 0x19294c, windows: 0x46e6ff },
      { x: 1648, y: 18, w: 186, h: 288, color: 0x16254a, windows: 0xff68d6 },
      { x: 1864, y: 66, w: 136, h: 228, color: 0x10203c, windows: 0x84efff },
    ];

    towerData.forEach((tower) => {
      towers.fillStyle(tower.color, 0.96);
      towers.fillRoundedRect(tower.x, tower.y, tower.w, tower.h, 10);
      towers.fillStyle(0x223764, 0.85);
      towers.fillRoundedRect(tower.x + 4, tower.y + 4, tower.w - 8, 10, 6);

      for (let x = tower.x + 12; x < tower.x + tower.w - 12; x += 16) {
        for (let y = tower.y + 24; y < tower.y + tower.h - 16; y += 18) {
          towers.fillStyle(tower.windows, Phaser.Math.FloatBetween(0.1, 0.32));
          towers.fillRect(x, y, 6, 10);
        }
      }
    });

    const ringRoad = this.add.graphics();
    ringRoad.setDepth(-16);
    ringRoad.lineStyle(18, 0x55c5ff, 0.2);
    this.strokeBezier(
      ringRoad,
      new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(120, 308),
        new Phaser.Math.Vector2(380, 170),
        new Phaser.Math.Vector2(650, 164),
        new Phaser.Math.Vector2(934, 236),
      ),
    );
    this.strokeBezier(
      ringRoad,
      new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(934, 236),
        new Phaser.Math.Vector2(1232, 314),
        new Phaser.Math.Vector2(1498, 340),
        new Phaser.Math.Vector2(1930, 220),
      ),
    );

    ringRoad.lineStyle(8, 0xff68d6, 0.45);
    this.strokeBezier(
      ringRoad,
      new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(118, 310),
        new Phaser.Math.Vector2(380, 178),
        new Phaser.Math.Vector2(646, 172),
        new Phaser.Math.Vector2(934, 244),
      ),
    );
    this.strokeBezier(
      ringRoad,
      new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(934, 244),
        new Phaser.Math.Vector2(1226, 318),
        new Phaser.Math.Vector2(1502, 346),
        new Phaser.Math.Vector2(1928, 226),
      ),
    );

    const haze = this.add.graphics();
    haze.setDepth(-12);
    haze.fillGradientStyle(0x58b7ff, 0x58b7ff, 0x090f18, 0x090f18, 0.12, 0.03, 0.22, 0.02);
    haze.fillRect(0, 138, ROOM_WIDTH, 320);
  }

  private addStreetAtmosphere() {
    const avenueGlow = this.add.graphics();
    avenueGlow.setDepth(15);

    const glowSpots = [
      [156, 352, 0x32ddff],
      [412, 352, 0xff68d6],
      [668, 352, 0x32ddff],
      [924, 352, 0xffae4c],
      [1180, 352, 0x32ddff],
      [1436, 352, 0xff68d6],
      [1692, 352, 0x32ddff],
      [1948, 352, 0xffae4c],
      [224, 688, 0xff68d6],
      [548, 688, 0x32ddff],
      [872, 688, 0xffae4c],
      [1196, 688, 0x32ddff],
      [1520, 688, 0xff68d6],
      [1844, 688, 0x32ddff],
    ];

    glowSpots.forEach(([x, y, color]) => {
      avenueGlow.fillStyle(Number(color), 0.11);
      avenueGlow.fillCircle(Number(x), Number(y), 56);
    });

    const railTrails = this.add.graphics();
    railTrails.setDepth(14);
    railTrails.lineStyle(12, 0x32ddff, 0.18);
    this.strokeBezier(
      railTrails,
      new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(0, 500),
        new Phaser.Math.Vector2(260, 452),
        new Phaser.Math.Vector2(494, 452),
        new Phaser.Math.Vector2(774, 510),
      ),
    );
    this.strokeBezier(
      railTrails,
      new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(774, 510),
        new Phaser.Math.Vector2(1114, 582),
        new Phaser.Math.Vector2(1448, 590),
        new Phaser.Math.Vector2(2048, 470),
      ),
    );

    railTrails.lineStyle(5, 0xff68d6, 0.42);
    this.strokeBezier(
      railTrails,
      new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(0, 504),
        new Phaser.Math.Vector2(260, 458),
        new Phaser.Math.Vector2(494, 458),
        new Phaser.Math.Vector2(774, 514),
      ),
    );
    this.strokeBezier(
      railTrails,
      new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(774, 514),
        new Phaser.Math.Vector2(1114, 586),
        new Phaser.Math.Vector2(1448, 596),
        new Phaser.Math.Vector2(2048, 476),
      ),
    );

    const wetBloom = this.add.graphics();
    wetBloom.setDepth(13);
    wetBloom.fillGradientStyle(0x34e3ff, 0x34e3ff, 0x34e3ff, 0x34e3ff, 0.04, 0.01, 0.12, 0.02);
    wetBloom.fillRect(0, 438, ROOM_WIDTH, 190);
    wetBloom.fillGradientStyle(0xff68d6, 0xff68d6, 0xff68d6, 0xff68d6, 0.02, 0.005, 0.07, 0.01);
    wetBloom.fillRect(0, 628, ROOM_WIDTH, 150);

    const rain = this.add.graphics();
    rain.setDepth(850);
    for (let i = 0; i < 180; i += 1) {
      const x = Phaser.Math.Between(-80, ROOM_WIDTH + 40);
      const y = Phaser.Math.Between(-10, ROOM_HEIGHT - 50);
      const length = Phaser.Math.Between(10, 26);
      rain.lineStyle(1, 0xc2e8ff, Phaser.Math.FloatBetween(0.04, 0.14));
      rain.beginPath();
      rain.moveTo(x, y);
      rain.lineTo(x - 10, y + length);
      rain.strokePath();
    }

    const vignette = this.add.graphics();
    vignette.setDepth(900);
    vignette.fillGradientStyle(0x050810, 0x050810, 0x050810, 0x050810, 0.3, 0.04, 0.34, 0.03);
    vignette.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
  }

  private addShopSigns(objectLayer?: Phaser.Tilemaps.ObjectLayer) {
    if (!objectLayer) {
      return;
    }

    objectLayer.objects.forEach((rawObject) => {
      const object = rawObject as TileObject;
      const width = object.width ?? 160;
      const x = (object.x ?? 0) + width / 2;
      const y = (object.y ?? 0) - 18;
      const color = typeof getObjectProperty(object, 'color') === 'string' ? String(getObjectProperty(object, 'color')) : '#fff3c9';
      const size = typeof getObjectProperty(object, 'size') === 'number' ? Number(getObjectProperty(object, 'size')) : 20;
      const caption =
        typeof getObjectProperty(object, 'caption') === 'string'
          ? String(getObjectProperty(object, 'caption'))
          : object.type === 'district'
            ? 'street district'
            : 'open late';

      const glow = this.add.rectangle(x, y + 2, width + 28, 30, Phaser.Display.Color.HexStringToColor(color).color, 0.12);
      glow.setDepth((object.y ?? 0) + 5);
      this.tweens.add({
        targets: glow,
        alpha: 0.32,
        duration: Phaser.Math.Between(1400, 2200),
        yoyo: true,
        repeat: -1,
      });

      const title = this.add
        .text(x, y, object.name ?? '', {
          fontFamily: 'Consolas, Monaco, monospace',
          fontSize: `${size}px`,
          color,
          stroke: '#142033',
          strokeThickness: 6,
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0.5)
        .setDepth((object.y ?? 0) + 8);
      this.tweens.add({
        targets: title,
        alpha: 0.82,
        duration: Phaser.Math.Between(1500, 2600),
        yoyo: true,
        repeat: -1,
      });

      this.add
        .text(x, y + 28, caption, {
          fontFamily: 'Consolas, Monaco, monospace',
          fontSize: '11px',
          color: '#f2f0e8',
          backgroundColor: '#122034cc',
          padding: { left: 6, right: 6, top: 2, bottom: 2 },
        })
        .setOrigin(0.5, 0.5)
        .setDepth((object.y ?? 0) + 7);
    });
  }

  private createViewportHud() {
    this.add
      .text(24, 18, 'PIXEL ROOM // NEON MIDTOWN', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '18px',
        color: '#f2f6ff',
      })
      .setScrollFactor(0)
      .setDepth(2000);

    this.add
      .text(24, 42, 'Byte Cafe / Pulse Club / Sky Mall / Zero-One / Cloud Bar / Data Bazaar', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '12px',
        color: '#a7bbd4',
      })
      .setScrollFactor(0)
      .setDepth(2000);
  }

  private strokeBezier(graphics: Phaser.GameObjects.Graphics, curve: Phaser.Curves.CubicBezier) {
    graphics.strokePoints(curve.getPoints(36));
  }

  private addPlayerSprite(player: PlayerState) {
    const body = this.add.sprite(0, 0, `avatar-sheet-${player.avatar}`, FRAME_GROUPS.down.idle[0]).setOrigin(0.5, 1);
    body.setScale(1.7);

    const shadow = this.add.ellipse(0, 2, 28, 10, 0x071018, 0.35).setOrigin(0.5, 0.5);
    const aura = this.add
      .ellipse(0, -8, 42, 18, Phaser.Display.Color.HexStringToColor(player.color).color, 0.18)
      .setOrigin(0.5, 0.5);
    const nameTag = this.add
      .text(0, -40, player.name, {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '12px',
        color: '#f8f3df',
        backgroundColor: '#0f1620cc',
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      })
      .setOrigin(0.5);
    const bubble = this.add
      .text(0, -72, '', {
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
