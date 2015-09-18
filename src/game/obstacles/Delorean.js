/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Obstacle = require('./Obstacle');
var Game = require('../../core');
var FutureCar = require('./FutureCar');
var WayTracker = Game.WayTracker;

function Delorean(obstacles, resources) {
    Obstacle.call(this, obstacles, resources);
    //todo: show graphics
    //todo: interaction
}

Delorean.prototype = Object.create(Obstacle.prototype);
Delorean.prototype.constructor = Delorean;
module.exports = Delorean;

var eps = 1;
Delorean.prototype.postInit = function() {
    var obst = this.obst;
    var car = this.car = new FutureCar().init(this.sprites, this.resources, obst.carModels[Math.random() * obst.carModels.length | 0]);
    this.layers.push(new pixi.Container());
    this.layers.push(new pixi.Container());
    this.layers.push(new pixi.Container());
    this.layers[1].position = this.position;
    this.layers[1].addChild(this.car);
    this.h = this.car.frames[0].frame.height*0.9;
    this.tracker = new WayTracker(obst.way, obst.coord).move(0);
    this.tracker2 = new WayTracker(obst.way, obst.coord).move(eps);
    this.vel = 0;
    this.trail = 0;

    this.emitter = new cloudkid.Emitter(this.layers[0], [this.resources['particle'].texture], {
        "alpha": {
            "start": 1,
            "end": 0
        },
        "scale": {
            "start": 0.07,
            "end": 0.2,
            "minimumScaleMultiplier": 0.5
        },
        "color": {
            "start": "#fff191",
            "end": "#ff622c"
        },
        "speed": {
            "start": 10,
            "end": 20
        },
        "acceleration": {
            "x": 0,
            "y": 0
        },
        "startRotation": {
            "min": 265,
            "max": 275
        },
        "rotationSpeed": {
            "min": 50,
            "max": 50
        },
        "lifetime": {
            "min": 0.3,
            "max": 0.6
        },
        "blendMode": "normal",
        "frequency": 0.001,
        "emitterLifetime": -1,
        "maxParticles": 1000,
        "pos": {
            "x": 0,
            "y": 0
        },
        "addAtBack": false,
        "spawnType": "point"
    });

    var self = this;
    this.emitter._spawnFunc = function(p, emitPosX, emitPosY, i) {
        var t = self.tracker, t2 = self.tracker2;
        t2.copy(t);
        var dist = Math.random() * self.trail;
        t2.move(dist);

        //set the initial rotation/direction of the particle based on starting
        //particle angle and rotation of emitter
        if (this.minStartRotation == this.maxStartRotation)
            p.rotation = this.minStartRotation + this.rotation;
        else
            p.rotation = Math.random() * (this.maxStartRotation - this.minStartRotation) + this.minStartRotation + this.rotation;
        t2.rail.pointAtRail(t2.pos - t2.rail.coord, 1 + (Math.random()*2|0), p.position);
    };

    this.emitters = [];
    this.createBigEmitter();
    this.createBoomEmitter();

    Obstacle.prototype.postInit.call(this);
}

Delorean.prototype.createBigEmitter = function() {
    this.bigEmitter = new cloudkid.Emitter(this.layers[2], [this.resources['particle'].texture], {
        "alpha": {
        "start": 0.59,
            "end": 0
    },
        "scale": {
        "start": 0.4,
            "end": 0.2,
            "minimumScaleMultiplier": 1
    },
        "color": {
        "start": "#e4f9ff",
            "end": "#473dff"
    },
        "speed": {
        "start": 200,
            "end": 50
    },
        "acceleration": {
        "x": 0,
            "y": 0
    },
        "startRotation": {
        "min": 0,
            "max": 360
    },
        "rotationSpeed": {
        "min": 0,
            "max": 0
    },
        "lifetime": {
        "min": 0.2,
            "max": 0.3
    },
        "blendMode": "add",
        "frequency": 0.001,
        "emitterLifetime": -1,
        "maxParticles": 500,
        "pos": {
        "x": 0,
            "y": 0
    },
        "addAtBack": false,
        "spawnType": "circle",
        "spawnCircle": {
        "x": 0,
            "y": 0,
            "r": 0
    }
    });
}

Delorean.prototype.createBoomEmitter = function() {
    this.boomEmitter = new cloudkid.Emitter(this.layers[2], [this.resources['particle'].texture], {
        "alpha": {
            "start": 0.74,
            "end": 0
        },
        "scale": {
            "start": 2,
            "end": 0.6,
            "minimumScaleMultiplier": 0.1
        },
        "color": {
            "start": "#bab8b4",
            "end": "#1c1b19"
        },
        "speed": {
            "start": 700,
            "end": 0
        },
        "acceleration": {
            "x": 0,
            "y": 0
        },
        "startRotation": {
            "min": 0,
            "max": 360
        },
        "rotationSpeed": {
            "min": 0,
            "max": 200
        },
        "lifetime": {
            "min": 0.2,
            "max": 0.5
        },
        "blendMode": "normal",
        "ease": [
            {
                "s": 0,
                "cp": 0.329,
                "e": 0.548
            },
            {
                "s": 0.548,
                "cp": 0.767,
                "e": 0.876
            },
            {
                "s": 0.876,
                "cp": 0.985,
                "e": 1
            }
        ],
        "frequency": 0.001,
        "emitterLifetime": 0.1,
        "maxParticles": 100,
        "pos": {
            "x": 0,
            "y": 0
        },
        "addAtBack": true,
        "spawnType": "point"
    });
}

Delorean.prototype.createBlueEmitter = function() {
    var t = this.tracker, t2 = this.tracker2;
    return new cloudkid.Emitter(this.layers[2], [this.resources['particle'].texture], {
        "alpha": {
            "start": 1,
            "end": 0
        },
        "scale": {
            "start": 0.1,
            "end": 0.01,
            "minimumScaleMultiplier": 1
        },
        "color": {
            "start": "#e4f9ff",
            "end": "#3fcbff"
        },
        "speed": {
            "start": 200,
            "end": 50
        },
        "acceleration": {
            "x": 0,
            "y": 0
        },
        "startRotation": {
            "min": 0,
            "max": 360
        },
        "rotationSpeed": {
            "min": 0,
            "max": 0
        },
        "lifetime": {
            "min": 0.2,
            "max": 0.8
        },
        "blendMode": "normal",
        "frequency": 0.02,
        "emitterLifetime": 1,
        "maxParticles": 100,
        "pos": {
            "x": t2.position.x,
            "y": t2.position.y
        },
        "addAtBack": false,
        "spawnType": "burst",
        "particlesPerWave": 4,
        "particleSpacing": 0.1,
        "angleStart": this.car.helpRotation * 180 / Math.PI + 180 + (Math.random() * 60-30)
    });

}

Delorean.prototype.update = function(dt, maxX) {
    var obst = this.obst;
    var train = this.obstacles.train;
    var t = this.tracker, t2 = this.tracker2;
    var emitters = this.emitters;
    if (obst.state==0) {
        //stay
    } else if (obst.state==1) {
        this.bigEmitter.update(dt);
        for (var i=0;i<emitters.length;i++) {
            t2.copy(t);
            t2.move(10);
            emitters[i].updateSpawnPos(t2.position.x, t2.position.y);
            emitters[i].update(dt);
        }
        var tt = (obst.duration - obst.timeLeft) * (obst.duration - obst.timeLeft);
        this.bigEmitter.startSpeed = tt*40 + 50;
        while (emitters.length<tt) {
            emitters.push(this.createBlueEmitter());
        }

        this.vel = Math.min(this.vel + dt * obst.vel / obst.duration, obst.vel);
        t.move(dt * this.vel);
        //this.car.spr.alpha = Math.min(1.0, Math.sqrt(obst.timeLeft));
        if (obst.timeLeft<0.1) {
            this.boomEmitter.update(dt);
        }
        this.change();
    } else {
        this.boomEmitter.update(dt);
        this.trail = Math.min(100, this.trail + dt * obst.vel);
        this.bigEmitter.emit = false;
        this.bigEmitter.update(dt);
        while (emitters.length>0) {
            emitters.pop().cleanup();
        }
        this.emitter.update(dt);
        if (this.layers[1].children.length > 0) {
            this.layers[1].removeChildren();
        }
    }
    Obstacle.prototype.update.call(this, dt, maxX);
    this.car.updateFrame();
}

Delorean.prototype.change = function() {
    Obstacle.prototype.change.call(this);
    var obst = this.obst;
    var t = this.tracker, t2 = this.tracker2;
    t.move(0);
    t2.copy(t).move(eps);
    var dx = t2.position.x - t.position.x, dy = t2.position.y - t.position.y;
    this.car.updateSide(dx, dy);
    obst.coord = t.pos;
    obst.position.x = t.position.x;
    obst.position.y = t.position.y;
    this.emitter.updateSpawnPos(t.position.x, t.position.y);
    this.boomEmitter.updateSpawnPos(t.position.x, t.position.y);
    t2.move(14);
    this.bigEmitter.updateSpawnPos(t2.position.x, t2.position.y);
}
