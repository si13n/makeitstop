import BootScene from './scenes/BootScene';
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game',
  backgroundColor: '#121212',
  scene: [BootScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

export default config;
