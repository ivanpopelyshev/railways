/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Obstacle = require('./Obstacle');
var Game = require('../../core');
var Human2 = require('./Human2');

function PathWay(obstacles, resources) {
    Obstacle.call(this, obstacles, resources);
    this.flatLayers = [[], [], [], []];
    //this.addChild(pointerSprite);
    //todo: show graphics
    //todo: interaction
}

PathWay.prototype = Object.create(Obstacle.prototype);
PathWay.prototype.constructor = PathWay;
module.exports = PathWay;

var eps = 1;
PathWay.prototype.postInit = function() {
    var obst = this.obst;
    this.humans = [];
    for (var i=0;i<obst.humanCount; i++) {
        var human = new Human2().init(this.sprites, obst.humanModels[Math.random() * obst.humanModels.length | 0])
        this.flatLayers[0].push(human.shadow);
        this.humans.push(human);
    }
    Obstacle.prototype.postInit.call(this);
    //generate human textures
}

var wl = [];


PathWay.prototype.update = function(dt, maxX) {
    var humans = this.humans;
    var obst = this.obst;
    var base = this.base;
    var platforms = obst.platforms;
    while (wl.length>0) wl.pop();
    this.semaphor = 0;
    for (var i=0;i<humans.length;i++) {
        var human = humans[i];
        if (human.way.length==0) {
            if (human.state<2) {
                wl.push(human);
            } else {
                var p = obst.ways[(obst.state >= 1 ?2:0) + (human.state%2==1)];
                if (!p) {
                    //no way, sorry
                    continue;
                }
                if (human.position.x == p[0].x + base.x && human.position.y == p[0].y + base.y) {
                    human.state -= 2;
                    human.state ^= 1;
                    for (var i = 1; i < p.length; i++)
                        human.way.push(p[i]);
                    var plat = platforms[human.state];
                    human.way.push({x: plat.x + (Math.random()*plat.w|0),
                        y: plat.y + (Math.random()*plat.h|0)});
                } else {
                    human.way.push(p[0]);
                }
            }
        } else if (human.way.length>1) {
            this.semaphor = Math.max(this.semaphor, human.timeLeft);
        }
        human.updateWalk(dt);
        human.setLayer(this.flatLayers[1], this.flatLayers[3],
            this.obstacles.layers[1], this.obstacles.layers[3]);
    }
    if (wl.length > humans.length - obst.walkingCount) {
        wl[Math.random() * wl.length|0].state += 2;
    }
    Obstacle.prototype.update.call(this, dt, maxX);
}

PathWay.prototype.change = function() {
    Obstacle.prototype.change.call(this);
    var humans = this.humans;
    var obst = this.obst;
    var platforms = obst.platforms;


    this.base = {
        x: obst.position.x,
        y: obst.position.y
    }
    //TODO: RAILS.SCALE.X
    this.base.x -= obst.railPos * 3;

    for (var i=0;i<humans.length;i++) {
        var human = humans[i];
        var state = Math.random()*platforms.length|0;
        var plat = platforms[state];
        human.setPos({x: plat.x + (Math.random()*plat.w|0),
            y: plat.y + (Math.random()*plat.h|0)}, obst.vel, state, this.base);
        human.setLayer(this.flatLayers[1], this.flatLayers[2],
            this.obstacles.layers[1], this.obstacles.layers[2]);
    }
}
