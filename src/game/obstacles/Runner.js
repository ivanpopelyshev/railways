/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Obstacle = require('./Obstacle');
var Game = require('../../core');
var Human = require('./Human');
var WayTracker = Game.WayTracker;

function Runner(obstacles, resources) {
    Obstacle.call(this, obstacles, resources);
    //this.addChild(pointerSprite);
    //todo: show graphics
    //todo: interaction
}

Runner.prototype = Object.create(Obstacle.prototype);
Runner.prototype.constructor = Runner;
module.exports = Runner;

var eps = 1;
Runner.prototype.postInit = function() {
    var obst = this.obst;
    this.human = new Human().init(this.sprites, 'zaceper');
    this.walkMan = new Human().init(this.sprites, 'zaceper_walk');
    this.hangMan = new pixi.Sprite(this.sprites.textures['zaceper_hang']);
    this.hangMan2 = new pixi.Sprite(this.sprites.textures['zaceper_hang_side']);
    this.hangMan.anchor.x = 0.5;
    this.hangMan.anchor.y = 0.5;
    this.hangMan2.anchor.x = 0.5;
    this.hangMan2.anchor.y = 0.5;
    this.alertBar = new pixi.spine.Spine(this.resources["alertbar"].spineData);
    this.alertBar.autoUpdate = false;
    this.layers.push(this.human.shadow);
    this.layers[0].position = this.position;
    this.layers.push(new pixi.Container());
    this.layers[1].position = this.position;
    this.layers[1].addChild(this.human);
    this.layers.push(new pixi.Container());
    this.layers[2].position = this.position;
    this.h = this.human.frames[0][0].frame.height;
    this.ready = false;
    Obstacle.prototype.postInit.call(this);
    this.removeChildren();

    //generate human textures
}

Runner.prototype.update = function(dt, maxX) {
    var obst = this.obst;
    var train = this.obstacles.train;
    var spr = this.spr;
    var sprPointer = this.sprPointer;
    var human = this.human;

    if (obst.state == 4) {
        if (!this.ready) {
            //this.addChild(this.human);
            var ang = Math.random() * Math.PI - Math.PI / 2;
            this.ready = true;
        }
        var dx = obst.position.x - this.position.x;
        var dy = obst.position.y - this.position.y;
        var D = Math.sqrt(dx * dx + dy * dy);
        dx /= D;
        dy /= D;
        var v = obst.vel * train.maxVelocity * dt;
        if (D >= 1000) v += D - 1000;
        else if (D >= 400) v = D / 400 * v;
        if (D > v) {
            dx *= v;
            dy *= v;
            human.updateSide(dx, dy);
            this.position.x += dx;
            this.position.y += dy;
        } else {
            obst.state = 5;
            this.layers[1].removeChildren();

            var t = Math.abs(dx) >= /*2 **/ Math.abs(dy)? this.hangMan2:this.hangMan;
            this.layers[2].addChild(t);
            t.scale.x = (dx<0 && t == this.hangMan2) ? -1: 1;
            this.addChildren();
            this.addChild(this.alertBar);
            this.alertBar.state.setAnimationByName(0, "animation", false);
            this.alertBar.update(0);
            this.alertBar.position.y = 15;

            this.change();
        }
        human.updateStep(dt * 3);////
        human.updateFrame();
    } else if (obst.state == 5) {
        var dx = obst.position.x - this.position.x;
        var dy = obst.position.y - this.position.y;

        //two seconds for it!
        this.alertBar.update(0.5 * dt);
        var t = Math.abs(dx) >= /*2 **/ Math.abs(dy)? this.hangMan2:this.hangMan;
        if (this.layers[2].children[0] != t) {
            this.layers[2].removeChildren();
            this.layers[2].addChild(t);
        }
        t.scale.x = (dx<0 && t == this.hangMan2) ? -1: 1;

        var tr = this.alertBar.state.tracks[0];
        if (tr) {
            this.dieIn = (1 - tr.time) * 2;
        } else {
            //DIE!
        }
        //human.updateSide(dx, dy);
        human.updateSide(0, -1);
        human.step = 0.5;
        human.updateFrame();
        this.change();
    } else if (obst.state>=6 || obst.state==2) {
        var walkMan = this.walkMan;
        if (obst.state == 6) {
            this.updateSprAlpha(dt);
            this.alertBar.alpha = this.sprPointer.alpha;
            this.alertBar.visible = this.sprPointer.visible;
        }
        if (!this.endPosition) {
            this.layers[2].removeChildren();
            this.layers[1].addChild(walkMan);
            this.endPosition = this.findShadow(-1);
        }
        var dx = this.endPosition.x - this.position.x;
        var dy = this.endPosition.y - this.position.y;
        var D = Math.sqrt(dx * dx + dy * dy);
        var v = obst.walkVel * dt;
        if (D>v) {
            dx *= v / D;
            dy *= v / D;
            this.position.x += dx;
            this.position.y += dy;
            walkMan.updateSide(dx, dy);
            walkMan.updateStep(dt);
        } else {
            walkMan.updateSide(0, 1);
            walkMan.step = 0;
        }
        walkMan.updateFrame();
    }
}

Runner.prototype.change = function() {
    //search object back
    var obst = this.obst;
    if (obst.state >=5) {
        Obstacle.prototype.change.call(this);
        return;
    }
    if (obst.state==4) return;
    var res = this.findShadow(-1);
    var startPosition = this.startPosition = new Point();
    this.position.x = startPosition.x = res.x;
    this.position.y = startPosition.y = res.y;
}
