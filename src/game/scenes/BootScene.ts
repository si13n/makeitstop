import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.input.setDefaultCursor('default');
    this.scene.start('FirstRoomScene');
  }
}
