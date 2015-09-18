/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Obstacle = require('./Obstacle');
var Game = require('../../core');
var Human2 = require('./Human2');
var WayTracker = Game.WayTracker;

function Kids(obstacles, resources) {
    Obstacle.call(this, obstacles, resources);
    this.flatLayers = [[], [], [], []];
    //this.addChild(pointerSprite);
    //todo: show graphics
    //todo: interaction
}

Kids.prototype = Object.create(Obstacle.prototype);
Kids.prototype.constructor = Kids;
module.exports = Kids;

var eps = 1;
Kids.prototype.postInit = function() {
    var obst = this.obst;
    this.h = 50;
    this.humans = [];
    for (var i=0;i<obst.humanCount; i++) {
        var human = new Human2().init(this.sprites, obst.humanModels[Math.random() * obst.humanModels.length | 0])
        this.flatLayers[0].push(human.shadow);
        this.humans.push(human);
    }
    this.ball = new Ball().init(this.sprites, "ball2");
    this.flatLayers[0].push(this.ball.shadow);
    Obstacle.prototype.postInit.call(this);
    //generate human textures
}

var wl = [];


Kids.prototype.update = function(dt, maxX) {
    var ball = this.ball;
    var obst = this.obst;
    var humans = this.humans;
    if (this.ball.flyTime == 0) {
        if (obst.state>=1) {
            if (!this.ready) {
                this.ready = true;
                var p = this.findShadow(1);
                ball.nextPos(p, 1.5);

                var tracker = new WayTracker(obst.way, obst.coord);
                tracker.move(0);
                var x1 = tracker.position.x, y1 = tracker.position.y;
                tracker.move(1);
                var x2 = tracker.position.x, y2 = tracker.position.y;
                var dx = y1-y2, dy = x2-x1;
                var D = Math.sqrt(dx*dx+dy*dy);
                dx/=D; dy/=D;

                for (var i=0;i<humans.length;i++) {
                    var x = humans[i].position.x;
                    var y = humans[i].position.y;
                    var sgn = dx * (x - obst.x) + dy * (y - obst.y)<=0?1:-1;
                    dx *= sgn;
                    dy *= sgn;
                    humans[i].way.push( {x : x + dx * obst.vel, y : y + dy * obst.vel} );
                    humans[i].vel = obst.vel;
                }
            }
        }  else {
            //do fly!
            ball.nextPos({
                x: this.base.x + (Math.random() - 0.5) * obst.radius,
                y: this.base.y + (Math.random() - 0.5) * obst.radius
            }, Math.random()*0.2 + 0.9);

            var k = Math.random() * humans.length | 0;
            var human = humans[k];
            var dx = ball.endPos.x - humans[k].position.x;
            var dy = ball.endPos.y - humans[k].position.y;
            var D = Math.sqrt(dx * dx + dy * dy);
            human.vel = Math.min(obst.vel, D * 1.2 / ball.flyDuration);
            human.way.push(ball.endPos);
        }
    }
    ball.updateFly(dt);
    ball.setLayer(this.flatLayers[1], this.flatLayers[3],
        this.obstacles.layers[1], this.obstacles.layers[3]);
    for (var i=0;i<humans.length;i++) {
        var human = humans[i];
        human.updateWalk(dt);
        human.setLayer(this.flatLayers[1], this.flatLayers[3],
            this.obstacles.layers[1], this.obstacles.layers[3]);
    }
    this.semaphor = ball.flyDuration;
    if (wl.length > humans.length - obst.walkingCount) {
        wl[Math.random() * wl.length|0].state += 2;
    }
    Obstacle.prototype.update.call(this, dt, maxX);
}

Kids.prototype.change = function() {
    Obstacle.prototype.change.call(this);
    var humans = this.humans;
    var obst = this.obst;
    var ball = this.ball;
    this.base = {
        x: obst.position.x,
        y: obst.position.y
    };
    ball.setPos({x: this.base.x + (Math.random() - 0.5) * obst.radius,
        y: this.base.y + (Math.random() - 0.5) * obst.radius});
    for (var i=0;i<humans.length;i++) {
        var human = humans[i];
        human.setPos({x: this.base.x + (Math.random() - 0.5) * obst.radius,
            y: this.base.y + (Math.random() - 0.5) * obst.radius}, obst.vel);
        human.setLayer(this.flatLayers[1], this.flatLayers[2],
            this.obstacles.layers[1], this.obstacles.layers[2]);
    }
}

function Ball() {
    pixi.Container.call(this);
}


Ball.prototype = Object.create(pixi.Container.prototype);
Ball.prototype.constructor = Ball;

Ball.prototype.init = function(sprites, prefix) {
    this.shadow = new pixi.Sprite(sprites.textures['shadow']);
    this.shadow.anchor.x = 0.5;
    this.shadow.position = this.position;

    var spr = this.spr = new pixi.Sprite(sprites.textures[prefix]);
    spr.anchor.x = 0.5;
    spr.anchor.y = 1;
    this.addChild(spr);

    this.flyTime = this.flyDuration = 0;
    return this;
}

Ball.prototype.setPos = function(pos) {
    this.startPos = pos;
    this.position.x = pos.x;
    this.position.y = pos.y;
}

Ball.prototype.nextPos = function(pos, time) {
    this.flyTime = time;
    this.flyDuration = time;
    this.flyHeight = (time-1) * 10 + 50;
    this.endPos = pos;
}

Ball.prototype.updateFly = function(dt) {
    if (this.flyTime > 0) {
        this.flyTime -= dt;
        if (this.flyTime <= 0) {
            this.flyTime = 0;
            this.startPos = this.endPos;
        }
        var u = 1.0 - this.flyTime / this.flyDuration;
        this.position.x = this.startPos.x + (this.endPos.x - this.startPos.x) * u;
        this.position.y = this.startPos.y + (this.endPos.y - this.startPos.y) * u;
        this.spr.position.y = -this.flyHeight * (1.0 - (u-0.5)*(u-0.5) * 4);
    } else {
        //nothing
    }
}

Ball.prototype.setLayer = Human2.prototype.setLayer;
