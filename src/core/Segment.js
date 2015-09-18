/**
 * Created by Liza on 02.08.2015.
 */

var Point = require('./pixi/Point');
var Rectangle = require('./pixi/Rectangle');

function Segment() {
    this.centerPosition = new Point();
    this.startPosition = new Point();
    this.endPosition = new Point();
}

var temp = new Point(), temp2 = new Point();
module.exports = Segment;

Segment.prototype = {
    id: 0,
    curve: 0,
    len: 0,
    segmentCount: 0,
    rails: 0,
    prev: 0,
    next: 0,
    nextPos: 0,
    centerPosition: new Point(),
    startPosition: new Point(),
    endPosition: new Point(),
    startAngle: 0,
    endAngle: 0,
    isEnd : false,
    highwayPos: 0,
    init: function(rails) {
        this.rails = rails;
        this.positions = null;
        this.bounds = null;
        this.cells = null;
        this.prev = null;
        this.pos = 0;

        this.path = null;
        this.pathIndex = 0;
        this.nextPos = 0;
        this.next = null;
        this.isEnd = false;
        this.mapObj = null;
        this.highwayPos = 0;
    },
    copy: function(seg) {
        this.init(seg.rails);
        this.centerPosition.x = seg.centerPosition.x;
        this.centerPosition.y = seg.centerPosition.y;
        this.startPosition.x = seg.startPosition.x;
        this.startPosition.y = seg.startPosition.y;
        this.endPosition.x = seg.endPosition.x;
        this.endPosition.y = seg.endPosition.y;
        this.len = seg.len;
        this.curve = seg.curve;
        this.segmentCount = seg.segmentCount;
        this.startAngle = seg.startAngle;
        this.endAngle = seg.endAngle;
        this.id = seg.id;
        this.pos = seg.pos;
        this.mapObj = seg.mapObj;
        this.highwayPos = seg.highwayPos;

    },
    clone: function(seg) {
        var seg = new Segment();
        seg.copy(this);
        return seg;
    },
    isTangent: function() {
        return this.curve != 0;
    },
    pointAt: function(param, p3) {
        var rails = this.rails;
        p3 = p3 || new Point();
        var radius = rails.radius, scale = rails.scale;
        if (param<0) param = 0;
        if (param > this.len) param = this.len;
        var s = param / this.len;
        if (this.curve == 0) {
            //straight
            var p1 = this.startPosition, p2 = this.endPosition;
            p3.x = p1.x + (p2.x-p1.x) * s;
            p3.y = p1.y + (p2.y-p1.y) * s;
            return p3;
        } else {
            var p = this.centerPosition;
            var ang = rails.angles[this.startAngle] + this.curve * (param / radius);
            if (this.curve<0) ang += Math.PI;
            p3.x = p.x + Math.cos(ang) * radius * scale.x;
            p3.y = p.y + Math.sin(ang) * radius * scale.y;
            return p3;
        }
    },
    pointAtRail: function(param, num, p3) {
        p3 = p3 || new Point();
        if (param<0) param = 0;
        if (param > this.len) param = this.len;
        var s = param / this.len;
        var seg = this.segmentCount * s | 0;
        if (seg >= this.segmentCount) seg = this.segmentCount - 1;
        var s2 = this.segmentCount * s - seg;
        this.getPoint(num, seg, temp);
        this.getPoint(num, seg+1, temp2);
        p3.x = temp.x * (1-s2) + temp2.x * s2;
        p3.y = temp.y * (1-s2) + temp2.y * s2;
        return p3;
    },
    fillPositions: function(pos, startFrom) {
        startFrom = startFrom || 0;
        var startAngle = this.startAngle;
        var startPosition = this.startPosition;
        var centerPosition = this.centerPosition;
        var len = this.len;
        var segmentCount = this.segmentCount;
        var rails = this.rails;
        var scale = rails.scale;
        var radii = rails.radii;
        var grad = rails.grad;
        var curve = this.curve;
        if (curve==0) {
            var ang = (rails.angles[startAngle] + Math.PI/2);
            var cosa = Math.cos(ang);
            var sina = Math.sin(ang);
            for (var j=startFrom;j<5;j++) {
                var sx = startPosition.x - radii[0][startAngle].x + radii[j][startAngle].x;
                var sy = startPosition.y - radii[0][startAngle].y + radii[j][startAngle].y;
                var dx = len / segmentCount * cosa * scale.x;
                var dy = len / segmentCount * sina * scale.y;
                for (var i=0;i<=segmentCount;i++) {
                    pos.push(sx);
                    pos.push(sy);
                    sx += dx;
                    sy += dy;
                }
            }
        } else {
            for (var j=startFrom;j<5;j++) {
                var sx = centerPosition.x;
                var sy = centerPosition.y;
                var jj = j;
                if (curve<0 && j>0) {
                    if (j%2==1) jj++;
                    else jj--;
                }
                for (var i=0;i<=segmentCount;i++) {
                    var ang = (startAngle + i * curve + grad*7/4 + curve * grad/4) % grad;
                    pos.push(sx + radii[jj][ang].x);
                    pos.push(sy + radii[jj][ang].y);
                }
            }
        }
        return pos;
    },
    getPoint : function(ind1, ind2, point) {
        if (!this.positions) {
            this.positions = this.fillPositions([]);
        }
        point.x = this.positions[(ind1*(this.segmentCount+1) + ind2)*2];
        point.y = this.positions[(ind1*(this.segmentCount+1) + ind2)*2+1];
    },
    calcBounds: function() {
        if (!this.bounds) this.bounds = new Rectangle();
        var p = this.startPosition;
        var minX = p.x, maxX = p.x, minY = p.y, maxY = p.y;
        var segmentCount = this.segmentCount;
        var pos = this.positions;
        for (var j=3; j<5; j++)
            for (var i = segmentCount; i>=0; i--) {
                this.getPoint(j, i, temp);
                minX = Math.min(minX, temp.x);
                maxX = Math.max(maxX, temp.x);
                minY = Math.min(minY, temp.y);
                maxY = Math.max(maxY, temp.y);
            }
        var bounds = this.bounds;
        bounds.x = minX;
        bounds.y = minY;
        bounds.width = maxX - minX;
        bounds.height = maxY - minY;
    },
    getBounds: function() {
        if (!this.bounds) {
            this.calcBounds();
        }
        return this.bounds;
    },
    intersectRect: function(rect) {
        var segmentCount = this.segmentCount;
        for (var j=3; j<5; j++)
            for (var i = segmentCount; i>=0; i--) {
                this.getPoint(j, i, temp);
                if (rect.contains(temp.x, temp.y))
                    return true;
            }
        return false;
    },
    liesInRect: function(rect) {
        var segmentCount = this.segmentCount;
        for (var j=3; j<5; j++)
            for (var i = segmentCount; i>=0; i--) {
                this.getPoint(j, i, temp);
                if (!rect.contains(temp.x, temp.y))
                    return false;
            }
        return true;
    },
    toJson: function() {
        return [ this.id, this.centerPosition.x, this.centerPosition.y, this.startPosition.x, this.startPosition.y,
            this.endPosition.x, this.endPosition.y, this.len, this.curve, this.segmentCount, this.startAngle, this.endAngle, this.pos,
            this.highwayPos];
    },
    fromJson: function(json, path) {
        this.init(path.rails);
        this.path = path;
        this.id = json[0];
        this.centerPosition.x = json[1];
        this.centerPosition.y = json[2];
        this.startPosition.x = json[3];
        this.startPosition.y = json[4];
        this.endPosition.x = json[5];
        this.endPosition.y = json[6];
        this.len = json[7];
        this.curve = json[8];
        this.segmentCount = json[9];
        this.startAngle = json[10];
        this.endAngle = json[11];
        this.pos = json[12];
        this.highwayPos = json[13];
        return this;
    },
    saveBin: function (buffer) {
        buffer.writeInt(this.id);
        buffer.writeFloat(this.startPosition.x);
        buffer.writeFloat(this.startPosition.y);
        buffer.writeInt(this.startAngle);
        var delta = (this.endAngle - this.startAngle + this.rails.grad) % this.rails.grad;
        if (this.curve<0) delta = delta - this.rails.grad;
        buffer.writeInt(delta);
        buffer.writeFloat(this.len);
        buffer.writeFloat(this.pos);
        buffer.writeFloat(this.highwayPos);
    },
    loadBin: function(buffer, path) {
        var id = buffer.readInt();
        this.startPosition.x = buffer.readFloat();
        this.startPosition.y = buffer.readFloat();
        var startAngle = buffer.readInt();
        var delta = buffer.readInt();
        var len = buffer.readFloat();
        if (delta == 0) {
            path.rails.createStraight(this.startPosition, startAngle, len, this);
        } else {
            path.rails.createCurve(this.startPosition, startAngle, delta, this);
        }
        this.path = path;
        this.id = id;
        this.pos = buffer.readFloat();
        this.highwayPos = buffer.readFloat();
        return this;
    }
};
