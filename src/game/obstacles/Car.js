/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Rectangle = pixi.Rectangle;
var Game = require('../../core');
var Obstacle = require('./Obstacle');

function Car() {
    Obstacle.call(this);
}

Car.prototype = Object.create(Obstacle.prototype);
Car.prototype.constructor = Car;
module.exports = Car;

Car.prototype.init = function(sprites, prefix) {
    var frames;
    sprites.cars = sprites.cars || {}
    if (!sprites.cars[prefix]) {
        //caching human textures
        frames = this.frames = sprites.cars[prefix] = [];
        var s = sprites.textures[prefix];
        var w = s.frame.width;
        var rect = new Rectangle(s.frame.x, s.frame.y, w/2, s.frame.height);
        var tex = new pixi.Texture(s.baseTexture, rect);
        frames.push(tex);
        rect = new Rectangle(s.frame.x + w/2, s.frame.y, w/2, s.frame.height);
        tex = new pixi.Texture(s.baseTexture, rect);
        frames.push(tex);
    } else
        frames = this.frames = sprites.cars[prefix];
    var spr = this.spr = new pixi.Sprite(frames[0]);
    spr.anchor.x = 0.5;
    spr.anchor.y = 0.5;
    this.addChild(spr);
    return this;
}

Car.prototype.updateSide = function(dx, dy) {
    dy = dy || 0;
    if (dy>0) this.side = 0;
    else if (dy<0) this.side = 1;
}

Car.prototype.updateFrame = function() {
    this.spr.texture = this.frames[this.side];
}
