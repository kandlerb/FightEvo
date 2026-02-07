// Node.js verification test for game physics and logic
// Tests without browser since headless Chromium canvas is broken in this env

const fs = require('fs');
const path = require('path');

// Load Matter.js as a global (same as browser would)
global.Matter = require('./lib/matter.min.js');

console.log('=== Fight EVO - Phase 1 Verification ===\n');

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
    if (condition) {
        console.log(`  PASS: ${name}${detail ? ' — ' + detail : ''}`);
        passed++;
    } else {
        console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`);
        failed++;
    }
}

// --- Test 1: CONFIG values ---
console.log('1. Config values');
const configSource = fs.readFileSync(path.join(__dirname, 'src/config.js'), 'utf8');
check('CONFIG has GRAVITY: 1.5', configSource.includes('GRAVITY: 1.5'));
check('CONFIG has GROUND_FRICTION: 0.05', configSource.includes('GROUND_FRICTION: 0.05'));
check('CONFIG has AIR_FRICTION: 0.01', configSource.includes('AIR_FRICTION: 0.01'));
check('CONFIG has MOVE_SPEED: 5', configSource.includes('MOVE_SPEED: 5'));
check('CONFIG has JUMP_FORCE: -12', configSource.includes('JUMP_FORCE: -12'));
check('CONFIG has FLOAT_GRAVITY_MULT: 0.3', configSource.includes('FLOAT_GRAVITY_MULT: 0.3'));
check('CONFIG has FAST_FALL_GRAVITY_MULT: 2.5', configSource.includes('FAST_FALL_GRAVITY_MULT: 2.5'));
check('CONFIG has AIR_CONTROL: 0.6', configSource.includes('AIR_CONTROL: 0.6'));
check('CONFIG has FAST_FALL_AIR_CONTROL: 0.4', configSource.includes('FAST_FALL_AIR_CONTROL: 0.4'));
check('CONFIG has JUMP_BUFFER: 6', configSource.includes('JUMP_BUFFER: 6'));
check('CONFIG has COYOTE_TIME: 6', configSource.includes('COYOTE_TIME: 6'));
check('CONFIG has CANVAS_WIDTH: 960', configSource.includes('CANVAS_WIDTH: 960'));
check('CONFIG has CANVAS_HEIGHT: 540', configSource.includes('CANVAS_HEIGHT: 540'));
check('CONFIG has PLAYER_HP: 100', configSource.includes('PLAYER_HP: 100'));

// --- Test 2: Matter.js physics simulation ---
console.log('\n2. Physics engine');

const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.5 } });

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const GROUND_HEIGHT = 40;
const WALL_WIDTH = 20;

const ground = Matter.Bodies.rectangle(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT - GROUND_HEIGHT / 2,
    CANVAS_WIDTH, GROUND_HEIGHT,
    { isStatic: true, friction: 0.05, label: 'ground' }
);

const wallLeft = Matter.Bodies.rectangle(
    WALL_WIDTH / 2, CANVAS_HEIGHT / 2,
    WALL_WIDTH, CANVAS_HEIGHT,
    { isStatic: true, label: 'wallLeft' }
);

const wallRight = Matter.Bodies.rectangle(
    CANVAS_WIDTH - WALL_WIDTH / 2, CANVAS_HEIGHT / 2,
    WALL_WIDTH, CANVAS_HEIGHT,
    { isStatic: true, label: 'wallRight' }
);

const platformY = CANVAS_HEIGHT - CANVAS_HEIGHT * 0.6;
const platform = Matter.Bodies.rectangle(
    CANVAS_WIDTH / 2, platformY,
    200, 12,
    { isStatic: true, friction: 0.05, label: 'platform' }
);

const testBody = Matter.Bodies.rectangle(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100,
    30, 70,
    { inertia: Infinity, inverseInertia: 0, friction: 0.05, frictionAir: 0.01, label: 'testBody' }
);

Matter.Composite.add(engine.world, [ground, wallLeft, wallRight, platform, testBody]);

check('Engine created', !!engine);
check('World has 5 bodies', Matter.Composite.allBodies(engine.world).length === 5,
    `found ${Matter.Composite.allBodies(engine.world).length}`);
check('Ground is static', ground.isStatic === true);
check('Walls are static', wallLeft.isStatic && wallRight.isStatic);
check('Platform is static', platform.isStatic === true);
check('Test body is dynamic', testBody.isStatic === false);
check('Test body has infinite inertia', testBody.inertia === Infinity);

// --- Test 3: Physics simulation ---
console.log('\n3. Gravity and collision');

const initialY = testBody.position.y;
check('Test body starts above ground', initialY < CANVAS_HEIGHT - GROUND_HEIGHT,
    `y=${initialY.toFixed(1)}`);

const FIXED_DT = 1000 / 60;
for (let i = 0; i < 120; i++) {
    Matter.Engine.update(engine, FIXED_DT);
}

const finalY = testBody.position.y;
const groundTop = CANVAS_HEIGHT - GROUND_HEIGHT;
const bodyHalfHeight = 35;

check('Test body fell due to gravity', finalY > initialY,
    `start=${initialY.toFixed(1)}, end=${finalY.toFixed(1)}`);
check('Test body landed on ground (not through)', finalY < groundTop,
    `bodyY=${finalY.toFixed(1)}, groundTop=${groundTop}`);
// Body may land on platform (y=216) or ground depending on spawn position
const platformSurface = platformY - 6; // platform half-height
const expectedOnPlatform = Math.abs(finalY - (platformSurface - bodyHalfHeight)) < 5;
const expectedOnGround = Math.abs(finalY - (groundTop - bodyHalfHeight)) < 5;
check('Test body resting on surface', expectedOnPlatform || expectedOnGround,
    `bodyY=${finalY.toFixed(1)}, platformLanding~=${(platformSurface - bodyHalfHeight).toFixed(1)}, groundLanding~=${(groundTop - bodyHalfHeight).toFixed(1)}`);
check('Test body did not rotate', Math.abs(testBody.angle) < 0.001,
    `angle=${testBody.angle}`);
check('Test body at rest', Math.abs(testBody.velocity.y) < 0.5,
    `vy=${testBody.velocity.y.toFixed(3)}`);

// --- Test 4: Arena geometry ---
console.log('\n4. Arena geometry');

check('Ground at bottom center',
    Math.abs(ground.position.x - CANVAS_WIDTH / 2) < 1 &&
    Math.abs(ground.position.y - (CANVAS_HEIGHT - GROUND_HEIGHT / 2)) < 1);
check('Left wall at left edge', Math.abs(wallLeft.position.x - WALL_WIDTH / 2) < 1);
check('Right wall at right edge', Math.abs(wallRight.position.x - (CANVAS_WIDTH - WALL_WIDTH / 2)) < 1);
check('Platform centered horizontally', Math.abs(platform.position.x - CANVAS_WIDTH / 2) < 1);
check('Platform at ~60% height', Math.abs(platform.position.y - platformY) < 1,
    `y=${platform.position.y.toFixed(1)}`);

// --- Test 5: Platform one-way collision ---
console.log('\n5. One-way platform logic');

const arenaSource = fs.readFileSync(path.join(__dirname, 'src/arena/Arena.js'), 'utf8');
check('Arena has collision disable logic', arenaSource.includes('pair.isActive = false'));
check('Arena checks position vs platform', arenaSource.includes('platformTop'));
check('Arena uses collisionActive event', arenaSource.includes('collisionActive'));

// --- Test 6: GameLoop ---
console.log('\n6. GameLoop');

const gameLoopSource = fs.readFileSync(path.join(__dirname, 'src/core/GameLoop.js'), 'utf8');
check('Uses requestAnimationFrame', gameLoopSource.includes('requestAnimationFrame'));
check('Fixed timestep 1000/60', gameLoopSource.includes('1000 / 60'));
check('Accumulator pattern', gameLoopSource.includes('accumulator'));
check('Calls update callback', gameLoopSource.includes('this._update('));
check('Calls render callback', gameLoopSource.includes('this._render('));
check('Has start() method', gameLoopSource.includes('start()'));
check('Calculates interpolation', gameLoopSource.includes('interpolation'));
check('Spiral-of-death guard', gameLoopSource.includes('Math.min'));

// --- Test 7: PhysicsWorld ---
console.log('\n7. PhysicsWorld');

const physicsSource = fs.readFileSync(path.join(__dirname, 'src/physics/PhysicsWorld.js'), 'utf8');
check('Wraps Matter.Engine', physicsSource.includes('Matter.Engine.create'));
check('Has step()', physicsSource.includes('step('));
check('Has addBody()', physicsSource.includes('addBody('));
check('Has removeBody()', physicsSource.includes('removeBody('));
check('Has getEngine()', physicsSource.includes('getEngine('));
check('Has getWorld()', physicsSource.includes('getWorld('));
check('No Matter.Runner', !physicsSource.includes('Matter.Runner'));
check('Uses CONFIG.GRAVITY', physicsSource.includes('CONFIG.GRAVITY'));

// --- Test 8: Game.js ---
console.log('\n8. Game.js');

const gameSource = fs.readFileSync(path.join(__dirname, 'src/core/Game.js'), 'utf8');
check('Creates PhysicsWorld', gameSource.includes('new PhysicsWorld'));
check('Creates Arena', gameSource.includes('new Arena'));
check('Creates Renderer', gameSource.includes('new Renderer'));
check('Creates 30x70 test body', gameSource.includes('30') && gameSource.includes('70'));
check('Test body: inertia Infinity', gameSource.includes('inertia: Infinity'));
check('update() steps physics', gameSource.includes('step('));
check('render() calls renderer', gameSource.includes('_renderer.render('));

// --- Test 9: Renderer ---
console.log('\n9. Renderer');

const rendererSource = fs.readFileSync(path.join(__dirname, 'src/rendering/Renderer.js'), 'utf8');
check('Gets 2D context', rendererSource.includes("getContext('2d')"));
check('Clears canvas', rendererSource.includes('clearRect'));
check('Draws vertices', rendererSource.includes('vertices'));
check('Uses CONFIG dimensions', rendererSource.includes('CONFIG.CANVAS_WIDTH'));
check('Draws ground', rendererSource.includes('ground'));
check('Draws walls', rendererSource.includes('wallLeft') && rendererSource.includes('wallRight'));
check('Draws platform', rendererSource.includes('platform'));
check('Draws test body', rendererSource.includes('testBody'));
check('Ground/walls dark gray', rendererSource.includes('#3a3a4a'));
check('Platform lighter', rendererSource.includes('#5a5a6a'));
check('Test body white', rendererSource.includes('#ffffff'));

// --- Test 10: File structure ---
console.log('\n10. File structure');

const requiredFiles = [
    'index.html',
    'src/main.js',
    'src/config.js',
    'src/core/GameLoop.js',
    'src/core/Game.js',
    'src/physics/PhysicsWorld.js',
    'src/arena/Arena.js',
    'src/rendering/Renderer.js',
];

for (const file of requiredFiles) {
    check(`${file} exists`, fs.existsSync(path.join(__dirname, file)));
}

// --- Test 11: index.html ---
console.log('\n11. index.html');

const htmlSource = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
check('Has canvas element', htmlSource.includes('<canvas'));
check('Has gameCanvas id', htmlSource.includes('id="gameCanvas"'));
check('Loads Matter.js', htmlSource.includes('matter'));
check('Loads main.js as module', htmlSource.includes('type="module"') && htmlSource.includes('src/main.js'));

// --- Test 12: Module structure ---
console.log('\n12. Module imports');

const mainSource = fs.readFileSync(path.join(__dirname, 'src/main.js'), 'utf8');
check('main.js imports Game', mainSource.includes("import { Game }"));
check('main.js imports GameLoop', mainSource.includes("import { GameLoop }"));
check('main.js calls start()', mainSource.includes('.start()'));
check('No Matter.js imports in src',
    !physicsSource.includes("import Matter") &&
    !arenaSource.includes("import Matter") &&
    !gameSource.includes("import Matter"),
    'Matter.js used as global');

// --- Summary ---
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} checks ===`);

if (failed > 0) {
    process.exit(1);
}
