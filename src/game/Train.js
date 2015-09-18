/**
 * Created by Liza on 21.07.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;

var Tracker = require('../core').Tracker;

function Train(way, resources) {
    pixi.Container.call(this);
    this.carSize = 90/2;//way.segments[0].rails.scale.x;
    this.offset = 2;
    this.wheels = [];
    this.way = way;
    this.maxVelocity = 100;
    this.velocity = 0;
    this.traction = 2;
    this.traveled = 0;
    this.traveledTime = 0;

    this.resources = resources;

    this.wagon = [];
    var w = 192;
    for (var i=0;i<32;i++) {
        this.wagon.push(new pixi.Texture(resources['wagon'].texture, new pixi.Rectangle((i&7) * w, (i>>3) * w, w, w)));
    }
    this.loco = [];
    for (var i=0;i<32;i++) {
        this.loco.push(new pixi.Texture(resources['loco'].texture, new pixi.Rectangle((i&7) * w, (i>>3) * w, w, w)));
    }
}

Train.prototype = Object.create(pixi.Container.prototype);
Train.prototype.constructor = Train;
module.exports = Train;

Train.prototype.init = function(carCount, options, listener) {
    carCount = carCount || 1;
    var way = this.way;
    for (var i=0;i<carCount; i++) {
        var p = (this.carSize + this.offset) * i + this.carSize / 2;
        this.wheels.push(new Tracker(p - this.carSize / 2, way.segments[0]));
        this.wheels.push(new Tracker(p + this.carSize / 2, way.segments[0]));
    }
    this.cars = [];
    for (var i=0;i<carCount; i++) {
        var spr = new pixi.Sprite((i==0 || i==carCount-1)? this.loco[0]: this.wagon[0]);
        spr.anchor.x = spr.anchor.y = 0.5;
        spr.position.y = -10;
        this.cars.push(spr);
    }
    this.listener = listener;

    this.update(0, options);
}

Train.prototype.sync = function() {
    var rail = this.wheels[0].rail;
    var pos = this.wheels[0].pos;
    for (var i=0;i<this.cars.length; i++) {
        var p = (this.carSize + this.offset) * i + this.carSize / 2;
        this.wheels[i*2].rail = rail;
        this.wheels[i*2].pos = pos + p - this.carSize/2;
        this.wheels[i*2+1].rail = rail;
        this.wheels[i*2+1].pos = pos + p + this.carSize/2;
    }
}


Train.prototype.frontWheel = function() {
    return this.wheels[this.wheels.length-1];
}

Train.prototype.backWheel = function() {
    return this.wheels[0];
}

Train.prototype.update = function (dt, options) {
    this.sync();

    this.maxVelocity = (options.trainMaxSpeed - options.trainStartSpeed ) * Math.min(1, this.traveled / options.trainDistanceBeforeMaxSpeed) + options.trainStartSpeed;
    this.way.level.randomWay = this.maxVelocity >= options.trainRandomWaySpeed;

    this.traveled += dt * this.velocity;
    this.traveledTime += dt;
    for (var i = 0; i<this.cars.length;i++) {
        var car = this.cars[i];
        var back = this.wheels[i*2], front = this.wheels[i*2+1];
        front.move(dt * this.velocity);
        back.move(dt * this.velocity);
        var p1 = front.getPos();
        var p2 = back.getPos();
        car.position.x = (p1.x+p2.x)/2;
        car.position.y = (p1.y+p2.y)/2 - 6;
        if (Math.abs(p2.x-p1.x) + Math.abs(p2.y- p1.y) > 1e-5) {
            var ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            var ang2 = Math.round(ang / (Math.PI / 16));
            ang -= ang2 * (Math.PI/16);
            var ang3 = (ang2 + 72)%32;
            var t = (i==0 || i== this.cars.length-1)?this.loco:this.wagon;
            if (i >= this.cars.length/2)
                car.texture = t[ang3];
            else
                car.texture = t[(ang3+16)%32];
            car.rotation = ang;
        }
    }

    var p = this.coord = this.frontWheel().pos + this.frontWheel().rail.coord;

    var obstacles = this.way.obstacles;
    var acc = this.maxVelocity / this.traction;
    var vel = this.velocity;
    var newVel = Math.min(this.maxVelocity, vel + acc * dt);

    var w = this.backWheel();
    var b = w.pos + w.rail.coord;

    var near = 0, nearDist = 10000;
    for (var i=0;i<obstacles.length;i++){
        var obst = obstacles[i];
        if (obst.state<2) {
            var c = obst.coord - p - 10;
            if (c < nearDist) {
                near = obst;
                nearDist = c;
            }
            if (c <= vel*vel / 2 / acc && (obst.state==0 || c <= vel * obst.timeLeft)) {
                newVel = Math.max(0, Math.min(vel - acc * dt, newVel));
            }
            if (c <= options.showTipDistance && obst.state == 0 && !obst.shown) {
                this.listener && this.listener.onshow(obst);
                obst.shown = true;
            }
        }
        //TODO: move it into RUNNER code
        if (obst.state == 3 && obst.coord + this.carSize *3/5 < b) {
            obst.state = 4;
        }
        if (!obst.shown && obst.state == 5) {
            this.listener && this.listener.onshow(obst);
            obst.shown = true;
        }
        if (obst.state == 4 || obst.state==5) {
            obst.coord = b;
            w.rail.pointAt(w.pos, obst.position);
            if (obst.state == 5 && obst.spr && obst.spr.dieIn < 1e-3) {
                this.listener && this.listener.onend(obst);
            }
        }
    }
    this.velocity = newVel;

    if (newVel < 1e-3 && nearDist < 20) {
        this.listener && this.listener.onend(near);
    }
};
