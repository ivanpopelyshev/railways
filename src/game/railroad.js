/**
 * Created by Liza on 20.07.2015.
 */

var pixi = require("pixi.js")
var Point = pixi.Point;
var Rectangle = pixi.Rectangle;
var Rails = require('../game').Rails;


function Railroad(resources, gameRes) {
    pixi.Container.call(this);
    this.resources = resources || {};
    this.gameRes = gameRes;
    this.layer_ = new pixi.Container();
    this.layer0 = new pixi.Graphics();
    this.layer1 = new pixi.Container();
    this.layer2 = new pixi.Graphics();
    this.addChild(this.layer_);
    this.addChild(this.layer0);
    this.addChild(this.layer1);
    this.addChild(this.layer2);
    this.paths = [];
    this.highways = [];
}

Railroad.prototype = Object.create(pixi.Container.prototype);
Railroad.prototype.constructor = Railroad;
module.exports = Railroad;

Railroad.prototype.init = function (builds) {
    this.highways = [];
    while (this.paths.length>0)
        this.paths.pop();
    for (var i=0;i<builds.length && i<4;i++)
        this.add(builds[i]);
};
Railroad.prototype.add = function (build) {
    for (var j=0;j<build.paths.length;j++)
        this.paths.push(build.paths[j]);
    if (build.highway)
        this.highways.push(build.highway);
};

var temp = new Point();

Railroad.prototype.addCurveStroke = function (rails, segment, vs, num, shiftX, shiftY) {
    var gr = this.layer2;
    var len = segment.segmentCount;
    for (var i=len-1; i>=0;i--) {
        segment.getPoint(num, i, temp);
        gr.lineTo(temp.x + shiftX, temp.y+shiftY);
    }
};

Railroad.prototype.addStraightStroke = function (rails, segment, vs, num, shiftX, shiftY) {
    var gr = this.layer2;
    segment.getPoint(num, 0, temp);
    gr.lineTo(temp.x + shiftX, temp.y+shiftY);
};

Railroad.prototype.addCurve = function (rails, angle) {
    var tail = this.tail();
    if (!angle) {
        angle = rails;
        rails = tail.rails;
    }
    var segment = rails.createCurve(tail.endPosition, tail.endAngle, angle);
    this.path.push(segment);
};
Railroad.prototype.addStraight = function (rails, segments) {
    var tail = this.tail();
    if (!segment) {
        segments = rails;
        rails = tail.rails;
    }
    var segment = rails.createStraight(tail.endPosition, tail.endAngle, segments);
    this.path.push(segment);
};
Railroad.prototype.generate = function() {
    //lets do inner
    var gr = this.layer0;
    gr.clear();
    var rails = this.paths[0].rails;
    var vs = rails.visuals["stroke"];

    var shiftX = -this.paths[0].segments[0].startPosition.x;
    gr.position.x = -shiftX;

    var shiftY = 1;
    gr.lineStyle(5, vs.stickColor, 1);
    for (var i=0;i<this.paths.length;i++) {
        var path = this.paths[i];
        var seg = path.segments;
        for (var k=0;k<seg.length;k++) {
            var segment = seg[k];
            for (var j = 0; j <= segment.segmentCount; j++) {
                segment.getPoint(3, j, temp);
                gr.moveTo(temp.x + shiftX, temp.y + shiftY);
                gr.currentPath.shape.closed = false;
                segment.getPoint(4, j, temp);
                gr.lineTo(temp.x + shiftX, temp.y + shiftY);
            }
        }
    }

    this.layer1.removeChildren();
    var highwayTex = this.resources['sprites'].textures['road'];
    for (var i=0;i<this.highways.length;i++) {
        var x = this.highways[i];
        for (var j=0;j<5;j++) {
            var spr = new pixi.Sprite(highwayTex);
            spr.x = x;
            spr.y = j * highwayTex.frame.height;
            this.layer1.addChild(spr);
        }
    }

    gr = this.layer2;
    gr.clear();
    gr.position.x = -shiftX;
    if (this.gameRes.options.backCanvas == 1) {
        shiftY = 1;
        for (var k = 0; k < this.paths.length; k++) {
            var path = this.paths[k];
            var seg = path.segments;
            for (var num = 1; num <= 2; num++) {
                gr.lineStyle(1, 0, 0.5);
                var start = seg[seg.length - 1];
                start.getPoint(num, start.segmentCount, temp);
                gr.moveTo(temp.x + shiftX, temp.y);
                gr.currentPath.shape.closed = false;
                for (var i = seg.length - 1; i >= 0; i--) {
                    var segment = seg[i];
                    if (segment.curve != 0) {
                        this.addCurveStroke(rails, segment, vs, num, shiftX, shiftY)
                    } else {
                        this.addStraightStroke(rails, segment, vs, num, shiftX, shiftY)
                    }
                }
            }
        }
    }

    shiftY=0;
    for (var k=0;k<this.paths.length;k++) {
        var path = this.paths[k];
        var seg = path.segments;
        for (var num = 1; num <= 2; num++) {
            gr.lineStyle(1, 0, 1);
            var start = seg[seg.length-1];
            start.getPoint(num, start.segmentCount, temp);
            gr.moveTo(temp.x + shiftX, temp.y);
            gr.currentPath.shape.closed = false;
            for (var i = seg.length-1; i >= 0; i--) {
                var segment = seg[i];
                if (segment.curve != 0) {
                    this.addCurveStroke(rails, segment, vs, num, shiftX, shiftY)
                } else {
                    this.addStraightStroke(rails, segment, vs, num, shiftX, shiftY)
                }
            }
        }
    }

    //grav
    if (this.gameRes.options.grav != 1) return;
    shiftY=2;
    this.layer_.removeChildren();
    var grav = this.resources['grav'].texture;
    for (var i=0;i<this.paths.length;i++) {
        var path = this.paths[i];
        var seg = path.segments;
        var len = 0;
        var points = [];
        for (var k=0;k<seg.length;k++) {
            var segment = seg[k];
            for (var j = 0; j <= segment.segmentCount; j++) {
                var p = new Point();
                segment.getPoint(0, j, p);
                p.x += shiftX;
                p.y += shiftY;
                if (points.length>=1) {
                    var p2 = points[points.length-1];
                    var len1 = len + Math.sqrt((p2.x - p.x)*(p2.x- p.x) + (p2.y- p.y)*(p2.y- p.y));
                    if (len1 >= grav.width || k == seg.length-1) {
                        if (k == seg.length-1) {
                            len = len1;
                            points.push(p);
                        }
                        var rope = new pixi.mesh.Rope(new pixi.Texture(grav, new Rectangle(0, 0, len, grav.height)), points);
                        rope.position.x = -shiftX;
                        this.layer_.addChild(rope);
                        points = points.slice(points.length-1, points.length);
                        len1 -= len;
                    }
                    len = len1;
                }
                points.push(p);
            }
        }
    }
};
