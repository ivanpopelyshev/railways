/**
 * Created by Liza on 20.07.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Rails = require('../core').Rails;


function SwitchActor(way, pointerTexture) {
    pixi.Container.call(this);
    this.way = way;
    this.paths = [];

    this.track=[[], [], []];
    this.fillPrevious(this.track[0], way.railFrom, way.posFrom);
    this.fillNext(this.track[1], way.railFrom.next, way.posFrom);
    this.fillNext(this.track[2], way.railTo, 0);

    var graphics = this.graphics = new pixi.Graphics();
    this.fillGraphics();

    if (pointerTexture) {
        var pointerSprite = this.pointerSprite = new pixi.Sprite(pointerTexture);
        pointerSprite.position = way.railTo.startPosition;
        pointerSprite.anchor.x = 0.5;
        pointerSprite.anchor.y = 1.25;
        pointerSprite.scale.x = 0.4;
        pointerSprite.scale.y = 0.4;

        pointerSprite.interactive = true;
        var self = this;
        pointerSprite.on("click", function (e) {
            self.way.enabled = !self.way.enabled;
            self.fillGraphics();
        });
    }

    this.addChild(graphics);
    //this.addChild(pointerSprite);
    //todo: show graphics
    //todo: interaction
}

SwitchActor.prototype = Object.create(pixi.Container.prototype);
SwitchActor.prototype.constructor = SwitchActor;
module.exports = SwitchActor;

SwitchActor.prototype.fillPrevious = function(pos, rail, posFrom) {
    //var seg = ((posFrom - (rail.pos - rail.len - rail.path.pos)) / rail.len * rail.segments) | 0;
    var seg = rail.segmentCount;
    while (pos.length < 10 && rail!=null) {
        for (var i = seg; i >= 0 && pos.length < 10; i--) {
            var p = new Point();
            rail.getPoint(1, i, p);
            pos.push(p);
            p = new Point();
            rail.getPoint(2, i, p);
            pos.push(p);
        }
        rail = rail.prev;
        if (rail!=null)
            seg = rail.segmentCount-1;
    }
}


SwitchActor.prototype.fillNext = function(pos, rail, posFrom) {
    //var seg = ((posFrom - (rail.pos - rail.len - rail.path.pos)) / rail.len * rail.segments) | 0;
    var seg = 0;
    while (pos.length < 10 && rail!=null) {
        for (var i = seg; i <= rail.segmentCount && pos.length < 10; i++) {
            var p = new Point();
            rail.getPoint(1, i, p);
            pos.push(p);
            p = new Point();
            rail.getPoint(2, i, p);
            pos.push(p);
        }
        seg = 0;
        rail = rail.next;
    }
};

SwitchActor.prototype.fillGraphics = function() {
    var gr = this.graphics;
    function drawTrack(tr) {
        gr.moveTo(tr[0].x, tr[0].y);
        gr.currentPath.shape.closed = false;
        for (var i=2;i<tr.length;i+=2)
            gr.lineTo(tr[i].x, tr[i].y);
        gr.moveTo(tr[1].x, tr[1].y);
        gr.currentPath.shape.closed = false;
        for (var i=3;i<tr.length;i+=2)
            gr.lineTo(tr[i].x, tr[i].y);
    }
    gr.clear();
    var x = this.way.enabled?2:1;
    //gr.lineStyle(1, 0xff0000, 1);
    //drawTrack(this.track[3-x]);
    gr.lineStyle(1, 0x00FFFF, 1);
    drawTrack(this.track[0]);
    drawTrack(this.track[x]);
}
