import BootScene from './scenes/BootScene';
import FirstRoomScene from './scenes/FirstRoomScene';
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game',
  backgroundColor: '#030303',
  scene: [BootScene, FirstRoomScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

export default config;
