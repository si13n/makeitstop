import Phaser from 'phaser';

export interface RapidMouseMovementOptions {
  minimumHorizontalDistance: number;
  horizontalToVerticalRatio: number;
  requiredDirectionChanges: number;
  activeWindowMs: number;
  maximumPauseMs: number;
}

const DEFAULT_OPTIONS: RapidMouseMovementOptions = {
  minimumHorizontalDistance: 42,
  horizontalToVerticalRatio: 1.5,
  requiredDirectionChanges: 6,
  activeWindowMs: 1200,
  maximumPauseMs: 300
};

type HorizontalDirection = -1 | 1;

interface ValidMovement {
  direction: HorizontalDirection;
  timestamp: number;
  magnitude: number;
}

export default class RapidMouseMovementDetector {
  private readonly options: RapidMouseMovementOptions;
  private validMovements: ValidMovement[] = [];
  private lastX: number | null = null;
  private lastY: number | null = null;
  private lastTimestamp: number | null = null;
  private segmentDirection: HorizontalDirection | null = null;
  private segmentStartedAt: number | null = null;
  private segmentHorizontalDistance = 0;
  private segmentVerticalDistance = 0;
  private triggered = false;

  constructor(options: Partial<RapidMouseMovementOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get progress(): number {
    return this.validMovements.length;
  }

  get direction(): HorizontalDirection | null {
    return this.segmentDirection;
  }

  reset(): void {
    this.validMovements = [];
    this.lastX = null;
    this.lastY = null;
    this.lastTimestamp = null;
    this.segmentDirection = null;
    this.segmentStartedAt = null;
    this.segmentHorizontalDistance = 0;
    this.segmentVerticalDistance = 0;
    this.triggered = false;
  }

  handlePointerMove(pointer: Phaser.Input.Pointer): boolean {
    if (this.triggered) return false;

    const timestamp = performance.now();
    if (this.lastX === null || this.lastY === null || this.lastTimestamp === null) {
      this.storePointer(pointer, timestamp);
      return false;
    }

    if (timestamp - this.lastTimestamp > this.options.maximumPauseMs) {
      this.clearGesture();
      this.storePointer(pointer, timestamp);
      return false;
    }

    const deltaX = pointer.x - this.lastX;
    const deltaY = pointer.y - this.lastY;
    this.storePointer(pointer, timestamp);

    if (deltaX === 0) {
      this.segmentVerticalDistance += Math.abs(deltaY);
      return false;
    }

    const direction: HorizontalDirection = deltaX > 0 ? 1 : -1;
    if (this.segmentDirection === null) {
      this.beginSegment(direction, deltaX, deltaY, timestamp);
      return false;
    }

    if (direction === this.segmentDirection) {
      this.segmentHorizontalDistance += Math.abs(deltaX);
      this.segmentVerticalDistance += Math.abs(deltaY);
      this.pruneOldMovements(timestamp);
      return false;
    }

    const completedDirection = this.segmentDirection;
    const completedMagnitude = this.segmentHorizontalDistance;
    const segmentDuration = timestamp - (this.segmentStartedAt ?? timestamp);
    const segmentIsValid =
      completedMagnitude >= this.options.minimumHorizontalDistance &&
      completedMagnitude >= this.segmentVerticalDistance * this.options.horizontalToVerticalRatio &&
      segmentDuration <= this.options.maximumPauseMs;

    this.beginSegment(direction, deltaX, deltaY, timestamp);
    if (!segmentIsValid) {
      this.validMovements = [];
      return false;
    }

    const previous = this.validMovements[this.validMovements.length - 1];
    if (previous?.direction === completedDirection) this.validMovements = [];

    this.validMovements.push({
      direction: completedDirection,
      timestamp,
      magnitude: completedMagnitude
    });
    this.pruneOldMovements(timestamp);

    if (this.validMovements.length >= this.options.requiredDirectionChanges) {
      this.triggered = true;
      return true;
    }

    return false;
  }

  private storePointer(pointer: Phaser.Input.Pointer, timestamp: number): void {
    this.lastX = pointer.x;
    this.lastY = pointer.y;
    this.lastTimestamp = timestamp;
  }

  private beginSegment(
    direction: HorizontalDirection,
    deltaX: number,
    deltaY: number,
    timestamp: number
  ): void {
    this.segmentDirection = direction;
    this.segmentStartedAt = timestamp;
    this.segmentHorizontalDistance = Math.abs(deltaX);
    this.segmentVerticalDistance = Math.abs(deltaY);
  }

  private pruneOldMovements(timestamp: number): void {
    const earliestTimestamp = timestamp - this.options.activeWindowMs;
    this.validMovements = this.validMovements.filter(
      (movement) => movement.timestamp >= earliestTimestamp
    );
  }

  private clearGesture(): void {
    this.validMovements = [];
    this.segmentDirection = null;
    this.segmentStartedAt = null;
    this.segmentHorizontalDistance = 0;
    this.segmentVerticalDistance = 0;
  }
}
