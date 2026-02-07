import { CONFIG } from '../config.js';

export class Renderer {
    constructor(canvas) {
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;
    }

    render(arenaBodies, testBody) {
        const ctx = this._ctx;

        // Clear
        ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Draw arena geometry
        this._drawBody(ctx, arenaBodies.ground, '#3a3a4a');
        this._drawBody(ctx, arenaBodies.wallLeft, '#3a3a4a');
        this._drawBody(ctx, arenaBodies.wallRight, '#3a3a4a');
        this._drawBody(ctx, arenaBodies.platform, '#5a5a6a');

        // Draw test body (white rectangle)
        if (testBody) {
            this._drawBody(ctx, testBody, '#ffffff');
        }
    }

    _drawBody(ctx, body, color) {
        const vertices = body.vertices;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
    }
}
