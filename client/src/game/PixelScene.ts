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

const ROOM_WIDTH = 1152;
const ROOM_HEIGHT = 768;
const ROOM_BOUNDS = {
  minX: 64,
  maxX: ROOM_WIDTH - 64,
  minY: 88,
  maxY: ROOM_HEIGHT - 52,
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
    bg.fillStyle(0x0c1118, 1);
    bg.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    const floor = this.add.graphics();
    floor.fillStyle(0xced4dd, 1);
    floor.fillRoundedRect(48, 54, ROOM_WIDTH - 96, ROOM_HEIGHT - 108, 22);

    for (let x = 64; x < ROOM_WIDTH - 64; x += 32) {
      for (let y = 70; y < ROOM_HEIGHT - 70; y += 32) {
        floor.lineStyle(1, 0xa7afbb, 0.55);
        floor.strokeRect(x, y, 32, 32);
      }
    }

    const walls = this.add.graphics();
    walls.fillStyle(0xf1efe8, 1);
    walls.lineStyle(4, 0x3e4760, 1);
    walls.strokeRoundedRect(48, 54, ROOM_WIDTH - 96, ROOM_HEIGHT - 108, 22);

    walls.fillRoundedRect(176, 80, 332, 174, 12);
    walls.strokeRoundedRect(176, 80, 332, 174, 12);

    walls.fillRoundedRect(176, 286, 332, 220, 12);
    walls.strokeRoundedRect(176, 286, 332, 220, 12);

    walls.fillRoundedRect(572, 80, 376, 462, 12);
    walls.strokeRoundedRect(572, 80, 376, 462, 12);

    walls.fillRoundedRect(572, 574, 376, 102, 12);
    walls.strokeRoundedRect(572, 574, 376, 102, 12);

    const accents = this.add.graphics();
    accents.fillStyle(0xbfd7ea, 0.9);
    accents.fillRoundedRect(226, 122, 112, 54, 6);
    accents.fillStyle(0xced9e6, 0.95);
    accents.fillRoundedRect(220, 344, 248, 124, 10);
    accents.fillStyle(0x5c6b83, 0.22);
    accents.fillRect(176, 250, 332, 6);
    accents.fillRect(176, 508, 332, 6);
    accents.fillRect(572, 548, 376, 6);

    const furniture = this.add.graphics();

    const deskBlocks = [
      [646, 144],
      [784, 144],
      [646, 276],
      [784, 276],
      [646, 408],
      [784, 408],
    ];

    deskBlocks.forEach(([x, y]) => {
      furniture.fillStyle(0xdbc7a4, 1);
      furniture.fillRoundedRect(x, y, 98, 40, 6);
      furniture.fillStyle(0x465067, 1);
      furniture.fillRect(x + 16, y - 22, 48, 24);
      furniture.fillStyle(0x8ec5ff, 1);
      furniture.fillRect(x + 20, y - 18, 40, 16);
      furniture.fillStyle(0x2d3548, 1);
      furniture.fillRoundedRect(x + 24, y + 46, 32, 30, 7);
      furniture.fillStyle(0x616d82, 0.35);
      furniture.fillRect(x + 10, y + 8, 78, 6);
    });

    furniture.fillStyle(0x262d3c, 1);
    furniture.fillRect(734, 80, 4, 462);

    furniture.fillStyle(0x6e7d94, 1);
    furniture.fillRoundedRect(232, 112, 24, 112, 6);
    furniture.fillRoundedRect(402, 112, 24, 112, 6);

    furniture.fillStyle(0x3d4454, 1);
    furniture.fillRoundedRect(304, 356, 66, 118, 10);
    furniture.fillStyle(0x3aa0ff, 0.8);
    furniture.fillCircle(274, 406, 24);
    furniture.fillStyle(0x202734, 1);
    furniture.fillRect(232, 386, 54, 54);
    furniture.fillRoundedRect(388, 392, 30, 72, 8);
    furniture.fillStyle(0x49586f, 1);
    furniture.fillCircle(448, 414, 18);
    furniture.fillCircle(206, 462, 12);
    furniture.fillCircle(450, 352, 8);

    furniture.fillStyle(0xd4bf95, 1);
    furniture.fillRoundedRect(204, 582, 284, 62, 10);
    furniture.fillStyle(0x9b6136, 1);
    furniture.fillRect(226, 644, 10, 26);
    furniture.fillRect(448, 644, 10, 26);
    furniture.fillRect(252, 644, 10, 26);
    furniture.fillRect(422, 644, 10, 26);

    furniture.fillStyle(0xe5e0d6, 1);
    furniture.fillRoundedRect(604, 596, 96, 54, 8);
    furniture.fillRoundedRect(720, 596, 96, 54, 8);
    furniture.fillRoundedRect(836, 596, 80, 54, 8);

    const plants = this.add.graphics();
    const plantPositions = [
      [142, 212],
      [520, 214],
      [528, 622],
      [972, 140],
      [972, 620],
    ];
    plantPositions.forEach(([x, y]) => {
      plants.fillStyle(0x5f6a7d, 1);
      plants.fillRoundedRect(x - 10, y, 20, 20, 4);
      plants.fillStyle(0x4c9660, 1);
      plants.fillCircle(x - 6, y - 4, 10);
      plants.fillCircle(x + 6, y - 8, 12);
      plants.fillCircle(x + 2, y - 18, 10);
    });

    const frame = this.add.graphics();
    frame.lineStyle(4, 0xffcf70, 0.95);
    frame.strokeRoundedRect(48, 54, ROOM_WIDTH - 96, ROOM_HEIGHT - 108, 22);

    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x0b0f15, 0x0b0f15, 0x0b0f15, 0x0b0f15, 0.42, 0.06, 0.42, 0.06);
    vignette.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    this.add
      .text(40, 38, 'PIXEL ROOM // OFFICE LOBBY', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '18px',
        color: '#fff3c9',
      })
      .setDepth(2000)
      .setScrollFactor(0);
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
