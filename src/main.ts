import './styles/main.css';
import Phaser from 'phaser';
import gameConfig from './game/config';

declare global {
  interface Window {
    __PHASER_GAME__?: Phaser.Game;
  }
}

if (!window.__PHASER_GAME__) {
  window.__PHASER_GAME__ = new Phaser.Game(gameConfig);
} else {
  // Avoid creating multiple game instances during HMR/dev reloads
  // eslint-disable-next-line no-console
  console.warn('Phaser game instance already exists.');
}
