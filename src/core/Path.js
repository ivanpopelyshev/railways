var Point = require('./pixi/Point');
var Rails = require('./Rails');
var Segment = require('./Segment');
var Switch = require('./Switch');
var FieldObject = require('./FieldObject');

function Path() {
    this.segments = [];
    this.waysIn = [];
    this.waysOut = [];
};

Path.prototype = {
    id: 0,
    length: 0,
    headPos: 0,
    rails: null,
    head: null,
    mergesTo: null,
    segPool: [],
    isStart: function() {
        return this.head.path == this;
    },
    clear: function() {
        var seg = this.segments;
        while (seg.length>0) seg.pop();
        if (this.head && this.head.path == this) {
            this.length = this.head.len;
        } else
            this.length = 0;
        this.isEnd = null;
        this.mergesTo = null;
        while (this.waysIn.length>0)
            this.waysIn.pop();
        while (this.waysOut.length>0)
            this.waysOut.pop();
    },
    cutHead: function() {
        if (this.head.path == this) return;
        this.head.path = this;
        this.head.prev = null;
        this.segments.unshift(this.head);
        this.length += this.head.len;
    },
    tail: function(index) {
        var ind = this.segments.length-1-(index|0);
        return ind>=0 ? this.segments[ind]: this.head;
    },
    init1: function(rails, startPosition, startAngle, startLen) {
        this.id = ++rails.incrementId;
        var seg = this.segments;
        while (seg.length>0) seg.pop();
        this.clear();
        this.rails = rails;
        this.head = rails.createStraight(startPosition, startAngle, startLen || rails.h, this.segPool.length > 0 ? this.segPool.pop() : null);
        this.head.path = this;
        seg.push(this.head);
        this.length = this.head.len;
        return this;
    },
    check: function() {
       /* for (var i=0;i<this.waysOut.length;i++) {
            var way = this.waysOut[i];
            if (way.railFrom.endPosition.x != way.railTo.startPosition.x) {
                console.log("derping");
            }
        }*/
    },
    init2: function(prevPath, rail, pos) {
        var seg = this.segments;
        while (seg.length>0) seg.pop();
        this.head = rail || prevPath.tail();
        this.headPos = pos || 0;
        this.rails = prevPath.rails;
        this.id = ++this.rails.incrementId;
        return this;
    },
    add: function(rail) {
        var seg = this.segments;
        rail.prev = this.tail();
        rail.path = this;
        rail.pathIndex = seg.length;
        rail.pos = rail.prev.pos + rail.len;
        this.length += rail.len;
        seg.push(rail);
    },
    addCurve: function(angle) {
        var tail = this.tail();
        var r = this.rails.createCurve(tail.endPosition, tail.endAngle, angle, this.segPool.length>0?this.segPool.pop(): null);
        this.add(r);
        return r;
    },
    addStraight: function(segments) {
        var tail = this.tail();
        var r = this.rails.createStraight(tail.endPosition, tail.endAngle, segments, this.segPool.length>0?this.segPool.pop(): null);
        this.add(r);
        return r;
    },
    pop: function() {
        var tail = this.segments.pop();
        this.length -= tail.len;
        tail.init(null);
        this.segPool.push(tail);
    },
    canPop: function() {
        return this.segments.length > 1 || this.segments.length == 1 && !this.isStart();
    },
    clone: function() {
        var b = new Path();
        b.id = this.id;
        b.rails = this.rails;
        var seg = this.segments;
        for (var i=0;i<seg.length;i++) {
            var segment = seg[i].clone();
            segment.path = b;
            b.segments.push(segment);
        }
        b.head = this.isStart()? b.segments[0]: this.head;
        for (var i=0;i<this.waysIn.length;i++) {
            var oldWay = this.waysIn[i];
            var newWay = oldWay.clone();
            newWay.pathTo = b;
            //newWay.railTo = b.segments[oldWay.railTo.pathIndex];
            b.waysIn.push(newWay);
        }
        for (var i=0;i<this.waysOut.length;i++) {
            var oldWay = this.waysOut[i];
            var newWay = oldWay.clone();
            newWay.pathFrom = b;
            //newWay.railFrom = b.segments[oldWay.railFrom.pathIndex];
            b.waysOut.push(newWay);
        }
        return b;
    },
    merge: function(path) {
        var tail = this.tail();
        var seg = path.segments;
        for (var i=0;i<seg.length;i++)
            this.add(seg[i]);
        var ins = path.waysIn;
        for (var i=0;i<ins.length;i++) {
            var way = ins[i];
            way.posTo += tail.pos - this.head.pos;
            way.pathTo = this;
            this.waysIn.push(way);
        }
        var outs = path.waysOut;
        for (var i=0;i<outs.length;i++) {
            var way = outs[i];
            way.pathFrom = this;
            way.posFrom += tail.pos - this.head.pos;
            this.waysOut.push(way);
        }
        this.isEnd = path.isEnd;
        if (path.mergesTo) {
            this.mergesTo = path.mergesTo;
            this.mergesTo.pathFrom = this;
        }
    },
    toJson: function() {
        return {
            id: this.id,
            waysIn: this.waysIn.map(toJson),
            waysOut: this.waysOut.map(toJson),
            segments: this.segments.map(toJson),
            head: this.head.id
        }
    },
    fromJson: function(json, rails) {
        var self = this;
        this.rails = rails;
        this.id = json.id;
        this.head = json.head;
        this.waysIn = json.waysIn.map(switchReader);
        this.waysOut = json.waysOut.map(switchReader);
        this.segments = json.segments.map(function(obj) { return new Segment().fromJson(obj, self); });
        return this;
    },
    fromJsonStep2: function(segments, paths) {
        this.head = segments[this.head];
        for (var i=0;i<this.waysIn.length;i++) {
            var way = this.waysIn[i];
            way.pathFrom = paths[way.pathFrom];
            way.railFrom = segments[way.railFrom];
            way.pathTo = paths[way.pathTo];
            way.railTo = segments[way.railTo];
        }
        for (var i=0;i<this.waysOut.length;i++) {
            var way = this.waysOut[i];
            way.pathFrom = paths[way.pathFrom];
            way.railFrom = segments[way.railFrom];
            way.pathTo = paths[way.pathTo];
            way.railTo = segments[way.railTo];
        }
    },
    saveBin: function(buffer) {
        var save = function(x){x.saveBin(buffer);};
        buffer.writeInt(this.id);
        buffer.writeInt(this.head.id);
        buffer.writeInt(this.segments.length);
        this.segments.forEach(save);
        buffer.writeInt(this.waysIn.length);
        this.waysIn.forEach(save);
        buffer.writeInt(this.waysOut.length);
        this.waysOut.forEach(save);
    },
    loadBin: function(buffer) {
        this.id = buffer.readInt();
        this.head = buffer.readInt();
        for (var i=buffer.readInt();i>0;i--) this.segments.push(new Segment().loadBin(buffer, this));
        for (var i=buffer.readInt();i>0;i--) this.waysIn.push(new Switch().loadBin(buffer, this));
        for (var i=buffer.readInt();i>0;i--) this.waysOut.push(new Switch().loadBin(buffer, this));
        return this;
    }
};

var toJson = function(obj) {return obj.toJson(); };
var switchReader = function(obj) { return new Switch().copy(obj) }

module.exports = Path;
