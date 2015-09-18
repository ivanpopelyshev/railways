/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Obstacle = require('./Obstacle');
var Game = require('../../core');

function Junk(obstacles, resources) {
    Obstacle.call(this, obstacles, resources);
    //this.addChild(pointerSprite);
    //todo: show graphics
    //todo: interaction
}

Junk.prototype = Object.create(Obstacle.prototype);
Junk.prototype.constructor = Junk;
module.exports = Junk;

Junk.prototype.postInit = function() {
    Obstacle.prototype.postInit.call(this);
    var obst = this.obst;
    this.layers.push(new pixi.Container());
    var junk = this.junk = new pixi.Sprite(this.sprites.textures['junk']);
    this.layers.push(junk);
    junk.anchor.x = 0.5;
    junk.anchor.y = 0.7;
    junk.position = this.position;
    this.h = junk.texture.frame.height * junk.anchor.y;
}

Junk.prototype.update = function(dt, maxX) {
    Obstacle.prototype.update.call(this, dt, maxX);
    this.junk.alpha = this.sprPointer.alpha;
    this.junk.visible = this.sprPointer.visible;
}
