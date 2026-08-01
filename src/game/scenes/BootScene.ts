import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Intentionally left empty for the empty starter project
  }

  create(): void {
    const title = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 12, 'Point-and-Click Adventure', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '32px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 24, 'Empty project', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
        color: '#cccccc'
      })
      .setOrigin(0.5);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const width = gameSize?.width ?? this.scale.width;
      const height = gameSize?.height ?? this.scale.height;
      title.setPosition(width / 2, height / 2 - 12);
      subtitle.setPosition(width / 2, height / 2 + 24);
    });
  }
}
