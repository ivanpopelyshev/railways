/**
 * Created by Liza on 18.08.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Rectangle = pixi.Rectangle;
var Game = require('../../core');

function Human() {
    pixi.Container.call(this);
    //todo: show graphics
    //todo: interaction
    this.side = 0;
    this.step = 0;
}

Human.prototype = Object.create(pixi.Container.prototype);
Human.prototype.constructor = Human;
module.exports = Human;

Human.prototype.init = function(sprites, prefix) {
    var frames;
    sprites.humans = sprites.humans || {}
    if (!sprites.humans[prefix]) {
        //caching human textures
        frames = this.frames = sprites.humans[prefix] = [];
        function add(s) {
            var res = [];
            for (var i=0;i<4;i++) {
                var w = s.frame.width;
                var rect = new Rectangle(s.frame.x + w * i/4, s.frame.y, w/4, s.frame.height);
                var tex = new pixi.Texture(s.baseTexture, rect);
                res.push(tex);
            }
            frames.push(res);
        }
        add(sprites.textures[prefix+"_bottom"]);
        add(sprites.textures[prefix+"_side"]);
        add(sprites.textures[prefix+"_top"]);
        var s = sprites.textures[prefix+"_stand"];
        if (s) frames.push(s);
    } else
        frames = this.frames = sprites.humans[prefix];

    this.shadow = new pixi.Sprite(sprites.textures['shadow']);
    this.shadow.anchor.x = 0.5;
    this.shadow.position = this.position;

    var spr = this.spr = new pixi.Sprite(frames[0][0]);
    spr.anchor.x = 0.5;
    spr.anchor.y = 0.8;
    this.addChild(spr);
    return this;
}

Human.prototype.updateStep = function(dt) {
    this.step += dt;
}

Human.prototype.updateSide = function(dx, dy) {
    dx = dx || 0;
    dy = dy || 0;
    if (Math.abs(dx) <= Math.abs(dy)*2) {
        if (dy>=0) {
            this.side = 0;
        } else this.side = 2;
    } else if (dx>=0) {
        this.side = 3;
    } else this.side = 1;
}

Human.prototype.updateFrame = function() {
    var row = this.side;
    var sgn = 1;
    if (this.side==3) {
        row = 1;
        sgn = -sgn;
    }
    this.spr.scale.x = sgn;
    if (this.step==0 && this.frames.length==4) {
        this.spr.texture = this.frames[3];
    } else
        this.spr.texture = this.frames[row][(this.step%1 * 4)|0];
}
