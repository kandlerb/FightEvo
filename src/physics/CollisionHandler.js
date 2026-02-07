import Matter from 'matter-js';

export class CollisionHandler {
    constructor(physicsWorld) {
        this.physicsWorld = physicsWorld;
        this._platformPassthroughBodies = new Set();

        physicsWorld.onCollisionStart((event) => {
            for (const pair of event.pairs) {
                this._handleCollisionStart(pair);
            }
        });

        physicsWorld.onCollisionEnd((event) => {
            for (const pair of event.pairs) {
                this._handleCollisionEnd(pair);
            }
        });
    }

    _handleCollisionStart(pair) {
        const { bodyA, bodyB } = pair;

        // Foot sensor ground detection
        this._checkFootSensor(bodyA, bodyB);
        this._checkFootSensor(bodyB, bodyA);

        // Wall contact detection
        this._checkWallContact(bodyA, bodyB);
        this._checkWallContact(bodyB, bodyA);
    }

    _handleCollisionEnd(pair) {
        const { bodyA, bodyB } = pair;

        this._checkFootSensorEnd(bodyA, bodyB);
        this._checkFootSensorEnd(bodyB, bodyA);

        this._checkWallContactEnd(bodyA, bodyB);
        this._checkWallContactEnd(bodyB, bodyA);
    }

    _checkFootSensor(sensorBody, otherBody) {
        if (sensorBody.label === 'footSensor' &&
            (otherBody.label === 'ground' || otherBody.label === 'platform')) {
            const fighter = sensorBody.fighter;
            if (fighter) {
                fighter.groundContacts++;
            }
        }
    }

    _checkFootSensorEnd(sensorBody, otherBody) {
        if (sensorBody.label === 'footSensor' &&
            (otherBody.label === 'ground' || otherBody.label === 'platform')) {
            const fighter = sensorBody.fighter;
            if (fighter) {
                fighter.groundContacts = Math.max(0, fighter.groundContacts - 1);
            }
        }
    }

    _checkWallContact(fighterBody, otherBody) {
        if (otherBody.label === 'wall' && fighterBody.label === 'fighter') {
            const fighter = fighterBody.fighter;
            if (fighter) {
                fighter.wallContacts++;
                // Determine which wall
                fighter.wallDirection = otherBody.position.x < fighter.body.position.x ? -1 : 1;
            }
        }
    }

    _checkWallContactEnd(fighterBody, otherBody) {
        if (otherBody.label === 'wall' && fighterBody.label === 'fighter') {
            const fighter = fighterBody.fighter;
            if (fighter) {
                fighter.wallContacts = Math.max(0, fighter.wallContacts - 1);
                if (fighter.wallContacts === 0) {
                    fighter.wallDirection = 0;
                }
            }
        }
    }

    /** Allow a body to pass through platforms (called when jumping up or dropping down) */
    enablePlatformPassthrough(body) {
        this._platformPassthroughBodies.add(body.id);
    }

    disablePlatformPassthrough(body) {
        this._platformPassthroughBodies.delete(body.id);
    }

    isPlatformPassthrough(body) {
        return this._platformPassthroughBodies.has(body.id);
    }
}
