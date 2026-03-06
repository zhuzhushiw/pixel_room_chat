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
    this.cameras.main.setBackgroundColor('#0f1826');
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

    this.addStreetAtmosphere();
    this.addShopSigns(map.getObjectLayer('ShopSigns') ?? undefined);
  }

  private addStreetAtmosphere() {
    const lanternGlow = this.add.graphics();
    lanternGlow.setDepth(15);

    const glowSpots = [
      [148, 338],
      [404, 338],
      [660, 338],
      [916, 338],
      [1172, 338],
      [1428, 338],
      [1684, 338],
      [1940, 338],
      [148, 690],
      [404, 690],
      [660, 690],
      [916, 690],
      [1172, 690],
      [1428, 690],
      [1684, 690],
      [1940, 690],
    ];

    glowSpots.forEach(([x, y]) => {
      lanternGlow.fillStyle(0xffe8a6, 0.08);
      lanternGlow.fillCircle(x, y, 48);
    });

    const vignette = this.add.graphics();
    vignette.setDepth(900);
    vignette.fillGradientStyle(0x0a1018, 0x0a1018, 0x0a1018, 0x0a1018, 0.22, 0.02, 0.26, 0.02);
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

      const glow = this.add.rectangle(x, y + 2, width + 28, 30, Phaser.Display.Color.HexStringToColor(color).color, 0.12);
      glow.setDepth((object.y ?? 0) + 5);

      this.add
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

      const caption = object.type === 'district' ? 'street district' : 'open late';
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
      .text(24, 18, 'PIXEL ROOM // MERCHANT STREET', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '18px',
        color: '#fff0c8',
      })
      .setScrollFactor(0)
      .setDepth(2000);

    this.add
      .text(24, 42, 'Cafe Ember / Vinyl Corner / Book Nook / Arcade Neon / Night Market', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '12px',
        color: '#b8cada',
      })
      .setScrollFactor(0)
      .setDepth(2000);
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
