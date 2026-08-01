import Phaser from 'phaser';
import PrototypeAudio from '../audio/PrototypeAudio';
import RapidMouseMovementDetector from '../systems/RapidMouseMovementDetector';
import FirstRoomVisualFactory, {
  type FirstRoomVisuals
} from '../visual/FirstRoomVisualFactory';

const DEBUG_FIRST_ROOM = false;
const KNOCK_INTERVALS_MS = [640, 1180, 520, 1760, 890, 1430] as const;
const KNOCK_DURATION_MS = 1000;
const ANSWER_WINDOW_MS = 10000;

enum FirstRoomState {
  AwaitingStart = 'awaiting-start',
  Darkness = 'darkness',
  Igniting = 'igniting',
  KnockSequence = 'knock-sequence',
  Listening = 'listening',
  DoorOpening = 'door-opening',
  DoorOpen = 'door-open'
}

export default class FirstRoomScene extends Phaser.Scene {
  private state = FirstRoomState.AwaitingStart;
  private readonly detector = new RapidMouseMovementDetector();
  private readonly prototypeAudio = new PrototypeAudio();
  private visuals: FirstRoomVisuals | null = null;
  private visualFactory: FirstRoomVisualFactory | null = null;
  private lastFeedbackProgress = 0;
  private debugText: Phaser.GameObjects.Text | null = null;
  private startPrompt: Phaser.GameObjects.Text | null = null;
  private sequenceTimers: Phaser.Time.TimerEvent[] = [];
  private answerTimer: Phaser.Time.TimerEvent | null = null;
  private playerTapTimes: number[] = [];
  private knockImpulse = 0;
  private previousLighterX = 0;
  private lighterPointerOffsetX = 0;
  private lighterPointerOffsetY = 0;

  constructor() {
    super({ key: 'FirstRoomScene' });
  }

  create(): void {
    this.state = FirstRoomState.AwaitingStart;
    this.detector.reset();
    this.lastFeedbackProgress = 0;
    this.cameras.main.setBackgroundColor('#030303');
    this.visualFactory = new FirstRoomVisualFactory(this);
    this.visuals = this.visualFactory.create(this.scale.width, this.scale.height);
    this.startPrompt = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'CLICK TO ENTER', {
        color: '#776f66',
        fontFamily: 'monospace',
        fontSize: '16px',
        letterSpacing: 5
      })
      .setOrigin(0.5)
      .setAlpha(0.72);

    this.tweens.add({
      targets: this.visuals.grain,
      alpha: { from: 0.016, to: 0.03 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.input.once(Phaser.Input.Events.POINTER_DOWN, this.handleStart, this);
    this.input.keyboard?.once('keydown', this.handleStart, this);
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

  private async handleStart(): Promise<void> {
    if (this.state !== FirstRoomState.AwaitingStart) return;

    this.state = FirstRoomState.Darkness;
    await this.prototypeAudio.ensureStarted();
    this.startPrompt?.destroy();
    this.startPrompt = null;
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
  }

  update(time: number, delta: number): void {
    if (this.visuals) {
      this.visuals.grain.tilePositionX += 0.035;
      this.visuals.grain.tilePositionY += 0.018;

      if (
        this.state === FirstRoomState.KnockSequence ||
        this.state === FirstRoomState.Listening ||
        this.state === FirstRoomState.DoorOpening ||
        this.state === FirstRoomState.DoorOpen
      ) {
        this.updateLighterMotion(this.visuals, time, delta);
      }
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
    spark
      .setPosition(this.scale.width * 0.52, this.scale.height * 0.755)
      .setAlpha(0.42)
      .setScale(0.5)
      .setRotation(-0.2);
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
        this.prototypeAudio.startFlameCrackle();
        this.previousLighterX = visuals.lighterContainer.x;
        this.startDoorSequence(1700);
      }
    });
    this.startFlameAnimation(visuals);
  }

  private startFlameAnimation(visuals: FirstRoomVisuals): void {
    this.tweens.add({
      targets: visuals.darkness,
      alpha: { from: 0.93, to: 1 },
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  private startDoorSequence(delay = 0): void {
    if (
      this.state === FirstRoomState.DoorOpening ||
      this.state === FirstRoomState.DoorOpen
    ) return;

    this.clearPuzzleTimers();
    this.state = FirstRoomState.KnockSequence;
    this.playerTapTimes = [];
    this.input.setDefaultCursor('default');
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleRhythmTap, this);

    let offset = delay;
    const knockOffsets = [offset];
    for (const interval of KNOCK_INTERVALS_MS) {
      offset += interval;
      knockOffsets.push(offset);
    }

    knockOffsets.forEach((knockOffset, index) => {
      const timer = this.time.delayedCall(knockOffset, () => this.performDoorKnock(index));
      this.sequenceTimers.push(timer);
    });

    const listeningTimer = this.time.delayedCall(
      offset + KNOCK_DURATION_MS,
      this.beginListening,
      [],
      this
    );
    this.sequenceTimers.push(listeningTimer);
  }

  private performDoorKnock(index: number): void {
    if (this.state !== FirstRoomState.KnockSequence || !this.visuals) return;

    const accents = [1.08, 0.9, 1.16, 0.96, 1.1, 0.86, 1.18];
    this.prototypeAudio.playDoorKnock(accents[index]);
    this.knockImpulse = index % 2 === 0 ? -1 : 0.82;
    this.cameras.main.shake(145, 0.0026 + accents[index] * 0.0007);

    const panel = this.visuals.doorPanel;
    this.tweens.killTweensOf(panel);
    panel.setX(-95);
    this.tweens.add({
      targets: panel,
      x: -91 + (index % 2) * 2,
      duration: 72,
      yoyo: true,
      ease: 'Quad.Out'
    });
    this.tweens.killTweensOf(this.visuals.doorContainer);
    this.tweens.add({
      targets: this.visuals.doorContainer,
      alpha: { from: 0.72, to: 0.5 },
      duration: 720,
      ease: 'Cubic.Out'
    });
  }

  private beginListening(): void {
    if (this.state !== FirstRoomState.KnockSequence) return;

    this.state = FirstRoomState.Listening;
    this.playerTapTimes = [];
    this.input.setDefaultCursor('pointer');
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleRhythmTap, this);
    this.answerTimer = this.time.delayedCall(ANSWER_WINDOW_MS, () => this.startDoorSequence());
  }

  private handleRhythmTap(): void {
    if (this.state !== FirstRoomState.Listening) return;

    const timestamp = this.time.now;
    this.playerTapTimes.push(timestamp);
    this.knockImpulse = this.playerTapTimes.length % 2 === 0 ? 0.38 : -0.38;
    this.showSpark();

    if (this.playerTapTimes.length > 1) {
      const intervalIndex = this.playerTapTimes.length - 2;
      const actualInterval = timestamp - this.playerTapTimes[this.playerTapTimes.length - 2];
      const expectedInterval = KNOCK_INTERVALS_MS[intervalIndex];
      const tolerance = Math.max(230, expectedInterval * 0.3);
      if (Math.abs(actualInterval - expectedInterval) > tolerance) {
        this.failRhythm();
        return;
      }
    }

    if (this.playerTapTimes.length === KNOCK_INTERVALS_MS.length + 1) {
      this.openDoor();
    }
  }

  private failRhythm(): void {
    if (!this.visuals) return;

    this.prototypeAudio.playWrongRhythm();
    this.state = FirstRoomState.KnockSequence;
    this.input.setDefaultCursor('default');
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleRhythmTap, this);
    this.answerTimer?.destroy();
    this.answerTimer = null;
    this.knockImpulse = 1.3;
    this.tweens.add({
      targets: [this.visuals.outerFlame, this.visuals.innerFlame],
      alpha: 0.2,
      duration: 90,
      yoyo: true,
      ease: 'Quad.Out'
    });
    const retryTimer = this.time.delayedCall(1800, () => this.startDoorSequence());
    this.sequenceTimers.push(retryTimer);
  }

  private openDoor(): void {
    if (!this.visuals) return;

    this.clearPuzzleTimers();
    this.state = FirstRoomState.DoorOpening;
    this.input.setDefaultCursor('default');
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleRhythmTap, this);
    this.prototypeAudio.playDoorOpening();
    this.knockImpulse = -0.75;
    this.tweens.killTweensOf(this.visuals.darkness);
    this.tweens.killTweensOf(this.visuals.doorContainer);
    this.tweens.killTweensOf(this.visuals.doorPanel);

    this.tweens.add({
      targets: this.visuals.darkness,
      alpha: 0.7,
      duration: 1800,
      ease: 'Sine.Out'
    });
    this.tweens.add({
      targets: this.visuals.doorContainer,
      alpha: 0.94,
      duration: 900,
      ease: 'Sine.Out'
    });
    this.tweens.add({
      targets: this.visuals.doorPanel,
      scaleX: 0.07,
      x: -95,
      duration: 2400,
      ease: 'Cubic.InOut',
      onComplete: () => {
        this.state = FirstRoomState.DoorOpen;
        this.input.setDefaultCursor('pointer');
      }
    });
  }

  private clearPuzzleTimers(): void {
    this.sequenceTimers.forEach((timer) => timer.destroy());
    this.sequenceTimers = [];
    this.answerTimer?.destroy();
    this.answerTimer = null;
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.visuals || !this.visualFactory) return;
    this.visualFactory.layout(this.visuals, gameSize.width, gameSize.height);
    this.startPrompt?.setPosition(gameSize.width / 2, gameSize.height / 2);
  }

  private updateLighterMotion(visuals: FirstRoomVisuals, time: number, delta: number): void {
    const seconds = time / 1000;
    const baseX = this.scale.width * 0.52;
    const baseY = this.scale.height * 0.87;
    const pointer = this.input.activePointer;
    const targetOffsetX = Phaser.Math.Clamp((pointer.x - this.scale.width / 2) * 0.018, -11, 11);
    const targetOffsetY = Phaser.Math.Clamp((pointer.y - this.scale.height / 2) * 0.012, -6, 6);
    const pointerEase = 1 - Math.exp(-delta * 0.006);
    this.lighterPointerOffsetX = Phaser.Math.Linear(
      this.lighterPointerOffsetX,
      targetOffsetX,
      pointerEase
    );
    this.lighterPointerOffsetY = Phaser.Math.Linear(
      this.lighterPointerOffsetY,
      targetOffsetY,
      pointerEase
    );
    const handSway = Math.sin(seconds * 1.37) * 3.2 + Math.sin(seconds * 0.53) * 1.8;
    const handLift = Math.cos(seconds * 1.09) * 2.1 + Math.sin(seconds * 0.41) * 1.2;
    const lighterX = baseX + handSway + this.lighterPointerOffsetX + this.knockImpulse * 8;
    const horizontalVelocity = lighterX - this.previousLighterX;
    this.previousLighterX = lighterX;

    visuals.lighterContainer
      .setPosition(
        lighterX,
        baseY + handLift + this.lighterPointerOffsetY - Math.abs(this.knockImpulse) * 3
      )
      .setRotation(Math.sin(seconds * 0.82) * 0.018 + this.knockImpulse * 0.035);

    const highFlicker = Math.sin(seconds * 17.3) * 0.055 + Math.sin(seconds * 29.7) * 0.035;
    const slowFlicker = Math.sin(seconds * 3.7) * 0.07;
    const wind = Phaser.Math.Clamp(-horizontalVelocity * 0.055 - this.knockImpulse * 0.34, -0.42, 0.42);
    const flameStretch = 1 + highFlicker + slowFlicker + Math.abs(wind) * 0.15;

    visuals.outerFlame
      .setPosition(wind * 15, -81 + highFlicker * 15)
      .setScale(0.98 - Math.abs(wind) * 0.18, flameStretch)
      .setRotation(wind * 0.72 + highFlicker * 0.3);
    visuals.innerFlame
      .setPosition(1 + wind * 10, -77 + highFlicker * 9)
      .setScale(0.96 - Math.abs(wind) * 0.12, 0.98 + highFlicker + slowFlicker * 0.7)
      .setRotation(wind * 0.58);
    visuals.glow
      .setPosition(wind * 5, -205)
      .setAlpha(0.8 + slowFlicker * 0.45 + highFlicker * 0.25)
      .setScale(1 + slowFlicker * 0.12);

    this.knockImpulse *= Math.pow(0.018, delta / 1000);
  }

  private cleanup(): void {
    this.clearPuzzleTimers();
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleStart, this);
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleRhythmTap, this);
    this.input.keyboard?.off('keydown', this.handleStart, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.prototypeAudio.destroy();
    this.detector.reset();
  }
}
