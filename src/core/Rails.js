/**
 * Created by Liza on 20.07.2015.
 */
var Point = require('./pixi/Point');
var Rectangle = require('./pixi/Rectangle');
var FieldObject = require('./FieldObject');
var Segment = require('./Segment');

function Rails(radius, scale, grad, w, h) {
    if (radius) this.init(radius, scale, grad, w, h);
}

Rails.prototype = {
    init: function(radius, scale, grad, w, h) {
        //for visual representation: collection of resource names, anchor points and scales
        this.radius = radius = radius || 72;
        this.grad = grad = grad || 8;
        this.w = w || 3;
        this.h = h || (radius * Math.PI * 2 / grad);
        this.rr = [radius, radius - w, radius + w, radius -w*2, radius + w*2];
        this.scale = scale = scale || new Point(1, 2/3);
        this.angles = [];
        //равномерная сетка, но можно сделать свою
        for (var i=0;i<grad;i++) {
            var a = i / grad * 2 * Math.PI;
            //this.angles.push(180 / Math.PI * Math.atan2(Math.sin(a) * scale.y / scale.x, Math.cos(a)));
            this.angles.push(a);
        }
        this.visuals = {};

        this.radii = [];
        for (var j=0; j<this.rr.length;j++) {
            this.radii.push([]);
        }
        for (var i=0;i<grad;i++) {
            var ang = this.angles[i];
            var cosa = Math.cos(ang);
            var sina = Math.sin(ang);
            for (var j=0;j<this.rr.length;j++) {
                var r = this.rr[j];
                this.radii[j].push(this.roundPoint(r * cosa, r * sina));
            }
        }
    },
    incrementId: 0,
    roundPoint: function(x, y) {
        //return new Point(Math.round(x * this.scale.x), Math.round(y * this.scale.y));
        return new Point(x * this.scale.x, y * this.scale.y);
    },
    createStraight: function(startPosition, startAngle, len, seg) {
        seg = seg || new Segment();
        seg.init(this);

        var scale = this.scale;
        seg.segmentCount = Math.round(len / this.h);
        seg.curve = 0;
        if (seg.segmentCount<1) seg.segmentCount = 1;
        var ang = (this.angles[startAngle] + Math.PI/2) ;
        var cosa = Math.cos(ang);
        var sina = Math.sin(ang);
        seg.startPosition.x = startPosition.x;
        seg.startPosition.y = startPosition.y;
        seg.startAngle = startAngle;
        seg.endPosition.x = startPosition.x + len * cosa * scale.x;
        seg.endPosition.y = startPosition.y + len * sina * scale.y;
        seg.endAngle = startAngle;
        seg.pos = seg.len = len;
        seg.id = ++this.incrementId;
        return seg;
    },
    createCurve: function(startPosition, startAngle, deltaAngle, seg) {
        seg = seg || new Segment();
        seg.init(this);

        var scale = this.scale;
        seg.startAngle = startAngle;
        var endAngle = seg.endAngle = (startAngle + deltaAngle + this.grad) % this.grad;
        var curve = seg.curve = deltaAngle>0?1:-1;
        if (deltaAngle == 0) throw "curve deltaAngle must != 0";
        seg.centerPosition.x = startPosition.x - this.radii[0][startAngle].x * curve;
        seg.centerPosition.y = startPosition.y - this.radii[0][startAngle].y * curve;
        seg.startPosition.x = startPosition.x;
        seg.startPosition.y = startPosition.y;
        seg.endPosition.x = startPosition.x - (this.radii[0][startAngle].x - this.radii[0][endAngle].x) * curve;
        seg.endPosition.y = startPosition.y - (this.radii[0][startAngle].y - this.radii[0][endAngle].y) * curve;
        seg.segmentCount = Math.abs(deltaAngle);
        var tt = this.angles[endAngle] - this.angles[startAngle];
        if (curve<0) tt = -tt;
        if (tt<0) tt+=2 * Math.PI;
        seg.pos = seg.len = this.radius * tt;
        seg.id = ++this.incrementId;
        return seg;
    },
    addVisualStroke: function(obj) {
        this.visuals["stroke"] = obj;
    },
    toJson: function() {
        return {
            radius: this.radius,
            scale: this.scale,
            grad: this.grad,
            w: this.w,
            h: this.h
        }
    },
    fromJson: function(json) {
        this.init(json.radius, json.scale, json.grad, json.w, json.h);
        return this;
    }
};

module.exports = Rails;
