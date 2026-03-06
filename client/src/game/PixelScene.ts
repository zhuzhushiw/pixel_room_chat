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
  }

  create() {
    this.cameras.main.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    this.cameras.main.setBackgroundColor('#131821');
    this.createAnimations();
    this.drawRoom();

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

  private drawRoom() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x08111e, 0x08111e, 0x14243a, 0x14243a, 1);
    bg.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    const stars = this.add.graphics();
    for (let i = 0; i < 90; i += 1) {
      stars.fillStyle(0xe6ecff, Phaser.Math.FloatBetween(0.25, 0.9));
      stars.fillCircle(Phaser.Math.Between(20, ROOM_WIDTH - 20), Phaser.Math.Between(18, 180), Phaser.Math.Between(1, 2));
    }

    const boulevard = this.add.graphics();
    boulevard.fillStyle(0x7f8997, 1);
    boulevard.fillRect(0, 264, ROOM_WIDTH, 492);
    boulevard.fillStyle(0x4a525f, 1);
    boulevard.fillRect(0, 360, ROOM_WIDTH, 304);
    boulevard.fillStyle(0x2d333c, 1);
    boulevard.fillRect(0, 476, ROOM_WIDTH, 72);

    for (let x = 48; x < ROOM_WIDTH - 48; x += 160) {
      boulevard.fillStyle(0xf6f0ce, 1);
      boulevard.fillRoundedRect(x, 505, 84, 14, 3);
    }

    for (let x = 0; x < ROOM_WIDTH; x += 32) {
      boulevard.lineStyle(1, 0xa0aab8, 0.45);
      boulevard.strokeRect(x, 264, 32, 96);
      boulevard.strokeRect(x, 664, 32, 92);
    }

    const crosswalks = this.add.graphics();
    [524, 1530].forEach((x) => {
      for (let i = 0; i < 8; i += 1) {
        crosswalks.fillStyle(0xece7da, 0.88);
        crosswalks.fillRect(x + i * 18, 458, 10, 108);
      }
    });

    const plaza = this.add.graphics();
    plaza.fillStyle(0xd8d6ce, 1);
    plaza.fillRoundedRect(882, 154, 304, 150, 18);
    plaza.lineStyle(3, 0x4d5668, 1);
    plaza.strokeRoundedRect(882, 154, 304, 150, 18);
    plaza.fillStyle(0x9cd4ff, 0.9);
    plaza.fillCircle(1034, 228, 38);
    plaza.fillStyle(0xe7f4ff, 0.8);
    plaza.fillCircle(1034, 228, 18);

    const storefronts = this.add.graphics();
    const topShops = [
      { x: 92, w: 298, accent: 0xef476f, label: 'CAFE' },
      { x: 430, w: 298, accent: 0x06d6a0, label: 'VINYL' },
      { x: 1260, w: 298, accent: 0x8e7dff, label: 'BOOKS' },
      { x: 1598, w: 356, accent: 0xff9f1c, label: 'ARCADE' },
    ];
    const bottomShops = [
      { x: 94, w: 330, accent: 0x3a86ff, label: 'BAKERY' },
      { x: 464, w: 338, accent: 0xff5d8f, label: 'FLORIST' },
      { x: 1242, w: 308, accent: 0x00c2a8, label: 'BOUTIQUE' },
      { x: 1592, w: 330, accent: 0xf4d35e, label: 'RECORDS' },
    ];

    const drawShop = (x: number, y: number, w: number, h: number, accent: number, label: string) => {
      storefronts.fillStyle(0xf2efe8, 1);
      storefronts.fillRoundedRect(x, y, w, h, 16);
      storefronts.lineStyle(4, 0x3f495c, 1);
      storefronts.strokeRoundedRect(x, y, w, h, 16);
      storefronts.fillStyle(accent, 1);
      storefronts.fillRoundedRect(x + 22, y + 18, w - 44, 38, 12);
      storefronts.fillStyle(0xb9d6ec, 0.95);
      storefronts.fillRoundedRect(x + 24, y + 72, w - 48, 88, 10);
      storefronts.fillStyle(0xf8f6f0, 1);
      storefronts.fillRoundedRect(x + w / 2 - 30, y + 90, 60, h - 90, 8);
      storefronts.fillStyle(0x384155, 1);
      storefronts.fillRect(x + w / 2 - 4, y + 96, 8, h - 100);
      storefronts.fillStyle(0x6f7e92, 0.25);
      storefronts.fillRect(x + 40, y + 84, w - 80, 6);
      this.add
        .text(x + w / 2, y + 37, label, {
          fontFamily: 'Consolas, Monaco, monospace',
          fontSize: '20px',
          color: '#fff9ea',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(50);
    };

    topShops.forEach((shop) => drawShop(shop.x, 54, shop.w, 172, shop.accent, shop.label));
    bottomShops.forEach((shop) => drawShop(shop.x, 794, shop.w, 160, shop.accent, shop.label));

    const decor = this.add.graphics();
    decor.fillStyle(0xffde8a, 0.18);
    for (let i = 0; i < 10; i += 1) {
      const baseX = 140 + i * 190;
      decor.fillCircle(baseX, 236, 18);
      decor.fillCircle(baseX + 40, 780, 18);
    }

    const benches = this.add.graphics();
    const benchSpots = [
      [894, 328],
      [1108, 328],
      [910, 710],
      [1102, 710],
      [320, 708],
      [1698, 708],
    ];
    benchSpots.forEach(([x, y]) => {
      benches.fillStyle(0x8f5d39, 1);
      benches.fillRoundedRect(x, y, 74, 14, 4);
      benches.fillRect(x + 8, y + 14, 6, 18);
      benches.fillRect(x + 60, y + 14, 6, 18);
      benches.fillStyle(0x4d5668, 1);
      benches.fillRect(x - 2, y - 12, 78, 6);
    });

    const stalls = this.add.graphics();
    const stallData = [
      [612, 828, 96, 58, 0xff7f50],
      [734, 828, 96, 58, 0x6dd3ff],
      [856, 828, 96, 58, 0xffd166],
      [978, 828, 96, 58, 0x95d26a],
      [1100, 828, 96, 58, 0xc792ea],
    ];
    stallData.forEach(([x, y, w, h, accent]) => {
      stalls.fillStyle(accent, 1);
      stalls.fillRoundedRect(x, y, w, 20, 6);
      stalls.fillStyle(0xf6f2ea, 1);
      stalls.fillRoundedRect(x + 4, y + 18, w - 8, h - 18, 5);
      stalls.fillStyle(0x475167, 1);
      stalls.fillRect(x + 10, y + h, 6, 18);
      stalls.fillRect(x + w - 16, y + h, 6, 18);
    });

    const lamps = this.add.graphics();
    const lampXs = [162, 496, 824, 1220, 1564, 1890];
    lampXs.forEach((x) => {
      lamps.fillStyle(0x47516a, 1);
      lamps.fillRect(x, 214, 8, 84);
      lamps.fillRect(x, 730, 8, 84);
      lamps.fillStyle(0xffefac, 0.95);
      lamps.fillCircle(x + 4, 206, 15);
      lamps.fillCircle(x + 4, 722, 15);
      lamps.fillStyle(0xffefac, 0.12);
      lamps.fillCircle(x + 4, 206, 34);
      lamps.fillCircle(x + 4, 722, 34);
    });

    const trees = this.add.graphics();
    const treeSpots = [
      [246, 316],
      [1418, 316],
      [1520, 316],
      [236, 720],
      [1450, 720],
      [1546, 720],
    ];
    treeSpots.forEach(([x, y]) => {
      trees.fillStyle(0x6c778a, 1);
      trees.fillRoundedRect(x - 12, y, 24, 20, 5);
      trees.fillStyle(0x4a9b68, 1);
      trees.fillCircle(x, y - 12, 18);
      trees.fillCircle(x - 14, y - 4, 14);
      trees.fillCircle(x + 14, y - 2, 14);
    });

    const frame = this.add.graphics();
    frame.lineStyle(4, 0xffcf70, 0.95);
    frame.strokeRoundedRect(42, 48, ROOM_WIDTH - 84, ROOM_HEIGHT - 96, 24);

    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x0b0f15, 0x0b0f15, 0x0b0f15, 0x0b0f15, 0.42, 0.06, 0.42, 0.06);
    vignette.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    this.add
      .text(42, 38, 'PIXEL ROOM // MERCHANT STREET', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '18px',
        color: '#fff3c9',
      })
      .setDepth(2000)
      .setScrollFactor(0);

    this.add
      .text(ROOM_WIDTH - 42, 38, 'Cafe / Vinyl / Books / Arcade / Bakery', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '14px',
        color: '#bfd2e3',
      })
      .setOrigin(1, 0)
      .setDepth(2000)
      .setScrollFactor(0);
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
