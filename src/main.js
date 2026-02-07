import { Game } from './core/Game.js';
import { GameLoop } from './core/GameLoop.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

const loop = new GameLoop({
    update: (dt) => game.update(dt),
    render: (interpolation) => game.render(interpolation),
});

loop.start();
