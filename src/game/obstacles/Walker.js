/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Obstacle = require('./Obstacle');
var Game = require('../../core');
var Human = require('./Human');
var WayTracker = Game.WayTracker;

function Walker(obstacles, resources) {
    Obstacle.call(this, obstacles, resources);
    //this.addChild(pointerSprite);
    //todo: show graphics
    //todo: interaction
}

Walker.prototype = Object.create(Obstacle.prototype);
Walker.prototype.constructor = Walker;
module.exports = Walker;

var eps = 1;
Walker.prototype.postInit = function() {
    var obst = this.obst;
    var human = this.human = new Human().init(this.sprites, obst.humanModels[Math.random() * obst.humanModels.length | 0]);
    this.layers.push(human.shadow);
    this.layers[0].position = this.position;
    this.layers.push(new pixi.Container());
    this.layers[1].position = this.position;
    this.layers[1].addChild(this.human);
    this.h = this.human.frames[0][0].frame.height*0.9;
    this.tracker = new WayTracker(obst.way, obst.coord).move(0);
    this.tracker2 = new WayTracker(obst.way, obst.coord).move(eps);
    Obstacle.prototype.postInit.call(this);
    //generate human textures
}

Walker.prototype.update = function(dt, maxX) {
    if (this.position.x >= maxX) {
        Obstacle.prototype.update.call(this, dt, maxX);
        return;
    }
    var obst = this.obst;
    var train = this.obstacles.train;
    var t = this.tracker, t2 = this.tracker2;
    var walk = this.dieIn >= train.traction*1.1 && obst.coord - train.coord > 20;
    if (obst.state==0) {
        if (walk) {
            t.move(dt * obst.vel);
            t2.copy(this.tracker).move(eps);
            var dx = t2.position.x - t.position.x, dy = t2.position.y - t.position.y;
            obst.coord = t.pos;
            obst.position.x = t.position.x;
            obst.position.y = t.position.y;
            this.change();
            this.human.updateSide(dx, dy);
        }
    } else if (obst.state==1) {
        if (!this.sgn) this.sgn = (Math.random()*2|0) * 2 - 1;
        var dx = t2.position.y - t.position.y, dy = -t2.position.x + t.position.x;
        dx *= this.sgn;
        dy *= this.sgn;
        var D = Math.sqrt(dx*dx+dy*dy);
        dx/=D; dy/=D;
        obst.position.x = obst.position.x + dx * dt * obst.vel*5;
        obst.position.y = obst.position.y + dy * dt * obst.vel*5;
        this.change();
        this.human.updateSide(dx, dy);
    }
    Obstacle.prototype.update.call(this, dt, maxX);
    if (obst.state==0 && walk || obst.state==1)
        this.human.updateStep(dt);
    else this.human.step = 0;
    this.human.updateFrame();
}
