/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Rectangle = pixi.Rectangle;
var Game = require('../../core');
var Obstacle = require('./Obstacle');

function FutureCar() {
    Obstacle.call(this);
}

FutureCar.prototype = Object.create(Obstacle.prototype);
FutureCar.prototype.constructor = FutureCar;
module.exports = FutureCar;

FutureCar.prototype.init = function(sprites, resources, prefix) {
    var frames;
    sprites.cars = sprites.cars || {};
    if (!sprites.cars[prefix]) {
        //caching human textures
        frames = this.frames = sprites.cars[prefix] = [];
        var s = resources[prefix].texture;
        var w = 64;
        for (var i=0;i<32;i++) {
            var rect = new Rectangle((i&7)*w, (i>>3)*w, w, w);
            frames.push(new pixi.Texture(s, rect));
        }
    } else
        frames = this.frames = sprites.cars[prefix];
    var spr = this.spr = new pixi.Sprite(frames[0]);
    spr.anchor.x = 0.5;
    spr.anchor.y = 0.5;
    spr.position.y = -6;
    this.addChild(spr);
    return this;
}

FutureCar.prototype.updateSide = function(dx, dy) {
    if (Math.abs(dx)+Math.abs(dy)<1e-4) return;
    var ang = this.helpRotation = Math.atan2(dy, dx);
    var ang2 = Math.round(ang / (Math.PI / 16));
    ang -= ang2 * (Math.PI/16);
    var ang3 = (ang2 + 72)%32;
    this.spr.texture = this.frames[this.side = ang3];
    this.spr.rotation = ang;
}

FutureCar.prototype.updateFrame = function() {
}
