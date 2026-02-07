import { Game } from './core/Game.js';
import { GameLoop } from './core/GameLoop.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
const loop = new GameLoop(game);

loop.start();
