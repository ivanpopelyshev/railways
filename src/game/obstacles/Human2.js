/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Rectangle = pixi.Rectangle;
var Human = require('./Human');
var Game = require('../../core');

function Human2() {
    Human.call(this);
    //todo: show graphics
    //todo: interaction
    this.timeLeft = 0;
}

Human2.prototype = Object.create(Human.prototype);
Human2.prototype.constructor = Human2;
module.exports = Human2;

Human2.prototype.setPos = function(position, vel, state, base) {
    this.base = base = (base || {x: 0, y: 0});
    this.position.x = base.x + position.x;
    this.position.y = base.y + position.y;
    this.vel = vel;
    this.state = state;
    this.way = [];
    this.z = 0;
    return this;
}

Human2.prototype.setLayer = function(layer0, layer1, layer20, layer21) {
    var l = this.z>0?layer1:layer0;
    var l2 = this.z>0?layer21:layer20;
    if (l!=this.layer) {
        if (this.layer) {
            this.layer.splice(this.layer.indexOf(this), 1);
            this.layer2.removeChild(this);
        }
        this.layer = l;
        this.layer2 = l2;
        this.layer.push(this);
        this.layer2.addChild(this);
    }
}

Human2.prototype.updateWalk = function(dt) {
    var v = this.vel * dt;
    var base = this.base;
    var flag = true;
    this.timeLeft = 0;
    while (this.way.length>0 && v>0) {
        flag = false;
        var w = this.way[0];
        var dx = w.x + base.x - this.position.x;
        var dy = w.y + base.y - (this.position.y + this.z);
        var dz = (w.z || 0) - this.z;
        var D = Math.sqrt(dx*dx+dy*dy + dz * dz);
        if (D<=v){
            this.z = (w.z || 0);
            this.position.x = w.x + base.x;
            this.position.y = w.y + base.y - this.z;
            this.way.shift();
            v -= D;
        } else {
            this.timeLeft = D / this.vel;
            this.position.x += dx * v / D;
            this.position.y += dy * v / D - dz * v / D;
            this.z += dz * v / D;
            v = 0;
        }
        this.updateSide(dx, dy);
    }
    if (flag && this.way.length == 0) {
        this.updateSide(0, 1);
        this.step = 0;
    } else
        this.updateStep(dt);
    this.updateFrame();
}
