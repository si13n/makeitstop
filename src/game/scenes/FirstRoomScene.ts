import Phaser from 'phaser';
import PrototypeAudio from '../audio/PrototypeAudio';
import RapidMouseMovementDetector from '../systems/RapidMouseMovementDetector';
import FirstRoomVisualFactory, {
  type FirstRoomVisuals
} from '../visual/FirstRoomVisualFactory';

const DEBUG_FIRST_ROOM = false;

enum FirstRoomState {
  Darkness = 'darkness',
  Igniting = 'igniting',
  Revealed = 'revealed'
}

export default class FirstRoomScene extends Phaser.Scene {
  private state = FirstRoomState.Darkness;
  private readonly detector = new RapidMouseMovementDetector();
  private readonly prototypeAudio = new PrototypeAudio();
  private visuals: FirstRoomVisuals | null = null;
  private visualFactory: FirstRoomVisualFactory | null = null;
  private lastFeedbackProgress = 0;
  private debugText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'FirstRoomScene' });
  }

  create(): void {
    this.state = FirstRoomState.Darkness;
    this.detector.reset();
    this.lastFeedbackProgress = 0;
    void this.prototypeAudio.ensureStarted();
    this.cameras.main.setBackgroundColor('#030303');
    this.visualFactory = new FirstRoomVisualFactory(this);
    this.visuals = this.visualFactory.create(this.scale.width, this.scale.height);

    this.tweens.add({
      targets: this.visuals.grain,
      alpha: { from: 0.016, to: 0.03 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    if (import.meta.env.DEV && DEBUG_FIRST_ROOM) {
      this.debugText = this.add.text(12, 12, '', {
        color: '#7d9b83',
        fontFamily: 'monospace',
        fontSize: '14px'
      });
    }
  }

  update(): void {
    if (this.visuals) {
      this.visuals.grain.tilePositionX += 0.035;
      this.visuals.grain.tilePositionY += 0.018;
    }

    if (this.debugText) {
      this.debugText.setText([
        `state: ${this.state}`,
        `valid changes: ${this.detector.progress}/6`,
        `direction: ${this.detector.direction ?? '-'}`
      ]);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    void this.prototypeAudio.ensureStarted();
    if (this.state !== FirstRoomState.Darkness) return;

    const solved = this.detector.handlePointerMove(pointer);
    const progress = this.detector.progress;
    if (progress !== this.lastFeedbackProgress) {
      this.lastFeedbackProgress = progress;
      if (progress === 2) this.prototypeAudio.playLighterClick();
      if (progress === 4) this.showSpark();
    }
    if (solved) this.igniteLighter();
  }

  private showSpark(): void {
    if (!this.visuals) return;
    this.prototypeAudio.playLighterClick();
    const spark = this.visuals.spark;
    spark.setAlpha(0.42).setScale(0.5).setRotation(-0.2);
    this.tweens.add({
      targets: spark,
      alpha: 0,
      scaleX: 1.1,
      scaleY: 1.4,
      y: spark.y - 13,
      duration: 115,
      ease: 'Quad.Out'
    });
  }

  private igniteLighter(): void {
    if (this.state !== FirstRoomState.Darkness || !this.visuals) return;

    this.state = FirstRoomState.Igniting;
    this.prototypeAudio.playIgnition();
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);

    const visuals = this.visuals;
    const finalY = this.scale.height * 0.87;
    visuals.lighterContainer.setY(finalY + 68).setAlpha(1);
    this.tweens.add({
      targets: visuals.initialCover,
      alpha: 0,
      duration: 190,
      ease: 'Sine.Out'
    });
    this.tweens.add({
      targets: visuals.lighterContainer,
      y: finalY,
      duration: 260,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.state = FirstRoomState.Revealed;
        this.prototypeAudio.startFlameCrackle();
      }
    });
    this.startFlameAnimation(visuals);
  }

  private startFlameAnimation(visuals: FirstRoomVisuals): void {
    this.tweens.add({
      targets: visuals.outerFlame,
      scaleX: { from: 0.92, to: 1.06 },
      scaleY: { from: 0.94, to: 1.08 },
      rotation: { from: -0.045, to: 0.065 },
      duration: 145,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
    this.tweens.add({
      targets: visuals.innerFlame,
      scaleY: { from: 0.9, to: 1.08 },
      x: { from: -1, to: 2 },
      duration: 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
    this.tweens.add({
      targets: visuals.glow,
      alpha: { from: 0.76, to: 0.88 },
      scaleX: { from: 0.985, to: 1.015 },
      scaleY: { from: 0.99, to: 1.01 },
      duration: 310,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
    this.tweens.add({
      targets: visuals.darkness,
      alpha: { from: 0.93, to: 1 },
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.visuals || !this.visualFactory) return;
    this.visualFactory.layout(this.visuals, gameSize.width, gameSize.height);
  }

  private cleanup(): void {
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.prototypeAudio.destroy();
    this.detector.reset();
  }
}
