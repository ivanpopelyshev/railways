/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Game = require('../../core');

function Obstacle(obstacles, resources) {
    pixi.Container.call(this);
    this.obstacles = obstacles;
    this.resources = resources;
    this.semaphor = 0;
    this.layers = [];
    this.dieIn = 10;
    //todo: show graphics
    //todo: interaction
}

Obstacle.prototype = Object.create(pixi.Container.prototype);
Obstacle.prototype.constructor = Obstacle;
module.exports = Obstacle;

Obstacle.prototype.dieIn = 10;
Obstacle.prototype.h = 0;
Obstacle.prototype.iconChildIndex = 1;
Obstacle.prototype.init = function(obst, sprites) {
    this.obst = obst;
    this.sprites = sprites;
    this.postInit();
    return this;
}

Obstacle.prototype.update = function(dt, maxX) {
    var obst = this.obst;
    var train = this.obstacles.train;
    if (obst.highlight) {
        this.sprPointer.texture = this.sprites.textures['pointer2'];
    }
    if (obst.state==0) {
        this.dieIn = (obst.coord - train.coord) / (train.velocity+(1e-6));
    }
    if (obst.state==1) {
        this.updateSprAlpha(dt);
    }
}

Obstacle.prototype.updateSprAlpha = function(dt) {
    var obst = this.obst;
    var spr = this.children[this.iconChildIndex];
    var sprPointer = this.sprPointer;

    spr.alpha = sprPointer.alpha = obst.timeLeft / obst.duration * 0.9 + 0.1;
    obst.timeLeft -= dt;
    if (obst.timeLeft<0) {
        obst.state = 2;
        obst.timeLeft = 0;
        spr.visible = sprPointer.visible = false;
    }
}

Obstacle.prototype.postInit = function() {
    var obst = this.obst;
    obst.spr = this;
    var self = this;

    // add icons
    this.icons = [];
    for(var i=0; i<obst.icons.length; i++) {
        var spr = this.icons[i] = new pixi.Sprite(this.sprites.textures[obst.icons[i]]);
        spr.anchor.x = 0.5;
        spr.anchor.y = 0.5 * spr.texture.width / spr.texture.height;
        spr.scale.x = spr.scale.y = 0.5;
    }

    // add pointer
    var sprPointer = this.sprPointer = new pixi.Sprite(this.sprites.textures[obst.pointerIcon || "pointer"]);
    sprPointer.anchor.x = 0.5;
    sprPointer.anchor.y = 0.5 * sprPointer.texture.width / sprPointer.texture.height;
    sprPointer.scale.x = sprPointer.scale.y = 0.5;
    if (!obst.useHorn)
        sprPointer.interactive = true;
    // events
    function onClick(e) {
        self.click();
    }
    sprPointer.on("click", onClick);
    sprPointer.on("touchstart", onClick);

    this.addChildren();
}

Obstacle.prototype.click = function() {
    var obst = this.obst;
    if (!this.obstacles.onclick(this.obst)) return;
    if (obst.clicked) return;
    obst.clicked = true;
    obst.state++;
    obst.duration = Math.max(obst.duration, this.semaphor);
    obst.timeLeft = obst.duration;
    var sprPointer = this.sprPointer;
    sprPointer.interactive = false;
}

Obstacle.prototype.addChildren = function() {
    this.addChild(this.sprPointer);
    this.addChild(this.icons[0]);

    this.angleTime = 0;
    this.timeIcon = Date.now();
    this.iconIndex = 0;
}

Obstacle.prototype.change = function() {
    var now = Date.now();
    // animate icon
    if (this.icons.length > 1 &&
        now - this.timeIcon > this.obst.iconAnimSpeed / (this.icons.length-1))
    {
        this.timeIcon = now;
        this.iconIndex = (this.iconIndex + 1) % this.icons.length;
        this.removeChildAt(this.iconChildIndex);
        this.addChildAt(this.icons[this.iconIndex], this.iconChildIndex);
    }

    var obst = this.obst;
    var spr = this.children[this.iconChildIndex];
    var sprPointer = this.sprPointer;
    this.position.x = obst.position.x;
    this.position.y = obst.position.y;

    // calculate target angle
    var threshold = 5 + 50;
    var radius = spr.texture.height * spr.scale.y / 2 + this.h * 0.7;
    var leg = this.position.y
            - spr.texture.width * spr.scale.x / 2 // pointer outer part
            - this.h / 2 // object
            - threshold;
    var angle = Math.acos(leg >= radius ? 1 : (leg <= -radius ? -1: leg / radius));

    // update angle
    if (this.angleTime > 0 && leg - radius >= -threshold) {
        var dt = Math.min(now - this.angleTime, 100);
        var increment = dt / 1000;
        this.angle = this.angle < angle
            ? Math.min(angle, this.angle + increment)
            : Math.max(angle, this.angle - increment);
    }else
        this.angle = angle;
    this.angleTime = now;

    // calculate position
    sprPointer.rotation = this.angle;
    spr.position.y = sprPointer.position.y =
            -this.h/2 - radius * Math.cos(this.angle);
    spr.position.x = sprPointer.position.x =
            radius * Math.sin(this.angle);
}

Obstacle.prototype.findShadow = function(_dx) {
    _dx = _dx || 0;
    var obst = this.obst;
    var res = new Point();
    var lvl = obst.way.level;
    var target = null, d = -1;
    var self = this;
    lvl.patches.forEach(function(patch) {
        patch.objects.forEach(function(obj) {
            if (obj.proto.filter<2) return;
            //HACK!!!
            if (obj.scale.x>0.7) return;
            var b = obj.proto.getBounds();
            var x = obj.position.x + (b.x + b.width/2)*obj.scale.x, y = b.y*obj.scale.y + obj.position.y;
            var dx = x - obst.position.x, dy = y - obst.position.y;
            if (dx * _dx >=0 && (target == null || dx*dx+dy*dy<d)) {
                target = obj;
                res.x = x;
                res.y = y;
                d = dx*dx+dy*dy;
            }
        })
    })
    if (target == null) {
        var ang = (Math.random()-0.5)*Math.PI;
        res.x = obst.position.x - Math.cos(ang) * 1000;
        res.y = obst.position.y - Math.sin(ang) * 1000;
    }
    return res;
}
