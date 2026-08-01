import Phaser from 'phaser';

const WALL_TEXTURE = 'first-room-wall';
const DARKNESS_TEXTURE = 'first-room-darkness';
const GLOW_TEXTURE = 'first-room-glow';
const GRAIN_TEXTURE = 'first-room-grain';

export interface FirstRoomVisuals {
  roomContainer: Phaser.GameObjects.Container;
  wall: Phaser.GameObjects.Image;
  message: Phaser.GameObjects.Container;
  darkness: Phaser.GameObjects.Image;
  initialCover: Phaser.GameObjects.Rectangle;
  grain: Phaser.GameObjects.TileSprite;
  lighterContainer: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Image;
  outerFlame: Phaser.GameObjects.Ellipse;
  innerFlame: Phaser.GameObjects.Ellipse;
  spark: Phaser.GameObjects.Ellipse;
}

export default class FirstRoomVisualFactory {
  constructor(private readonly scene: Phaser.Scene) {}

  create(width: number, height: number): FirstRoomVisuals {
    this.ensureTextures();

    const wall = this.scene.add.image(0, 0, WALL_TEXTURE).setOrigin(0);
    const message = this.createWallMessage();
    const roomContainer = this.scene.add.container(0, 0, [wall, message]);
    const darkness = this.scene.add.image(0, 0, DARKNESS_TEXTURE).setOrigin(0);
    const initialCover = this.scene.add.rectangle(0, 0, width, height, 0x030303, 1).setOrigin(0);
    const lighterContainer = this.createLighter().setAlpha(0);
    const grain = this.scene.add
      .tileSprite(0, 0, width, height, GRAIN_TEXTURE)
      .setOrigin(0)
      .setAlpha(0.025);
    const spark = this.scene.add
      .ellipse(0, 0, 4, 9, 0xffb34d, 0)
      .setBlendMode(Phaser.BlendModes.ADD);

    const visuals: FirstRoomVisuals = {
      roomContainer,
      wall,
      message,
      darkness,
      initialCover,
      grain,
      lighterContainer,
      glow: lighterContainer.getAt(0) as Phaser.GameObjects.Image,
      outerFlame: lighterContainer.getAt(1) as Phaser.GameObjects.Ellipse,
      innerFlame: lighterContainer.getAt(2) as Phaser.GameObjects.Ellipse,
      spark
    };
    this.layout(visuals, width, height);
    return visuals;
  }

  layout(visuals: FirstRoomVisuals, width: number, height: number): void {
    visuals.wall.setDisplaySize(width, height);
    visuals.message.setPosition(width * 0.405, height * 0.43);
    visuals.darkness.setDisplaySize(width, height);
    visuals.initialCover.setSize(width, height);
    visuals.grain.setSize(width, height);
    visuals.lighterContainer.setPosition(width * 0.52, height * 0.87);
    visuals.spark.setPosition(width * 0.52, height * 0.755);
  }

  private ensureTextures(): void {
    if (!this.scene.textures.exists(WALL_TEXTURE)) this.createWallTexture();
    if (!this.scene.textures.exists(DARKNESS_TEXTURE)) this.createDarknessTexture();
    if (!this.scene.textures.exists(GLOW_TEXTURE)) this.createGlowTexture();
    if (!this.scene.textures.exists(GRAIN_TEXTURE)) this.createGrainTexture();
  }

  private createWallTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#28231f';
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < 260; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = 8 + Math.random() * 75;
      const red = 20 + Math.random() * 20;
      const green = 17 + Math.random() * 15;
      const blue = 14 + Math.random() * 12;
      const alpha = 0.015 + Math.random() * 0.055;
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      context.beginPath();
      context.ellipse(
        x,
        y,
        radius,
        radius * (0.25 + Math.random()),
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      context.fill();
    }

    context.lineWidth = 1;
    for (let index = 0; index < 70; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      context.strokeStyle = `rgba(132, 119, 101, ${0.025 + Math.random() * 0.06})`;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (Math.random() - 0.5) * 90, y + Math.random() * 45);
      context.stroke();
    }

    const vignette = context.createRadialGradient(640, 360, 120, 640, 360, 720);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, canvas.width, canvas.height);
    this.scene.textures.addCanvas(WALL_TEXTURE, canvas);
  }

  private createDarknessTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('2d');
    if (!context) return;

    const centerX = canvas.width * 0.52;
    const centerY = canvas.height * 0.57;
    const gradient = context.createRadialGradient(centerX, centerY, 25, centerX, centerY, 245);
    gradient.addColorStop(0, 'rgba(3, 3, 3, 0.08)');
    gradient.addColorStop(0.32, 'rgba(3, 3, 3, 0.2)');
    gradient.addColorStop(0.7, 'rgba(3, 3, 3, 0.82)');
    gradient.addColorStop(1, 'rgba(3, 3, 3, 0.995)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    this.scene.textures.addCanvas(DARKNESS_TEXTURE, canvas);
  }

  private createGlowTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 420;
    const context = canvas.getContext('2d');
    if (!context) return;

    const gradient = context.createRadialGradient(210, 210, 2, 210, 210, 210);
    gradient.addColorStop(0, 'rgba(255, 190, 82, 0.28)');
    gradient.addColorStop(0.28, 'rgba(226, 119, 38, 0.1)');
    gradient.addColorStop(1, 'rgba(160, 65, 12, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 420, 420);
    this.scene.textures.addCanvas(GLOW_TEXTURE, canvas);
  }

  private createGrainTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) return;

    const image = context.createImageData(canvas.width, canvas.height);
    for (let index = 0; index < image.data.length; index += 4) {
      const value = Math.random() > 0.5 ? 230 : 35;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = Math.floor(Math.random() * 38);
    }
    context.putImageData(image, 0, 0);
    this.scene.textures.addCanvas(GRAIN_TEXTURE, canvas);
  }

  private createWallMessage(): Phaser.GameObjects.Container {
    const message = 'MAKE IT STOP';
    const container = this.scene.add.container(0, 0).setRotation(-0.045);
    const blood = this.scene.add.graphics();

    blood.lineStyle(9, 0x310304, 0.36);
    blood.beginPath();
    blood.moveTo(-7, 30);
    blood.lineTo(92, 35);
    blood.lineTo(177, 29);
    blood.lineTo(292, 37);
    blood.strokePath();
    blood.fillStyle(0x3b0305, 0.72);
    const drips = [18, 73, 146, 218, 274];
    drips.forEach((x, index) => {
      const length = 10 + ((index * 13) % 29);
      blood.fillCircle(x, 31, 4 + (index % 2));
      blood.fillRoundedRect(x - 2, 31, 4, length, 2);
      blood.fillCircle(x, 31 + length, 2.5);
    });
    blood.fillStyle(0x7d1718, 0.32);
    blood.fillEllipse(113, 32, 34, 7);
    blood.fillEllipse(252, 34, 45, 6);
    container.add(blood);

    let cursorX = 0;
    for (let index = 0; index < message.length; index += 1) {
      const character = message[index];
      const brushShadow = this.scene.add
        .text(cursorX + ((index % 3) - 1) * 1.4, Math.sin(index * 2.1) * 3 + 1, character, {
          color: '#3d0507',
          fontFamily: 'Segoe Print, Comic Sans MS, cursive',
          fontSize: '35px',
          fontStyle: 'bold',
          shadow: {
            offsetX: 0,
            offsetY: 0,
            color: '#4a0709',
            blur: 5,
            stroke: true,
            fill: true
          }
        })
        .setAlpha(0.42)
        .setScale(0.96 + (index % 3) * 0.025, 1 + (index % 2) * 0.035)
        .setRotation(((index % 5) - 2) * 0.022);
      const glyph = this.scene.add
        .text(cursorX, Math.sin(index * 2.1) * 3, character, {
          color: index % 3 === 0 ? '#821719' : '#671012',
          fontFamily: 'Segoe Print, Comic Sans MS, cursive',
          fontSize: '34px',
          fontStyle: 'bold',
          shadow: {
            offsetX: 1,
            offsetY: 1,
            color: '#2b0304',
            blur: 2,
            stroke: true,
            fill: true
          }
        })
        .setAlpha(0.78 + (index % 4) * 0.05)
        .setScale(0.97 + (index % 4) * 0.018, 0.96 + (index % 3) * 0.035)
        .setRotation(((index % 5) - 2) * 0.022);
      container.add([brushShadow, glyph]);
      cursorX += character === ' ' ? 16 : 25 + (index % 2) * 2;
    }
    return container;
  }

  private createLighter(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const glow = this.scene.add
      .image(0, -205, GLOW_TEXTURE)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.8);
    const outerFlame = this.scene.add
      .ellipse(0, -81, 22, 45, 0xe86e1c, 0.95)
      .setRotation(0.05);
    const innerFlame = this.scene.add
      .ellipse(1, -77, 10, 28, 0xffe59a, 1)
      .setRotation(-0.04);

    const hand = this.scene.add.graphics();
    hand.fillStyle(0x17120f, 1);
    hand.fillRoundedRect(-54, -8, 108, 145, 38);
    hand.fillRoundedRect(23, -3, 34, 88, 16);
    hand.fillStyle(0x6e4630, 0.28);
    hand.fillRoundedRect(34, 2, 6, 76, 3);

    const lighter = this.scene.add.graphics();
    lighter.fillStyle(0x6d675d, 1);
    lighter.fillRoundedRect(-24, -39, 48, 69, 6);
    lighter.fillStyle(0x8b8477, 0.8);
    lighter.fillRect(-20, -35, 7, 61);
    lighter.fillStyle(0x35332f, 1);
    lighter.fillRoundedRect(-24, -53, 48, 19, 4);
    lighter.fillStyle(0x81796b, 1);
    lighter.fillCircle(-11, -54, 9);
    lighter.lineStyle(2, 0x35312c, 0.8);
    lighter.strokeCircle(-11, -54, 6);
    lighter.fillStyle(0x191714, 1);
    lighter.fillRect(9, -61, 7, 12);
    lighter.lineStyle(1, 0xb1a899, 0.4);
    lighter.strokeRoundedRect(-24, -39, 48, 69, 6);

    container.add([glow, outerFlame, innerFlame, hand, lighter]);
    return container;
  }
}
